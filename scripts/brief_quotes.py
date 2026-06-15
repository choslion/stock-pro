#!/usr/bin/env python3
"""Compact watchlist market summary for the SS morning briefing.

Reads the shared watchlist (src/config/watchlist.json) and reuses stock-pro's
backend get_watchlist() function directly — no running server required.

Usage:
    python scripts/brief_quotes.py            # all tickers
    python scripts/brief_quotes.py --min 1.5  # only moves of at least |1.5%|
"""
import argparse
import json
import sys
from pathlib import Path

# Force UTF-8 output so Korean names render on Windows consoles (cp949 default).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.main import get_watchlist  # noqa: E402  (needs sys.path tweak first)

WATCHLIST_PATH = ROOT / "src" / "config" / "watchlist.json"


def load_watchlist():
    return json.loads(WATCHLIST_PATH.read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--min", type=float, default=0.0,
        help="only show tickers that moved at least this percent (absolute)",
    )
    args = ap.parse_args()

    entries = load_watchlist()
    kr = [e for e in entries if e["market"] == "KR"]
    us = [e for e in entries if e["market"] == "US"]

    try:
        result = get_watchlist(
            kr=",".join(e["ticker"] for e in kr),
            us=",".join(e["ticker"] for e in us),
            kr_names=",".join(e["name"] for e in kr),
        )
    except Exception as exc:  # network / scraping failures
        print(f"관심종목 시황을 불러오지 못했습니다: {exc}")
        sys.exit(1)

    name_by_ticker = {e["ticker"]: e["name"] for e in entries}

    rows = []
    for it in result.get("items", []):
        chg = it.get("change_rate", 0.0) or 0.0
        if abs(chg) < args.min:
            continue
        name = name_by_ticker.get(it["ticker"], it["ticker"])
        if it.get("market") == "US":
            price = f"${it.get('price_usd', 0):,.2f}"
        else:
            price = f"{it.get('price', 0):,}원"
        rows.append((chg, name, it["ticker"], price))

    if not rows:
        print("관심종목: 표시할 변동 없음")
        return

    rows.sort(key=lambda r: abs(r[0]), reverse=True)  # biggest movers first

    usd_krw = result.get("usd_krw")
    header = "[관심종목 시황]"
    if usd_krw:
        header += f"  (USD/KRW {usd_krw:,.0f})"
    print(header)
    for chg, name, ticker, price in rows:
        arrow = "▲" if chg > 0 else ("▼" if chg < 0 else "─")
        sign = "+" if chg > 0 else ""
        print(f"  {arrow} {name} ({ticker})  {price}  {sign}{chg:.2f}%")


if __name__ == "__main__":
    main()
