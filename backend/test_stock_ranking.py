import unittest
from unittest.mock import patch

import httpx

from backend import main


class StockRankingTests(unittest.TestCase):
    def test_domestic_ranking_merges_krx_markets_for_each_filter(self):
        def stock(ticker, volume, amount, change):
            return {
                "itemCode": ticker,
                "itemName": ticker,
                "krx": {
                    "currentPrice": "20000",
                    "tradingVolume": volume,
                    "tradingValue": amount,
                    "changeRate": change,
                },
            }

        requests = []

        def respond(request):
            requests.append(dict(request.url.params))
            if request.url.params.get("marketType") == "KONEX":
                items = [stock("140610", "20", "400000", "-4.00")]
            else:
                items = [
                    stock("005930", "300", "9000000", "1.25"),
                    stock("035420", "400", "8000000", "-0.50"),
                    stock("000660", "100", "3000000", "4.50"),
                    stock("000990", None, None, None),
                ]
            return httpx.Response(200, json={"items": items, "hasNext": False})

        client_class = httpx.Client

        def create_client(**kwargs):
            return client_class(transport=httpx.MockTransport(respond), **kwargs)

        cases = [
            ("amount", "tradingValueDesc", ["005930", "035420", "000660"]),
            ("volume", "tradingVolumeDesc", ["035420", "005930", "000660"]),
            ("rising", "changeRateDescUpAll", ["000660", "005930"]),
            ("falling", "changeRateDescDownAll", ["140610", "035420"]),
        ]
        with (
            patch.object(main.httpx, "Client", side_effect=create_client),
            patch.object(main, "_cache", {}),
        ):
            for ranking, listing_type, tickers in cases:
                with self.subTest(ranking=ranking):
                    requests.clear()
                    result = main.get_stock_ranking(ranking, "ALL", 3)
                    self.assertEqual([row["ticker"] for row in result["items"]], tickers)
                    self.assertEqual([row["rank"] for row in result["items"]], list(range(1, len(tickers) + 1)))
                    self.assertEqual({params.get("marketType") for params in requests}, {None, "KONEX"})
                    for params in requests:
                        self.assertEqual(params["listingType"], listing_type)
                        self.assertEqual(params["exchangeType"], "krx")
