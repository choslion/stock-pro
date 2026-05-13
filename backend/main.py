from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import httpx
import pandas as pd
import FinanceDataReader as fdr
from datetime import datetime
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




# ── 기존 엔드포인트 ────────────────────────────────────────────────

def _fgi_from_local() -> dict:
    """CNN API 불가 시 VIX + S&P500으로 시장 심리 지수 추정"""
    vix_val, _ = fetch_vix_latest()
    sp_hist = yf.Ticker("^GSPC").history(period="1y")
    if sp_hist.empty:
        raise HTTPException(503, "시장 데이터를 가져올 수 없습니다.")
    current = float(sp_hist["Close"].iloc[-1])
    ma200 = float(sp_hist["Close"].tail(200).mean())
    deviation = (current - ma200) / ma200 * 100

    vix_score = max(0.0, min(100.0, (40 - vix_val) / 30 * 100))
    sp_score = max(0.0, min(100.0, deviation / 15 * 50 + 50))
    score = round(0.4 * vix_score + 0.6 * sp_score, 1)

    if score <= 25:   rating = "extreme fear"
    elif score <= 45: rating = "fear"
    elif score <= 55: rating = "neutral"
    elif score <= 75: rating = "greed"
    else:             rating = "extreme greed"

    return {"score": score, "rating": rating, "timestamp": datetime.now().isoformat()}


def fetch_fgi() -> dict:
    """CNN FGI API 시도 → 실패 시 로컬 계산으로 fallback"""
    try:
        with httpx.Client(timeout=6) as client:
            resp = client.get(FGI_URL, headers=FGI_HEADERS)
            resp.raise_for_status()
        data = resp.json()
        if "fear_and_greed" in data:
            return data["fear_and_greed"]
        if "score" in data:
            return data
    except Exception:
        pass
    return _fgi_from_local()


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
def get_fgi():
    def _fetch():
        fgi = fetch_fgi()
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
    return _get_cached("fgi", _fetch)


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
def get_score():
    def _fetch():
        fgi = fetch_fgi()
        fgi_score = float(fgi["score"])
        vix_value, _ = fetch_vix_latest()
        vix_score = max(0.0, min(100.0, (40 - vix_value) / 30 * 100))
        return {"score": round(0.6 * fgi_score + 0.4 * vix_score, 1)}
    return _get_cached("score", _fetch)


# ── 국내 주식 신규 엔드포인트 ──────────────────────────────────────

def _get_listing(market: str) -> pd.DataFrame:
    mkt = {"ALL": "KRX", "KOSPI": "KOSPI", "KOSDAQ": "KOSDAQ"}.get(market, "KRX")
    df = fdr.StockListing(mkt)
    for col in ["Volume", "Amount", "ChgRatio", "Close", "Prev", "Open"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df[df["Volume"].fillna(0) > 0].copy()

    # ChgRatio가 없거나 모두 0이면 Prev 또는 Open 기반으로 계산
    has_chg = "ChgRatio" in df.columns and df["ChgRatio"].fillna(0).abs().sum() > 0
    if not has_chg:
        if "Prev" in df.columns and df["Prev"].fillna(0).sum() > 0:
            prev = df["Prev"].replace(0, float("nan"))
            df["ChgRatio"] = (df["Close"] - prev) / prev * 100
        elif "Open" in df.columns and df["Open"].fillna(0).sum() > 0:
            open_ = df["Open"].replace(0, float("nan"))
            df["ChgRatio"] = (df["Close"] - open_) / open_ * 100
        else:
            df["ChgRatio"] = 0.0

    df["ChgRatio"] = df["ChgRatio"].fillna(0.0)
    return df


@app.get("/stocks/ranking")
def get_stock_ranking(
    type: str = Query("amount"),   # amount | volume | rising | falling
    market: str = Query("ALL"),    # ALL | KOSPI | KOSDAQ
    limit: int = Query(10),
):
    def fetch():
        df = _get_listing(market)
        if df.empty:
            raise HTTPException(503, "주식 데이터를 가져올 수 없습니다.")

        if type == "volume":
            sorted_df = df.sort_values("Volume", ascending=False)
        elif type == "rising":
            sorted_df = df[df["ChgRatio"] > 0].sort_values("ChgRatio", ascending=False)
        elif type == "falling":
            sorted_df = df[df["ChgRatio"] < 0].sort_values("ChgRatio")
        else:
            sorted_df = df.sort_values("Amount", ascending=False)

        top = sorted_df.head(limit)
        if top.empty:
            return []

        result = []
        for rank, (_, row) in enumerate(top.iterrows(), 1):
            result.append({
                "rank": rank,
                "ticker": str(row.get("Symbol", row.get("Code", ""))),
                "name": str(row.get("Name", "")),
                "price": int(row["Close"]) if pd.notna(row.get("Close")) else 0,
                "change_rate": round(float(row["ChgRatio"]), 2) if pd.notna(row.get("ChgRatio")) else 0.0,
            })
        return result

    return _get_cached(f"ranking_{type}_{market}", fetch)


@app.get("/sectors")
def get_sectors(market: str = Query("KOSPI")):
    def fetch():
        df = _get_listing(market)
        if df.empty:
            raise HTTPException(503, "업종 데이터를 가져올 수 없습니다.")

        sector_col = next((c for c in ["Dept", "Sector", "Industry", "업종"] if c in df.columns), None)
        if not sector_col:
            raise HTTPException(503, "업종 정보가 없습니다.")

        df = df[df[sector_col].notna() & (df[sector_col] != "")].copy()

        agg = (
            df.groupby(sector_col)["ChgRatio"]
            .agg(
                change_rate="mean",
                total="count",
                rising=lambda x: int((x > 0).sum()),
            )
            .reset_index()
            .rename(columns={sector_col: "name"})
            .sort_values("change_rate", ascending=False)
        )

        return [
            {
                "name": row["name"],
                "change_rate": round(float(row["change_rate"]), 2) if pd.notna(row["change_rate"]) else 0.0,
                "total": int(row["total"]),
                "rising": int(row["rising"]),
            }
            for _, row in agg.iterrows()
        ]

    return _get_cached(f"sectors_{market}", fetch)
