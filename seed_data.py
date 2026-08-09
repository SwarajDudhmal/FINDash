import datetime
import random
from database import init_db, get_db_connection

def seed():
    init_db()
    conn = get_db_connection()
    
    # Force re-seed for INR currency update
    cur = conn.cursor()
    cur.execute("DELETE FROM stocks")
    cur.execute("DELETE FROM historical_prices")
    cur.execute("DELETE FROM economic_indicators")
    cur.execute("DELETE FROM portfolio")
    cur.execute("DELETE FROM market_news")
    conn.commit()

    # Seed Indian Blue-Chip Stocks & Indices (in INR ₹)
    stocks_data = [
        ("RELIANCE", "Reliance Industries Ltd.", "Energy & Retail", 2980.50, 42.10, 1.43, 8450000, "₹ 20.15L Cr", 28.4, 3217.90, 2220.30, 1),
        ("TCS", "Tata Consultancy Services", "Technology", 4150.00, 68.50, 1.68, 3120000, "₹ 15.01L Cr", 31.2, 4592.25, 3313.00, 1),
        ("INFY", "Infosys Limited", "Technology", 1820.40, -12.30, -0.67, 5410000, "₹ 7.56L Cr", 25.8, 1975.00, 1351.65, 1),
        ("HDFCBANK", "HDFC Bank Limited", "Banking & Finance", 1610.00, 18.20, 1.14, 14200000, "₹ 12.25L Cr", 19.5, 1794.00, 1363.55, 1),
        ("ICICIBANK", "ICICI Bank Limited", "Banking & Finance", 1240.00, 14.50, 1.18, 9800000, "₹ 8.72L Cr", 18.1, 1257.80, 933.00, 0),
        ("TATAMOTORS", "Tata Motors Limited", "Automotive", 1085.00, 24.80, 2.34, 11200000, "₹ 3.60L Cr", 15.4, 1179.05, 593.50, 1),
        ("BHARTIARTL", "Bharti Airtel Limited", "Telecom", 1480.00, 8.60, 0.58, 4100000, "₹ 8.85L Cr", 42.6, 1536.00, 847.00, 0),
        ("NIFTY50", "NIFTY 50 Index", "Index Fund", 24350.00, 185.00, 0.77, 45000000, "NSE India", 23.4, 25078.30, 19233.70, 1),
        ("SENSEX", "BSE SENSEX Index", "Index Fund", 79800.00, 520.00, 0.66, 32000000, "BSE India", 24.1, 82129.49, 63587.00, 0),
        ("BTC-INR", "Bitcoin (INR)", "Cryptocurrency", 5250000.00, 124000.00, 2.42, 1200000000, "₹ 103.5L Cr", 0.0, 6150000.00, 2210000.00, 1),
    ]

    conn.executemany(
        """INSERT INTO stocks 
           (symbol, name, sector, price, change_amount, change_pct, volume, market_cap, pe_ratio, high_52w, low_52w, is_watchlist)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        stocks_data
    )

    # Seed Historical Prices (90 days of synthetic OHLCV in INR)
    today = datetime.date.today()
    for symbol, name, sector, current_price, _, _, base_vol, _, _, _, _, _ in stocks_data:
        price = current_price * 0.85  # Start 90 days ago at ~85% of current price
        
        hist_rows = []
        for i in range(90, -1, -1):
            d = today - datetime.timedelta(days=i)
            # Skip weekends for stocks (except crypto)
            if symbol != "BTC-INR" and d.weekday() >= 5:
                continue
                
            date_str = d.strftime("%Y-%m-%d")
            daily_return = random.gauss(0.0018, 0.015)
            open_p = round(price, 2)
            close_p = round(price * (1 + daily_return), 2)
            high_p = round(max(open_p, close_p) * (1 + abs(random.gauss(0.003, 0.004))), 2)
            low_p = round(min(open_p, close_p) * (1 - abs(random.gauss(0.003, 0.004))), 2)
            vol = int(base_vol * random.uniform(0.7, 1.3))
            
            hist_rows.append((symbol, date_str, open_p, high_p, low_p, close_p, vol))
            price = close_p
        
        conn.executemany(
            """INSERT INTO historical_prices (symbol, date, open, high, low, close, volume)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            hist_rows
        )

    # Seed Indian Economic Indicators
    econ_data = [
        ("RBI Repo Rate", 6.50, "%", 0.00, "Bi-Monthly", "Benchmark policy rate set by Reserve Bank of India (RBI).", today.strftime("%Y-%m-%d")),
        ("India CPI Inflation (YoY)", 3.54, "%", -0.40, "Monthly", "Headline Consumer Price Index inflation rate in India.", today.strftime("%Y-%m-%d")),
        ("India Real GDP Growth", 6.70, "%", 0.40, "Quarterly", "Annualized quarterly expansion rate of Indian GDP.", today.strftime("%Y-%m-%d")),
        ("India Unemployment Rate", 5.10, "%", -0.20, "Monthly", "Periodic Labor Force Survey (PLFS) unemployment rate.", today.strftime("%Y-%m-%d")),
        ("India 10-Year G-Sec Yield", 6.86, "%", -0.04, "Daily", "Yield on benchmark 10-Year Government Securities.", today.strftime("%Y-%m-%d")),
        ("Indian Market Sentiment Score", 62.0, "Score", 4.0, "Daily", "Domestic retail & DII bullish market sentiment score.", today.strftime("%Y-%m-%d")),
    ]

    conn.executemany(
        """INSERT INTO economic_indicators (metric_name, value, unit, change_rate, frequency, description, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        econ_data
    )

    # Seed Portfolio Holdings (in INR ₹)
    portfolio_data = [
        ("RELIANCE", "Reliance Industries Ltd.", 50.0, 2850.00),
        ("TCS", "Tata Consultancy Services", 30.0, 3920.00),
        ("INFY", "Infosys Limited", 60.0, 1710.00),
        ("BTC-INR", "Bitcoin (INR)", 0.05, 4800000.00),
    ]

    conn.executemany(
        """INSERT INTO portfolio (symbol, company_name, shares, avg_buy_price)
           VALUES (?, ?, ?, ?)""",
        portfolio_data
    )

    # Seed Indian Financial News
    news_data = [
        ("RBI Monetary Policy Committee Keeps Repo Rate Unchanged at 6.5%", "Economic Times", "Governor Shaktikanta Das highlighted disinflation progress while maintaining a stance on withdrawal of accommodation.", "Bullish", "NIFTY50", "15 mins ago"),
        ("TCS Secures $1.5 Billion Multi-Year Digital Transformation Deal with European Telecom Major", "LiveMint", "The deal strengthens TCS's order book ahead of Q2 earnings, boosting sentiment across IT majors.", "Bullish", "TCS", "40 mins ago"),
        ("Reliance Retail Expands Quick Commerce Footprint across Tier 1 and Tier 2 Indian Cities", "Business Standard", "JioMart ramps up dark store infrastructure to deliver groceries in under 15 minutes.", "Bullish", "RELIANCE", "2 hours ago"),
        ("FII Inflows Cross ₹12,000 Crore in Indian Equities Driven by Strong Domestic Macro Metrics", "Financial Express", "Foreign Institutional Investors turned net buyers across banking and auto sectors.", "Bullish", "SENSEX", "4 hours ago"),
        ("Tata Motors Reports 12% YoY Surge in EV Domestic Sales for the Month", "CNBC-TV18", "Passenger vehicle electrification momentum remains strong with new Punch EV and Nexon EV variants.", "Bullish", "TATAMOTORS", "6 hours ago"),
    ]

    conn.executemany(
        """INSERT INTO market_news (headline, source, summary, sentiment, symbol, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)""",
        news_data
    )

    conn.commit()
    conn.close()
    print("Database successfully re-seeded with Indian financial data (INR)!")

if __name__ == "__main__":
    seed()
