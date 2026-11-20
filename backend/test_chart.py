import unittest
from unittest.mock import patch

import pandas as pd
from fastapi import HTTPException

from backend import main


class ChartTests(unittest.TestCase):
    def test_custom_end_is_inclusive_and_sampled_endpoints_are_preserved(self):
        days = pd.bdate_range("2020-01-02", "2025-01-02")
        history = pd.DataFrame({"Close": range(1, len(days) + 1)}, index=days)
        with patch.object(main.yf, "Ticker") as ticker, patch.object(main, "_cache", {}):
            get_history = ticker.return_value.history

            def get_prices(*, start, end, **kwargs):
                return history[(history.index >= start) & (history.index < end)]

            get_history.side_effect = get_prices
            for end, exclusive_end in [("2024-12-30", "2024-12-31"), ("2024-12-31", "2025-01-01")]:
                with self.subTest(end=end):
                    items = main.get_chart("^KS11", "US", "10y", "2020-01-02", end)["items"]
                    get_history.assert_called_with(start="2020-01-02", end=exclusive_end, auto_adjust=False, actions=False)
                    self.assertEqual(items[0]["time"], "2020-01-02")
                    self.assertEqual(items[-1]["time"], end)
                    self.assertLess(len(items), 800)
            self.assertEqual(get_history.call_count, 2)

    def test_rejects_end_before_start(self):
        with self.assertRaises(HTTPException) as error:
            main.get_chart("^KS11", "US", "10y", "2024-01-02", "2024-01-01")
        self.assertEqual(error.exception.status_code, 400)
