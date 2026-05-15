from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    """캐시 히트/미스 관계없이 데이터가 처음 수집된 시각(fetched_at)을 함께 반환한다."""
    now = time.time()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < _CACHE_TTL:
        data = entry["data"]
        ts   = entry["ts"]
    else:
        data = fetch_fn()
        ts   = now
        _cache[key] = {"data": data, "ts": ts}

    fetched_at = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%dT%H:%M:%SZ")

    # dict/list 모두 처리
    if isinstance(data, dict):
        return {**data, "fetched_at": fetched_at}
    if isinstance(data, list):
        return {"items": data, "fetched_at": fetched_at}
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


@app.get("/kr-score")
def get_kr_score():
    """KOSPI 실현변동성 + 추세 + 업종폭으로 국내 시장 심리 점수(0~100) 계산"""
    def fetch():
        # 1. KOSPI 3개월 히스토리
        hist = yf.Ticker("^KS11").history(period="3mo")
        if hist.empty:
            raise HTTPException(503, "KOSPI 데이터를 가져올 수 없습니다.")

        current = float(hist["Close"].iloc[-1])

        # 실현변동성 (20일 연환산) — VKOSPI 근사값으로 사용
        daily_ret = hist["Close"].pct_change().dropna()
        realized_vol = float(daily_ret.tail(20).std()) * (252 ** 0.5) * 100
        vol_score = max(0.0, min(100.0, (35 - realized_vol) / 25 * 100))

        # 추세 점수 (현재 vs 20일 이동평균)
        ma20 = float(hist["Close"].tail(20).mean())
        deviation = (current - ma20) / ma20 * 100
        momentum_score = max(0.0, min(100.0, deviation / 5 * 50 + 50))

        # 업종폭 점수 (KOSPI 상승 종목 비율)
        try:
            df = _get_listing("KOSPI")
            rising = int((df["ChgRatio"] > 0).sum())
            breadth_score = rising / len(df) * 100 if not df.empty else 50.0
        except Exception:
            breadth_score = 50.0

        score = round(0.40 * vol_score + 0.35 * momentum_score + 0.25 * breadth_score, 1)

        if score <= 20:   rating = "극단적 공포"
        elif score <= 40: rating = "공포"
        elif score <= 60: rating = "중립"
        elif score <= 80: rating = "탐욕"
        else:             rating = "극단적 탐욕"

        return {
            "score": score,
            "rating": rating,
            "realized_vol": round(realized_vol, 2),
            "momentum_pct": round(deviation, 2),
            "breadth_pct": round(breadth_score, 1),
        }
    return _get_cached("kr_score", fetch)


@app.get("/commodities")
def get_commodities():
    def fetch():
        ITEMS = [
            ("CL=F",  "WTI 원유",  "$/배럴"),
            ("GC=F",  "금",        "$/온스"),
            ("SI=F",  "은",        "$/온스"),
            ("HG=F",  "구리",      "$/파운드"),
            ("NG=F",  "천연가스",  "$/MMBtu"),
        ]
        result = []
        for ticker, name, unit in ITEMS:
            try:
                hist = yf.Ticker(ticker).history(period="5d")
                if hist.empty or len(hist) < 2:
                    continue
                current = float(hist["Close"].iloc[-1])
                prev    = float(hist["Close"].iloc[-2])
                change  = current - prev
                result.append({
                    "name":       name,
                    "ticker":     ticker,
                    "unit":       unit,
                    "value":      round(current, 2),
                    "change":     round(change, 2),
                    "change_pct": round(change / prev * 100, 2),
                })
            except Exception:
                pass
        return result
    return _get_cached("commodities", fetch)


@app.get("/forex")
def get_forex():
    def fetch():
        PAIRS = [
            ("USDKRW=X", "달러",      "USD/KRW", 1),
            ("EURKRW=X", "유로",      "EUR/KRW", 1),
            ("JPYKRW=X", "엔 (100엔)", "JPY/KRW", 100),
            ("CNYKRW=X", "위안",      "CNY/KRW", 1),
        ]
        result = []
        for ticker, label, pair, mul in PAIRS:
            try:
                hist = yf.Ticker(ticker).history(period="5d")
                if hist.empty or len(hist) < 2:
                    continue
                current = float(hist["Close"].iloc[-1]) * mul
                prev    = float(hist["Close"].iloc[-2]) * mul
                change  = current - prev
                result.append({
                    "pair":       pair,
                    "label":      label,
                    "value":      round(current, 2),
                    "change":     round(change, 2),
                    "change_pct": round(change / prev * 100, 2),
                })
            except Exception:
                pass
        return result
    return _get_cached("forex", fetch)


@app.get("/us-sectors")
def get_us_sectors():
    def fetch():
        SECTORS = [
            ("XLK",  "정보기술"),
            ("XLF",  "금융"),
            ("XLV",  "헬스케어"),
            ("XLY",  "임의소비재"),
            ("XLC",  "커뮤니케이션"),
            ("XLI",  "산업재"),
            ("XLP",  "필수소비재"),
            ("XLE",  "에너지"),
            ("XLB",  "소재"),
            ("XLRE", "부동산"),
            ("XLU",  "유틸리티"),
        ]
        result = []
        for ticker, name in SECTORS:
            try:
                hist = yf.Ticker(ticker).history(period="5d")
                if hist.empty or len(hist) < 2:
                    continue
                current = float(hist["Close"].iloc[-1])
                prev    = float(hist["Close"].iloc[-2])
                change_rate = round((current - prev) / prev * 100, 2)
                result.append({"name": name, "ticker": ticker, "change_rate": change_rate})
            except Exception:
                pass
        return sorted(result, key=lambda x: x["change_rate"], reverse=True)
    return _get_cached("us_sectors", fetch)


@app.get("/us-indices")
def get_us_indices():
    def fetch():
        result = {}
        for key, ticker, label in [
            ("sp500",  "^GSPC", "S&P 500"),
            ("nasdaq", "^IXIC", "NASDAQ"),
            ("dow",    "^DJI",  "DOW"),
        ]:
            try:
                hist = yf.Ticker(ticker).history(period="5d")
                if hist.empty:
                    result[key] = None
                    continue
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = current - prev
                result[key] = {
                    "label": label,
                    "value": round(current, 2),
                    "change": round(change, 2),
                    "change_pct": round(change / prev * 100, 2),
                    "date": hist.index[-1].strftime("%Y-%m-%d"),
                }
            except Exception:
                result[key] = None
        return result
    return _get_cached("us_indices", fetch)


@app.get("/kospi")
def get_kospi():
    def fetch():
        result = {}
        for key, ticker in [("kospi", "^KS11"), ("kosdaq", "^KQ11")]:
            try:
                hist = yf.Ticker(ticker).history(period="5d")
                if hist.empty:
                    result[key] = None
                    continue
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = current - prev
                result[key] = {
                    "value": round(current, 2),
                    "change": round(change, 2),
                    "change_pct": round(change / prev * 100, 2),
                    "date": hist.index[-1].strftime("%Y-%m-%d"),
                }
            except Exception:
                result[key] = None
        return result
    return _get_cached("kospi", fetch)


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

    # 실제 컬럼명 ChagesRatio (오타)를 ChgRatio로 통일
    if "ChagesRatio" in df.columns:
        df = df.rename(columns={"ChagesRatio": "ChgRatio"})

    for col in ["Volume", "Amount", "ChgRatio", "Close", "Marcap", "Open"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df[df["Volume"].fillna(0) > 0].copy()
    df["ChgRatio"] = df["ChgRatio"].fillna(0.0) if "ChgRatio" in df.columns else 0.0
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
        import requests as _req
        from bs4 import BeautifulSoup as _BS

        url = "https://finance.naver.com/sise/sise_group.naver?type=upjong"
        res = _req.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = _BS(res.content, "html.parser", from_encoding="euc-kr")
        rows = soup.select("table.type_1 tr")

        result = []
        for row in rows:
            tds = row.find_all("td")
            if len(tds) < 4:
                continue
            name = tds[0].get_text(strip=True)
            chg_str = tds[1].get_text(strip=True).replace("%", "").replace("+", "")
            try:
                change_rate = float(chg_str)
            except ValueError:
                continue
            try:
                total  = int(tds[2].get_text(strip=True))
                rising = int(tds[3].get_text(strip=True))
            except ValueError:
                total, rising = 0, 0

            if name:
                result.append({
                    "name": name,
                    "change_rate": round(change_rate, 2),
                    "total": total,
                    "rising": rising,
                })

        if not result:
            raise HTTPException(503, "업종 데이터를 가져올 수 없습니다.")

        return sorted(result, key=lambda x: x["change_rate"], reverse=True)

    return _get_cached(f"sectors_{market}", fetch)



@app.get("/investor-trends")
def get_investor_trends(market: str = Query("KOSPI")):
    def fetch():
        df = _get_listing(market)
        if df.empty:
            raise HTTPException(503, "데이터를 가져올 수 없습니다.")

        for col in ["ForeignRatio", "Amount"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        def to_rows(sorted_df, extra_key=None, extra_col=None):
            rows = []
            for i, (_, row) in enumerate(sorted_df.head(10).iterrows(), 1):
                item = {
                    "rank": i,
                    "ticker": str(row.get("Symbol", row.get("Code", ""))),
                    "name": str(row.get("Name", "")),
                    "price": int(row["Close"]) if pd.notna(row.get("Close")) else 0,
                    "change_rate": round(float(row["ChgRatio"]), 2) if pd.notna(row.get("ChgRatio")) else 0.0,
                }
                if extra_key and extra_col and extra_col in row.index:
                    item[extra_key] = round(float(row[extra_col]), 2)
                rows.append(item)
            return rows

        result = {
            "marcap": to_rows(
                df.sort_values("Marcap", ascending=False) if "Marcap" in df.columns else df,
                "marcap", "Marcap"
            ),
            "hot": to_rows(
                df.sort_values("Amount", ascending=False) if "Amount" in df.columns else df,
                "amount", "Amount"
            ),
        }
        return result

    return _get_cached(f"investor_trends_{market}", fetch)


# ── 해외 주식 ──────────────────────────────────────────────────────

US_STOCKS = {
    "AAPL": "애플", "MSFT": "마이크로소프트", "NVDA": "엔비디아",
    "AMZN": "아마존", "GOOGL": "알파벳", "META": "메타",
    "TSLA": "테슬라", "JPM": "JP모건", "V": "비자",
    "UNH": "유나이티드헬스", "AVGO": "브로드컴", "LLY": "일라이릴리",
    "XOM": "엑슨모빌", "MA": "마스터카드", "HD": "홈디포",
    "PG": "P&G", "JNJ": "존슨앤존슨", "COST": "코스트코",
    "MRK": "머크", "ORCL": "오라클",
}


def _get_usd_krw() -> float:
    hist = yf.Ticker("USDKRW=X").history(period="1d")
    if hist.empty:
        return 1380.0
    return round(float(hist["Close"].iloc[-1]), 2)


@app.get("/debug/etf-columns")
def debug_etf_columns():
    df = fdr.StockListing("ETF/KR")
    return {
        "columns": list(df.columns),
        "shape": list(df.shape),
        "sample": df.head(3).fillna("").to_dict(orient="records"),
    }


@app.get("/etf")
def get_etf(type: str = Query("amount"), limit: int = Query(20)):
    def fetch():
        df = fdr.StockListing("ETF/KR")
        if df.empty:
            raise HTTPException(503, "ETF 데이터를 가져올 수 없습니다.")

        # ETF/KR 실제 컬럼: Price, ChangeRate (Close/ChagesRatio 아님)
        price_col = next((c for c in ["Price", "Close"] if c in df.columns), None)
        rate_col  = next((c for c in ["ChangeRate", "ChagesRatio", "ChgRatio"] if c in df.columns), None)

        for col in ["Volume", "Amount", price_col, rate_col]:
            if col and col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        if "Volume" in df.columns:
            df = df[df["Volume"].fillna(0) > 0].copy()

        chg = df[rate_col].fillna(0.0) if rate_col else pd.Series(0.0, index=df.index)

        if type == "volume" and "Volume" in df.columns:
            sorted_df = df.sort_values("Volume", ascending=False)
        elif type == "rising":
            sorted_df = df[chg > 0].sort_values(rate_col or "Volume", ascending=False)
        elif type == "falling":
            sorted_df = df[chg < 0].sort_values(rate_col or "Volume", ascending=True)
        else:
            sort_col = "Amount" if "Amount" in df.columns else "Volume"
            sorted_df = df.sort_values(sort_col, ascending=False)

        top = sorted_df.head(limit)
        if top.empty:
            return []

        result = []
        for rank, (_, row) in enumerate(top.iterrows(), 1):
            price_val  = row.get(price_col) if price_col else None
            rate_val   = row.get(rate_col)  if rate_col  else None
            vol_val    = row.get("Volume")
            amt_val    = row.get("Amount")
            result.append({
                "rank": rank,
                "ticker": str(row.get("Symbol", row.get("Code", ""))),
                "name": str(row.get("Name", "")),
                "price": int(price_val) if price_val is not None and pd.notna(price_val) else 0,
                "change_rate": round(float(rate_val), 2) if rate_val is not None and pd.notna(rate_val) else 0.0,
                "volume": int(vol_val) if vol_val is not None and pd.notna(vol_val) else 0,
                "amount": int(amt_val) if amt_val is not None and pd.notna(amt_val) else 0,
            })
        return result

    return _get_cached(f"etf_{type}", fetch)


@app.get("/watchlist")
def get_watchlist(kr: str = Query(""), us: str = Query(""), kr_names: str = Query("")):
    kr_tickers = [t.strip() for t in kr.split(",") if t.strip()] if kr else []
    kr_names_list = [n.strip() for n in kr_names.split(",") if n.strip()] if kr_names else []
    us_tickers = [t.strip() for t in us.split(",") if t.strip()] if us else []

    cache_key = f"watchlist_{kr}_{us}"

    def _find_by_name(df, name_hint):
        """ETF 이름으로 부분 일치 검색 (Name 또는 Symbol 컬럼)"""
        if df.empty or not name_hint:
            return pd.DataFrame()
        name_col = next((c for c in ["Name", "Symbol", "종목명"] if c in df.columns), None)
        if not name_col:
            return pd.DataFrame()
        hint = name_hint.replace(" ", "").lower()
        mask = df[name_col].astype(str).str.replace(" ", "").str.lower().str.contains(hint[:10], regex=False)
        return df[mask]

    def fetch():
        items = []

        if kr_tickers:
            def _normalize_df(d):
                """KRX/ETF 리스팅을 price_col=Close, rate_col=ChgRatio로 통일"""
                # 가격 컬럼 통일: ETF/KR은 'Price', KRX는 'Close'
                if "Price" in d.columns and "Close" not in d.columns:
                    d = d.rename(columns={"Price": "Close"})
                # 등락률 컬럼 통일
                for src in ["ChangeRate", "ChagesRatio"]:
                    if src in d.columns and "ChgRatio" not in d.columns:
                        d = d.rename(columns={src: "ChgRatio"})
                for col in ["Close", "ChgRatio"]:
                    if col in d.columns:
                        d[col] = pd.to_numeric(d[col], errors="coerce")
                return d

            krx_df = _normalize_df(fdr.StockListing("KRX"))
            etf_df = None  # lazy-load only if needed
            krx_code_col = "Code" if "Code" in krx_df.columns else "Symbol"

            for i, ticker in enumerate(kr_tickers):
                name_hint = kr_names_list[i] if i < len(kr_names_list) else None
                row = krx_df[krx_df[krx_code_col] == ticker]

                if row.empty:
                    # fallback 1: ETF/KR listing by code
                    if etf_df is None:
                        try:
                            etf_df = _normalize_df(fdr.StockListing("ETF/KR"))
                        except Exception:
                            etf_df = pd.DataFrame()
                    etf_code_col = "Code" if "Code" in etf_df.columns else ("Symbol" if "Symbol" in etf_df.columns else None)
                    if etf_code_col and not etf_df.empty:
                        row = etf_df[etf_df[etf_code_col] == ticker]

                if row.empty and name_hint:
                    # fallback 2: ETF/KR listing by name (for HTS-only internal codes)
                    if etf_df is None:
                        try:
                            etf_df = _normalize_df(fdr.StockListing("ETF/KR"))
                        except Exception:
                            etf_df = pd.DataFrame()
                    row = _find_by_name(etf_df, name_hint)
                    if row.empty:
                        row = _find_by_name(krx_df, name_hint)

                if not row.empty:
                    r = row.iloc[0]
                    items.append({
                        "ticker": ticker,
                        "market": "KR",
                        "price": int(r["Close"]) if pd.notna(r.get("Close")) else 0,
                        "change_rate": round(float(r["ChgRatio"]), 2) if pd.notna(r.get("ChgRatio")) else 0.0,
                    })
                else:
                    items.append({"ticker": ticker, "market": "KR", "price": 0, "change_rate": 0.0})

        usd_krw = None
        if us_tickers:
            usd_krw = _get_usd_krw()
            dl_arg = us_tickers if len(us_tickers) > 1 else us_tickers[0]
            raw = yf.download(dl_arg, period="2d", auto_adjust=True, progress=False)

            for ticker in us_tickers:
                try:
                    c = (raw["Close"] if len(us_tickers) == 1 else raw["Close"][ticker]).dropna()
                    if len(c) < 1:
                        raise ValueError("no data")
                    price_usd = float(c.iloc[-1])
                    chg = round((price_usd - float(c.iloc[-2])) / float(c.iloc[-2]) * 100, 2) if len(c) >= 2 else 0.0
                    items.append({
                        "ticker": ticker,
                        "market": "US",
                        "price_usd": round(price_usd, 2),
                        "price_krw": int(round(price_usd * usd_krw)),
                        "change_rate": chg,
                    })
                except Exception:
                    items.append({
                        "ticker": ticker, "market": "US",
                        "price_usd": 0.0, "price_krw": 0, "change_rate": 0.0,
                    })

        return {"usd_krw": usd_krw, "items": items}

    return _get_cached(cache_key, fetch)


@app.get("/theme-ranking")
def get_theme_ranking(tickers: str = Query(...), limit: int = Query(10)):
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"usd_krw": None, "stocks": []}

    cache_key = f"theme_ranking_{','.join(sorted(ticker_list))}_{limit}"

    def norm_list(values):
        mn, mx = min(values), max(values)
        if mx == mn:
            return [0.5] * len(values)
        return [(v - mn) / (mx - mn) for v in values]

    def fetch():
        # 1. Bulk OHLCV — 1년치
        dl_arg = ticker_list if len(ticker_list) > 1 else ticker_list[0]
        raw = yf.download(dl_arg, period="1y", auto_adjust=True, progress=False)
        if raw.empty:
            raise HTTPException(503, "데이터를 가져올 수 없습니다.")

        close = raw["Close"] if len(ticker_list) > 1 else raw["Close"].to_frame(name=ticker_list[0])
        volume = raw["Volume"] if len(ticker_list) > 1 else raw["Volume"].to_frame(name=ticker_list[0])

        # 2. 펀더멘털 — 동시 요청
        def _get_ticker_data(ticker):
            try:
                t = yf.Ticker(ticker)
                info = t.info
                rd_ratio = None
                try:
                    fin = t.financials
                    if fin is not None and not fin.empty:
                        rd_key = next((k for k in fin.index if "Research" in str(k)), None)
                        if rd_key:
                            rd_val = fin.loc[rd_key].iloc[0]
                            rev = float(info.get("totalRevenue", 0) or 0)
                            if pd.notna(rd_val) and rev > 0:
                                rd_ratio = abs(float(rd_val)) / rev
                except Exception:
                    pass
                return ticker, info, rd_ratio
            except Exception:
                return ticker, {}, None

        info_map = {}
        rd_map = {}
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {ex.submit(_get_ticker_data, t): t for t in ticker_list}
            for fut in as_completed(futs):
                ticker, info, rd = fut.result()
                info_map[ticker] = info
                rd_map[ticker] = rd

        # 3. 지표 계산
        rows = []
        for ticker in ticker_list:
            try:
                c = close[ticker].dropna()
                v = volume[ticker].dropna()
                if len(c) < 20:
                    continue

                price = float(c.iloc[-1])
                chg = round((price - float(c.iloc[-2])) / float(c.iloc[-2]) * 100, 2)

                daily_ret = c.pct_change().dropna()
                volatility = float(daily_ret.std()) * (252 ** 0.5) * 100  # 연환산 %

                avg_vol = float(v.tail(20).mean())

                info = info_map.get(ticker, {})
                market_cap = float(info.get("marketCap", 0) or 0)
                rev_growth = float(info.get("revenueGrowth", 0) or 0) * 100  # %

                rows.append({
                    "ticker": ticker,
                    "price_usd": round(price, 2),
                    "change_rate": chg,
                    "_market_cap": market_cap,
                    "_rev_growth": max(rev_growth, -50.0),  # -50% 하한
                    "_avg_volume": avg_vol,
                    "_volatility": volatility,
                    "_rd_ratio": (rd_map.get(ticker) or 0) * 100,
                    "revenue_growth_pct": round(rev_growth, 1),
                    "volatility_pct": round(volatility, 1),
                    "rd_ratio_pct": round(rd_map.get(ticker, 0) * 100, 1) if rd_map.get(ticker) else None,
                })
            except Exception:
                continue

        if not rows:
            raise HTTPException(503, "스코어링 데이터를 가져올 수 없습니다.")

        # 4. 정규화 & 스코어
        has_rd = any(r["_rd_ratio"] > 0 for r in rows)
        nc = norm_list([r["_market_cap"] for r in rows])
        ng = norm_list([r["_rev_growth"] for r in rows])
        nv = norm_list([r["_avg_volume"] for r in rows])
        nvt = norm_list([r["_volatility"] for r in rows])
        nrd = norm_list([r["_rd_ratio"] for r in rows]) if has_rd else [0.0] * len(rows)

        if has_rd:
            w = (0.30, 0.25, 0.20, 0.15, 0.10)
        else:
            w = (0.35, 0.30, 0.22, 0.13, 0.0)

        for i, r in enumerate(rows):
            r["score"] = round(
                w[0] * nc[i] + w[1] * ng[i] + w[2] * nv[i] + w[3] * nvt[i] + w[4] * nrd[i], 4
            )
            for k in ("_market_cap", "_rev_growth", "_avg_volume", "_volatility", "_rd_ratio"):
                r.pop(k, None)

        rows.sort(key=lambda x: x["score"], reverse=True)
        top = rows[:limit]

        usd_krw = _get_usd_krw()
        for i, r in enumerate(top, 1):
            r["rank"] = i
            r["price_krw"] = int(round(r["price_usd"] * usd_krw))

        return {"usd_krw": usd_krw, "stocks": top}

    # 펀더멘털 캐시는 1시간
    now = time.time()
    entry = _cache.get(cache_key)
    if entry and now - entry["ts"] < 3600:
        return entry["data"]
    data = fetch()
    _cache[cache_key] = {"data": data, "ts": now}
    return data


@app.get("/stocks/us-ranking")
def get_us_ranking(type: str = Query("amount"), limit: int = Query(10)):
    def fetch():
        tickers = list(US_STOCKS.keys())
        raw = yf.download(tickers, period="2d", auto_adjust=True, progress=False)
        if raw.empty:
            raise HTTPException(503, "해외 주식 데이터를 가져올 수 없습니다.")

        usd_krw = _get_usd_krw()
        close = raw["Close"]
        volume = raw["Volume"]

        rows = []
        for ticker in tickers:
            try:
                c = close[ticker].dropna()
                v = volume[ticker].dropna()
                if len(c) < 1:
                    continue
                price_usd = float(c.iloc[-1])
                vol = float(v.iloc[-1]) if len(v) >= 1 else 0.0
                chg = round((price_usd - float(c.iloc[-2])) / float(c.iloc[-2]) * 100, 2) if len(c) >= 2 else 0.0
                rows.append({
                    "ticker": ticker,
                    "name": US_STOCKS[ticker],
                    "price_usd": round(float(price_usd), 2),
                    "price_krw": int(round(float(price_usd) * float(usd_krw))),
                    "change_rate": chg,
                    "volume": int(vol),
                    "amount": round(float(price_usd) * float(vol)),
                })
            except Exception:
                continue

        if not rows:
            raise HTTPException(503, "해외 주식 데이터를 가져올 수 없습니다.")

        df = pd.DataFrame(rows)
        if type == "volume":
            df = df.sort_values("volume", ascending=False)
        elif type == "rising":
            df = df[df["change_rate"] > 0].sort_values("change_rate", ascending=False)
        elif type == "falling":
            df = df[df["change_rate"] < 0].sort_values("change_rate")
        else:
            df = df.sort_values("amount", ascending=False)

        top = df.head(limit)
        return {
            "usd_krw": usd_krw,
            "stocks": [{"rank": i + 1, **r} for i, r in enumerate(top.to_dict(orient="records"))],
        }

    return _get_cached(f"us_ranking_{type}", fetch)
