import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "findash.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize sqlite database schema."""
    conn = get_db_connection()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()

def get_all_stocks() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM stocks ORDER BY market_cap DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_stock_by_symbol(symbol: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM stocks WHERE symbol = ?", (symbol.upper(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_historical_prices(symbol: str, timeframe: str = "1M") -> List[Dict[str, Any]]:
    conn = get_db_connection()
    limit_map = {"1D": 24, "1W": 7, "1M": 30, "1Y": 365, "ALL": 1000}
    limit = limit_map.get(timeframe.upper(), 30)
    
    rows = conn.execute(
        """SELECT * FROM historical_prices 
           WHERE symbol = ? 
           ORDER BY date ASC 
           LIMIT ?""", 
        (symbol.upper(), limit)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def calculate_technical_indicators(prices: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates SMA 20, SMA 50, and 14-period RSI."""
    closes = [p["close"] for p in prices]
    if not closes:
        return {"sma20": [], "sma50": [], "rsi": []}

    sma20 = []
    for i in range(len(closes)):
        if i < 19:
            sma20.append(None)
        else:
            sma20.append(round(sum(closes[i-19:i+1]) / 20, 2))

    sma50 = []
    for i in range(len(closes)):
        if i < 49:
            sma50.append(None)
        else:
            sma50.append(round(sum(closes[i-49:i+1]) / 50, 2))

    # RSI 14
    rsi = []
    gains = []
    losses = []
    for i in range(1, len(closes)):
        change = closes[i] - closes[i-1]
        gains.append(max(change, 0))
        losses.append(max(-change, 0))

    if len(closes) < 15:
        rsi = [50.0] * len(closes)
    else:
        rsi = [None] * 14
        avg_gain = sum(gains[:14]) / 14
        avg_loss = sum(losses[:14]) / 14
        
        for i in range(14, len(closes)):
            if i > 14:
                change = closes[i] - closes[i-1]
                gain = max(change, 0)
                loss = max(-change, 0)
                avg_gain = (avg_gain * 13 + gain) / 14
                avg_loss = (avg_loss * 13 + loss) / 14

            if avg_loss == 0:
                rsi_val = 100.0
            else:
                rs = avg_gain / avg_loss
                rsi_val = 100 - (100 / (1 + rs))
            rsi.append(round(rsi_val, 2))

    return {
        "sma20": sma20,
        "sma50": sma50,
        "rsi": rsi
    }

def toggle_watchlist(symbol: str) -> bool:
    conn = get_db_connection()
    stock = conn.execute("SELECT is_watchlist FROM stocks WHERE symbol = ?", (symbol.upper(),)).fetchone()
    if not stock:
        conn.close()
        return False
    new_state = 0 if stock["is_watchlist"] == 1 else 1
    conn.execute("UPDATE stocks SET is_watchlist = ? WHERE symbol = ?", (new_state, symbol.upper()))
    conn.commit()
    conn.close()
    return bool(new_state)

def get_economic_indicators() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM economic_indicators ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_portfolio_summary() -> Dict[str, Any]:
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT p.*, s.price as current_price 
           FROM portfolio p 
           JOIN stocks s ON p.symbol = s.symbol"""
    ).fetchall()
    conn.close()

    holdings = []
    total_value = 0.0
    total_cost = 0.0

    for r in rows:
        item = dict(r)
        market_val = round(item["shares"] * item["current_price"], 2)
        cost_basis = round(item["shares"] * item["avg_buy_price"], 2)
        unrealized_pl = round(market_val - cost_basis, 2)
        unrealized_pl_pct = round((unrealized_pl / cost_basis) * 100, 2) if cost_basis > 0 else 0.0
        
        item["market_value"] = market_val
        item["cost_basis"] = cost_basis
        item["unrealized_pl"] = unrealized_pl
        item["unrealized_pl_pct"] = unrealized_pl_pct
        
        holdings.append(item)
        total_value += market_val
        total_cost += cost_basis

    total_pl = round(total_value - total_cost, 2)
    total_pl_pct = round((total_pl / total_cost) * 100, 2) if total_cost > 0 else 0.0

    return {
        "holdings": holdings,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pl": total_pl,
        "total_pl_pct": total_pl_pct,
        "cash_balance": 500000.00
    }

def update_portfolio(symbol: str, shares: float, price: float, action: str) -> Dict[str, Any]:
    conn = get_db_connection()
    stock = conn.execute("SELECT name FROM stocks WHERE symbol = ?", (symbol.upper(),)).fetchone()
    if not stock:
        conn.close()
        return {"success": False, "error": "Stock symbol not found"}

    holding = conn.execute("SELECT * FROM portfolio WHERE symbol = ?", (symbol.upper(),)).fetchone()
    
    if action == "BUY":
        if holding:
            cur_shares = holding["shares"]
            cur_cost = holding["avg_buy_price"] * cur_shares
            new_shares = cur_shares + shares
            new_avg = (cur_cost + (shares * price)) / new_shares
            conn.execute("UPDATE portfolio SET shares = ?, avg_buy_price = ? WHERE symbol = ?",
                         (new_shares, new_avg, symbol.upper()))
        else:
            conn.execute("INSERT INTO portfolio (symbol, company_name, shares, avg_buy_price) VALUES (?, ?, ?, ?)",
                         (symbol.upper(), stock["name"], shares, price))
    elif action == "SELL":
        if not holding or holding["shares"] < shares:
            conn.close()
            return {"success": False, "error": "Insufficient shares to sell"}
        new_shares = holding["shares"] - shares
        if new_shares <= 0:
            conn.execute("DELETE FROM portfolio WHERE symbol = ?", (symbol.upper(),))
        else:
            conn.execute("UPDATE portfolio SET shares = ? WHERE symbol = ?", (new_shares, symbol.upper()))
            
    conn.commit()
    conn.close()
    return {"success": True}

def get_market_news() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM market_news ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_simulated_stock_prices():
    """Random walk update to simulate real-time live stock fluctuations."""
    import random
    conn = get_db_connection()
    stocks = conn.execute("SELECT symbol, price, change_amount, change_pct FROM stocks").fetchall()
    
    for s in stocks:
        sym = s["symbol"]
        cur_price = s["price"]
        pct_change = random.uniform(-0.008, 0.009)
        new_price = max(1.0, round(cur_price * (1 + pct_change), 2))
        diff = round(new_price - cur_price, 2)
        new_change_amt = round(s["change_amount"] + diff, 2)
        new_change_pct = round((new_change_amt / (new_price - new_change_amt)) * 100, 2)
        
        conn.execute(
            "UPDATE stocks SET price = ?, change_amount = ?, change_pct = ? WHERE symbol = ?",
            (new_price, new_change_amt, new_change_pct, sym)
        )
    conn.commit()
    conn.close()
