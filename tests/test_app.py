import unittest
import json
import os
import sys

# Add root project dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import database as db
import seed_data
from app import app

class TestFinancialDashboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_data.seed()
        cls.client = app.test_client()

    def test_database_stocks(self):
        stocks = db.get_all_stocks()
        self.assertGreater(len(stocks), 0)
        symbols = [s["symbol"] for s in stocks]
        self.assertIn("RELIANCE", symbols)
        self.assertIn("TCS", symbols)
        self.assertIn("INFY", symbols)

    def test_technical_indicators(self):
        history = db.get_historical_prices("RELIANCE", "1M")
        self.assertGreater(len(history), 0)
        indicators = db.calculate_technical_indicators(history)
        self.assertIn("sma20", indicators)
        self.assertIn("sma50", indicators)
        self.assertIn("rsi", indicators)
        self.assertEqual(len(indicators["rsi"]), len(history))

    def test_api_stocks_endpoint(self):
        response = self.client.get("/api/stocks")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("stocks", data)
        self.assertIn("gainers", data)
        self.assertIn("watchlist", data)

    def test_api_stock_detail_endpoint(self):
        response = self.client.get("/api/stock/RELIANCE?timeframe=1M")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["stock"]["symbol"], "RELIANCE")
        self.assertIn("history", data)
        self.assertIn("indicators", data)

    def test_api_economic_indicators(self):
        response = self.client.get("/api/economic-indicators")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertGreater(len(data["indicators"]), 0)

    def test_api_portfolio(self):
        response = self.client.get("/api/portfolio")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("holdings", data)
        self.assertIn("total_value", data)

    def test_api_trade_execution(self):
        payload = {"action": "BUY", "symbol": "TCS", "shares": 5}
        response = self.client.post(
            "/api/portfolio/trade",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("Successfully executed", data["message"])

if __name__ == "__main__":
    unittest.main()
