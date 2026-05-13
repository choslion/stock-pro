from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import httpx
import pandas as pd
from pykrx import stock as krx
from datetime import datetime, timedelta
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

FGI_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
FGI_HEADERS = {"User-Agent": "Mozilla/5.0"}

# 간단한 인메모리 캐시 (pykrx는 KRX 사이트 스크래핑이라 느림)
_cache: dict = {}
_CACHE_TTL = 300  # 5분


def _get_cached(key: str, fetch_fn):
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    data = fetch_fn()
    _cache[key] = {"data": data, "ts": now}
    return data


def _latest_trading_date(market: str = "KOSPI") -> str:
    """최근 거래일 조회 (주말·공휴일 건너뜀)"""
    today = datetime.now()
    for i in range(10):
        d = (today - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = krx.get_market_ohlcv_by_ticker(d, market=market)
            if not df.empty:
                return d
        except Exception:
            pass
    raise HTTPException(503, "최근 거래일을 찾을 수 없습니다.")


# ── 기존 엔드포인트 ────────────────────────────────────────────────

async def fetch_fgi() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(FGI_URL, headers=FGI_HEADERS)
        resp.raise_for_status()
    return resp.json()["fear_and_greed"]


def fetch_vix_latest() -> tuple[float, str]:
    hist = yf.Ticker("^VIX").history(period="5d")
    if hist.empty:
        raise HTTPException(status_code=503, detail="VIX 데이터를 가져올 수 없습니다.")
    row = hist.iloc[-1]
    return float(row["Close"]), row.name.strftime("%Y-%m-%d")


@app.get("/vix")
def get_vix():
    value, date = fetch_vix_latest()
    return {"date": date, "value": round(value, 2)}


@app.get("/vix/range")
def get_vix_range(
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    hist = yf.Ticker("^VIX").history(start=start_date, end=end_date)
    if hist.empty:
        raise HTTPException(status_code=404, detail="해당 기간의 VIX 데이터가 없습니다.")
    return [
        {"date": idx.strftime("%Y-%m-%d"), "value": round(float(row["Close"]), 2)}
        for idx, row in hist.iterrows()
    ]


@app.get("/fgi")
async def get_fgi():
    fgi = await fetch_fgi()
    ts = fgi.get("timestamp", "")
    try:
        last_update = (
            datetime.fromtimestamp(ts / 1000).isoformat()
            if isinstance(ts, (int, float))
            else ts
        )
    except Exception:
        last_update = datetime.now().isoformat()

    return {
        "value": round(float(fgi["score"]), 2),
        "description": fgi.get("rating", "").lower(),
        "last_update": last_update,
    }


@app.get("/sp500")
def get_sp500():
    hist = yf.Ticker("^GSPC").history(period="1y")
    if hist.empty:
        raise HTTPException(status_code=503, detail="S&P 500 데이터를 가져올 수 없습니다.")
    current = float(hist["Close"].iloc[-1])
    ma200 = float(hist["Close"].tail(200).mean())
    deviation = (current - ma200) / ma200 * 100
    return {
        "date": hist.index[-1].strftime("%Y-%m-%d"),
        "current_value": round(current, 2),
        "ma200": round(ma200, 2),
        "deviation_percent": round(deviation, 2),
    }


@app.get("/score")
async def get_score():
    fgi = await fetch_fgi()
    fgi_score = float(fgi["score"])
    vix_value, _ = fetch_vix_latest()
    vix_score = max(0.0, min(100.0, (40 - vix_value) / 30 * 100))
    score = 0.6 * fgi_score + 0.4 * vix_score
    return {"score": round(score, 1)}


# ── 국내 주식 신규 엔드포인트 ──────────────────────────────────────

@app.get("/stocks/ranking")
def get_stock_ranking(
    type: str = Query("amount"),   # amount | volume | rising | falling
    market: str = Query("ALL"),    # ALL | KOSPI | KOSDAQ
    limit: int = Query(10),
):
    def fetch():
        date = _latest_trading_date("KOSPI")
        markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]

        frames = [krx.get_market_ohlcv_by_ticker(date, market=m) for m in markets]
        combined = pd.concat([f for f in frames if not f.empty])
        if combined.empty:
            raise HTTPException(503, "주식 데이터를 가져올 수 없습니다.")

        if type == "volume":
            sorted_df = combined.sort_values("거래량", ascending=False)
        elif type == "rising":
            sorted_df = combined[combined["등락률"] > 0].sort_values("등락률", ascending=False)
        elif type == "falling":
            sorted_df = combined[combined["등락률"] < 0].sort_values("등락률")
        else:
            sorted_df = combined.sort_values("거래대금", ascending=False)

        result = []
        for rank, (ticker, row) in enumerate(sorted_df.head(limit).iterrows(), 1):
            try:
                name = krx.get_market_ticker_name(str(ticker))
            except Exception:
                name = str(ticker)
            result.append({
                "rank": rank,
                "ticker": str(ticker),
                "name": name,
                "price": int(row["종가"]),
                "change_rate": round(float(row["등락률"]), 2),
            })
        return result

    return _get_cached(f"ranking_{type}_{market}", fetch)


@app.get("/sectors")
def get_sectors(market: str = Query("KOSPI")):
    def fetch():
        date = _latest_trading_date(market)

        sector_df = krx.get_market_sector_classifications(date, market=market)
        ohlcv_df = krx.get_market_ohlcv_by_ticker(date, market=market)

        if sector_df.empty or ohlcv_df.empty:
            raise HTTPException(503, "업종 데이터를 가져올 수 없습니다.")

        merged = sector_df[["업종명"]].join(ohlcv_df[["등락률"]], how="inner")

        agg = (
            merged.groupby("업종명")["등락률"]
            .agg(
                change_rate="mean",
                total="count",
                rising=lambda x: int((x > 0).sum()),
            )
            .reset_index()
            .sort_values("change_rate", ascending=False)
        )

        return [
            {
                "name": row["업종명"],
                "change_rate": round(float(row["change_rate"]), 2),
                "total": int(row["total"]),
                "rising": int(row["rising"]),
            }
            for _, row in agg.iterrows()
        ]

    return _get_cached(f"sectors_{market}", fetch)
