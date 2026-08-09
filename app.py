import os
from flask import Flask, render_template, jsonify, request
import database as db
import seed_data

app = Flask(__name__, static_folder="static", template_folder="templates")

# Initialize and seed database if not initialized
if not os.path.exists(db.DB_PATH):
    seed_data.seed()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/stocks", methods=["GET"])
def get_stocks():
    db.update_simulated_stock_prices()
    stocks = db.get_all_stocks()
    
    # Calculate market summary indicators
    gainers = sorted(stocks, key=lambda x: x["change_pct"], reverse=True)[:3]
    losers = sorted(stocks, key=lambda x: x["change_pct"])[:3]
    watchlist = [s for s in stocks if s["is_watchlist"] == 1]
    
    return jsonify({
        "stocks": stocks,
        "gainers": gainers,
        "losers": losers,
        "watchlist": watchlist
    })

@app.route("/api/stock/<symbol>", methods=["GET"])
def get_stock_detail(symbol):
    stock = db.get_stock_by_symbol(symbol)
    if not stock:
        return jsonify({"error": "Stock symbol not found"}), 404
        
    timeframe = request.args.get("timeframe", "1M")
    history = db.get_historical_prices(symbol, timeframe)
    indicators = db.calculate_technical_indicators(history)
    
    return jsonify({
        "stock": stock,
        "history": history,
        "indicators": indicators
    })

@app.route("/api/stock/<symbol>/watchlist", methods=["POST"])
def toggle_stock_watchlist(symbol):
    status = db.toggle_watchlist(symbol)
    return jsonify({"symbol": symbol.upper(), "is_watchlist": status})

@app.route("/api/economic-indicators", methods=["GET"])
def get_economic_indicators():
    indicators = db.get_economic_indicators()
    return jsonify({"indicators": indicators})

@app.route("/api/portfolio", methods=["GET"])
def get_portfolio():
    db.update_simulated_stock_prices()
    summary = db.get_portfolio_summary()
    return jsonify(summary)

@app.route("/api/portfolio/trade", methods=["POST"])
def execute_trade():
    data = request.json or {}
    symbol = data.get("symbol")
    shares = float(data.get("shares", 0))
    action = data.get("action", "BUY").upper()
    
    if not symbol or shares <= 0 or action not in ["BUY", "SELL"]:
        return jsonify({"error": "Invalid trade parameters"}), 400
        
    stock = db.get_stock_by_symbol(symbol)
    if not stock:
        return jsonify({"error": "Stock symbol not found"}), 404
        
    result = db.update_portfolio(symbol, shares, stock["price"], action)
    if not result.get("success"):
        return jsonify({"error": result.get("error")}), 400
        
    return jsonify({"message": f"Successfully executed {action} for {shares} shares of {symbol}"})

@app.route("/api/news", methods=["GET"])
def get_news():
    news = db.get_market_news()
    return jsonify({"news": news})

@app.route("/api/screener", methods=["GET"])
def stock_screener():
    sector = request.args.get("sector", "")
    query = request.args.get("query", "").lower()
    min_price = float(request.args.get("min_price", 0))
    max_price = float(request.args.get("max_price", 1000000))
    
    stocks = db.get_all_stocks()
    filtered = []
    
    for s in stocks:
        if sector and s["sector"].lower() != sector.lower():
            continue
        if query and (query not in s["symbol"].lower() and query not in s["name"].lower()):
            continue
        if s["price"] < min_price or s["price"] > max_price:
            continue
        filtered.append(s)
        
    return jsonify({"results": filtered, "total": len(filtered)})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
