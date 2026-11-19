import unittest
from unittest.mock import patch

import httpx
import pandas as pd

from backend import main


class ThemeDataTests(unittest.TestCase):
    def test_korean_ranking_sorts_across_cursor_pages_and_shares_cache(self):
        def stock(ticker, change):
            return {
                "itemCode": ticker,
                "itemName": ticker,
                "krx": {"currentPrice": "20000", "changeRate": change},
            }

        requests = []

        def respond(request):
            requests.append(dict(request.url.params))
            if request.url.params.get("cursor") == "next":
                return httpx.Response(200, json={
                    "items": [stock("000660", "5.12"), stock("000990", "-1.0")],
                    "hasNext": False,
                })
            return httpx.Response(200, json={
                "items": [stock("005930", "2.30")],
                "hasNext": True,
                "cursor": "next",
            })

        client = httpx.Client(transport=httpx.MockTransport(respond))
        with patch.object(main.httpx, "Client", return_value=client), patch.object(main, "_cache", {}):
            top = main.get_kr_theme_stocks("155", 1)
            all_items = main.get_kr_theme_stocks("155", 10)

        self.assertEqual(requests, [{}, {"cursor": "next"}])
        self.assertEqual(top["items"][0], {
            "rank": 1, "ticker": "000660", "name": "000660", "price": 20000, "change_rate": 5.12,
        })
        self.assertEqual([row["ticker"] for row in all_items["items"]], ["000660", "005930", "000990"])

    def test_korean_ranking_waits_for_rates_before_open(self):
        rate = None
        client_class = httpx.Client

        def respond(request):
            return httpx.Response(200, json={
                "items": [{
                    "itemCode": "035420", "itemName": "NAVER",
                    "krx": {"currentPrice": "170300", "changeRate": rate},
                }],
                "hasNext": False,
            })

        def create_client(**kwargs):
            return client_class(transport=httpx.MockTransport(respond), **kwargs)

        with (
            patch.object(main.httpx, "Client", side_effect=create_client),
            patch.object(main, "_cache", {}),
        ):
            before_open = main.get_kr_theme_stocks("529", 10)
            main._cache.clear()
            rate = "0.00"
            after_open = main.get_kr_theme_stocks("529", 10)

        self.assertEqual(before_open["items"], [])
        self.assertEqual(after_open["items"], [{
            "rank": 1, "ticker": "035420", "name": "NAVER", "price": 170300, "change_rate": 0.0,
        }])

    def test_us_quotes_return_before_fundamentals_and_are_reused_for_final_ranking(self):
        prices = pd.DataFrame({
            ("Close", "AAA"): [10.0, 11.0, 12.0] * 8,
            ("Close", "BBB"): [20.0, 21.0, 22.0] * 8,
            ("Close", "USDKRW=X"): [1400.0] * 24,
            ("Volume", "AAA"): [500] * 24,
            ("Volume", "BBB"): [100] * 24,
        })
        snapshots = [
            ({}, True),
            ({"AAA": (100, 0, None), "BBB": (1000, 10, 5)}, False),
        ]
        with (
            patch.object(main, "_cache", {}),
            patch.object(main.yf, "download", return_value=prices) as download,
            patch.object(main, "_get_theme_fundamentals", side_effect=snapshots),
        ):
            initial = main.get_theme_ranking("AAA,BBB", 2)
            updated = main.get_theme_ranking("AAA,BBB", 1)

        download.assert_called_once()
        self.assertTrue(initial["fundamentals_pending"])
        self.assertEqual(initial["ranking_basis"], "market")
        self.assertEqual(initial["stocks"][0]["ticker"], "AAA")
        self.assertEqual(initial["stocks"][0]["price_krw"], 16800)
        self.assertFalse(updated["fundamentals_pending"])
        self.assertEqual(updated["ranking_basis"], "combined")
        self.assertEqual(updated["stocks"][0]["ticker"], "BBB")
        self.assertEqual(updated["fetched_at"], initial["fetched_at"])
