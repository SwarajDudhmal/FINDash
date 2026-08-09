# FinDash - Real-Time Financial Dashboard Platform

A financial dashboard platform aimed at monitoring real-time stock prices, technical market trends, economic indicators, and portfolio intelligence.

## 🚀 Key Features

1. **Live Stock Ticker & Market Overview**:
   - Real-time scrolling ticker ribbon with live price updates and market indices (S&P 500, Nasdaq, Bitcoin, Fear & Greed Index).
   - Highlighting top gainers, top losers, and market movers.

2. **Interactive Charting Studio**:
   - Stock price chart with interactive timeframe toggles (`1D`, `1W`, `1M`, `1Y`, `ALL`).
   - Technical overlays: **Simple Moving Averages** (SMA 20 & SMA 50).
   - Technical indicator sub-chart: **Relative Strength Index (RSI 14)** with Overbought/Oversold thresholds.

3. **Macroeconomic Indicators Hub**:
   - Real-time tracking of Federal Reserve Interest Rates, CPI Inflation YoY, US Real GDP Growth, Unemployment Rate, 10-Year Treasury Yield, and Market Sentiment Score.

4. **Stock Screener & Watchlist**:
   - Filter assets by ticker search, company name, sector (Technology, Semiconductors, Crypto, etc.), and price ranges.
   - Dynamic Watchlist star toggles saved to relational SQL database.

5. **Portfolio Performance & Trade Simulator**:
   - Total Portfolio Valuation, Cost Basis tracking, and Realized/Unrealized P&L calculations.
   - Asset Allocation donut chart visualization.
   - Interactive Quick Trade execution modal for buying and selling shares.

6. **Market News & AI Insights Feed**:
   - Real-time financial headlines categorized with Bullish, Bearish, or Neutral sentiment tags.

---

## 🛠️ Technology Stack

- **Backend**: Python, Flask REST API framework, SQLite Relational Database (`sqlite3`).
- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Dark Mode Design System), Vanilla JavaScript (ES6+).
- **Visualization**: Chart.js for canvas rendering.

---

## ⚡ Quick Start

### 1. Installation
Install Python dependencies:
```bash
pip install -r requirements.txt
```

### 2. Database Setup & Seeding
The database (`findash.db`) initializes and seeds automatically upon launching `app.py`. To re-seed manually:
```bash
python seed_data.py
```

### 3. Run Application Server
Start the Flask server:
```bash
python app.py
```
Open your browser and navigate to: [http://127.0.0.1:5000](http://127.0.0.1:5000)
