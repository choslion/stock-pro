from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import httpx
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

FGI_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
FGI_HEADERS = {"User-Agent": "Mozilla/5.0"}


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
        # CNN API는 ISO 문자열 또는 ms 타임스탬프를 반환
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
    # FGI (0~100)
    fgi = await fetch_fgi()
    fgi_score = float(fgi["score"])

    # VIX → 0~100 점수로 변환 (낮을수록 안정 → 점수 높음)
    vix_value, _ = fetch_vix_latest()
    vix_score = max(0.0, min(100.0, (40 - vix_value) / 30 * 100))

    # 종합 점수: FGI 60% + VIX 40%
    score = 0.6 * fgi_score + 0.4 * vix_score
    return {"score": round(score, 1)}
