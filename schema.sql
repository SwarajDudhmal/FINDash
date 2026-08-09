-- Financial Dashboard Platform SQL Schema

CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    price REAL NOT NULL,
    change_amount REAL NOT NULL,
    change_pct REAL NOT NULL,
    volume INTEGER NOT NULL,
    market_cap TEXT NOT NULL,
    pe_ratio REAL NOT NULL,
    high_52w REAL NOT NULL,
    low_52w REAL NOT NULL,
    is_watchlist INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historical_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume INTEGER NOT NULL,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol)
);

CREATE TABLE IF NOT EXISTS economic_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL UNIQUE,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    change_rate REAL NOT NULL,
    frequency TEXT NOT NULL,
    description TEXT NOT NULL,
    last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    shares REAL NOT NULL,
    avg_buy_price REAL NOT NULL,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol)
);

CREATE TABLE IF NOT EXISTS market_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL,
    source TEXT NOT NULL,
    summary TEXT NOT NULL,
    sentiment TEXT NOT NULL, -- Bullish, Bearish, Neutral
    symbol TEXT,
    timestamp TEXT NOT NULL
);
