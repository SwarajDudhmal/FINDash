/**
 * FinDash Client-Side Financial Intelligence & Charting Controller (Indian Rupee INR ₹ Edition)
 */

// Global State
let state = {
    stocks: [],
    gainers: [],
    losers: [],
    watchlist: [],
    economic: [],
    portfolio: null,
    news: [],
    currentSymbol: "RELIANCE",
    currentTimeframe: "1M",
    showSMA20: true,
    showSMA50: true,
    activeTab: "overviewTab"
};

// Helper: Format values in Indian Rupee format (en-IN)
function formatINR(val, digits = 2) {
    if (val === undefined || val === null || isNaN(val)) return "₹0.00";
    return "₹" + Number(val).toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

// Chart Instances
let overviewChartInstance = null;
let studioMainChartInstance = null;
let studioRsiChartInstance = null;
let allocationChartInstance = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initGlobalSearch();
    initStudioControls();
    initScreenerControls();
    initTradeModal();

    // Fetch initial datasets
    fetchAllData();

    // Real-time dynamic auto-polling interval (every 6 seconds)
    setInterval(pollStockPrices, 6000);
});

// ----------------------------------------------------
// Navigation & Tab Switching
// ----------------------------------------------------
function initNavigation() {
    const navBtns = document.querySelectorAll(".nav-btn");
    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            switchTab(targetTab);
        });
    });

    document.getElementById("refreshBtn").addEventListener("click", () => {
        showToast("Refreshing live NSE/BSE market data...", "success");
        fetchAllData();
    });

    document.getElementById("btnGainers").addEventListener("click", (e) => {
        document.getElementById("btnGainers").classList.add("active");
        document.getElementById("btnLosers").classList.remove("active");
        renderMoversList(state.gainers);
    });

    document.getElementById("btnLosers").addEventListener("click", (e) => {
        document.getElementById("btnLosers").classList.add("active");
        document.getElementById("btnGainers").classList.remove("active");
        renderMoversList(state.losers);
    });
}

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.toggle("active", tab.id === tabId);
    });

    if (tabId === "chartStudioTab") {
        loadStudioChartData(state.currentSymbol, state.currentTimeframe);
    } else if (tabId === "portfolioTab") {
        loadPortfolioData();
    } else if (tabId === "screenerTab") {
        renderScreenerTable(state.stocks);
    } else if (tabId === "economicTab") {
        loadEconomicData();
    } else if (tabId === "newsTab") {
        loadNewsData();
    }
}

// ----------------------------------------------------
// Data Fetching API Calls
// ----------------------------------------------------
async function fetchAllData() {
    await pollStockPrices();
    await loadStockDetail(state.currentSymbol, "1M");
    await loadEconomicData();
    await loadPortfolioData();
    await loadNewsData();
}

async function pollStockPrices() {
    try {
        const res = await fetch("/api/stocks");
        const data = await res.json();
        state.stocks = data.stocks || [];
        state.gainers = data.gainers || [];
        state.losers = data.losers || [];
        state.watchlist = data.watchlist || [];

        renderTickerRibbon(state.stocks);
        renderIndicesBar(state.stocks);
        renderMoversList(state.gainers);
        renderWatchlistCompact(state.watchlist);

        if (state.activeTab === "screenerTab") {
            renderScreenerTable(state.stocks);
        }

        // Update trade modal select options
        populateTradeModalOptions(state.stocks);
    } catch (err) {
        console.error("Error fetching stocks:", err);
    }
}

async function loadStockDetail(symbol, timeframe = "1M") {
    try {
        const res = await fetch(`/api/stock/${symbol}?timeframe=${timeframe}`);
        const data = await res.json();
        if (data.error) return;

        state.currentSymbol = symbol;
        state.currentTimeframe = timeframe;

        // Render overview hero stock chart
        renderOverviewHero(data.stock, data.history);
        
        // Render studio detailed charts if active
        if (state.activeTab === "chartStudioTab") {
            renderStudioCharts(data.stock, data.history, data.indicators);
        }
    } catch (err) {
        console.error("Error loading stock detail:", err);
    }
}

async function loadStudioChartData(symbol, timeframe) {
    document.getElementById("symbolSelect").value = symbol;
    await loadStockDetail(symbol, timeframe);
}

async function loadEconomicData() {
    try {
        const res = await fetch("/api/economic-indicators");
        const data = await res.json();
        state.economic = data.indicators || [];
        renderEconomicGrid(state.economic);
    } catch (err) {
        console.error("Error loading economic data:", err);
    }
}

async function loadPortfolioData() {
    try {
        const res = await fetch("/api/portfolio");
        const data = await res.json();
        state.portfolio = data;

        document.getElementById("portfolioTotalValue").textContent = formatINR(data.total_value);
        document.getElementById("portfolioCostBasis").textContent = formatINR(data.total_cost);
        
        const plElem = document.getElementById("portfolioTotalPL");
        const plSign = data.total_pl >= 0 ? "+" : "";
        plElem.textContent = `${plSign}${formatINR(data.total_pl)} (${plSign}${data.total_pl_pct}%)`;
        plElem.className = `p-subvalue ${data.total_pl >= 0 ? 'gain' : 'loss'}`;

        document.getElementById("portfolioCash").textContent = formatINR(data.cash_balance);

        renderPortfolioTable(data.holdings);
        renderPortfolioDonut(data.holdings);
    } catch (err) {
        console.error("Error loading portfolio:", err);
    }
}

async function loadNewsData() {
    try {
        const res = await fetch("/api/news");
        const data = await res.json();
        state.news = data.news || [];
        renderNewsGrid(state.news);
    } catch (err) {
        console.error("Error loading news:", err);
    }
}

// ----------------------------------------------------
// UI Renderers & Chart.js Visualizations
// ----------------------------------------------------

function renderTickerRibbon(stocks) {
    const ribbon = document.getElementById("tickerRibbon");
    if (!ribbon) return;
    
    // Duplicate stock items for continuous smooth marquee scrolling
    const items = [...stocks, ...stocks];
    ribbon.innerHTML = items.map(s => `
        <div class="ticker-item" onclick="selectStock('${s.symbol}')" style="cursor:pointer">
            <span class="ticker-symbol">${s.symbol}</span>
            <span class="ticker-price">${formatINR(s.price)}</span>
            <span class="ticker-change ${s.change_pct >= 0 ? 'gain' : 'loss'}">
                ${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%
            </span>
        </div>
    `).join("");
}

function renderIndicesBar(stocks) {
    const indicesGrid = document.getElementById("indicesGrid");
    if (!indicesGrid) return;

    const indices = stocks.filter(s => ["NIFTY50", "SENSEX", "RELIANCE", "BTC-INR"].includes(s.symbol));
    indicesGrid.innerHTML = indices.map(s => `
        <div class="glass-card index-card" onclick="selectStock('${s.symbol}')" style="cursor:pointer">
            <div class="index-info">
                <div class="name">${s.name}</div>
                <div class="val">${formatINR(s.price)}</div>
            </div>
            <div class="index-change ${s.change_pct >= 0 ? 'gain' : 'loss'}">
                ${s.change_pct >= 0 ? '▲' : '▼'} ${s.change_pct.toFixed(2)}%
            </div>
        </div>
    `).join("");
}

function renderMoversList(movers) {
    const container = document.getElementById("moversList");
    if (!container) return;

    container.innerHTML = movers.map(s => `
        <div class="mover-row" onclick="selectStock('${s.symbol}')">
            <div>
                <div class="symbol-col">${s.symbol}</div>
                <div class="sub-col">${s.name}</div>
            </div>
            <div style="text-align:right">
                <div style="font-family:var(--font-mono); font-weight:600">${formatINR(s.price)}</div>
                <div class="badge ${s.change_pct >= 0 ? 'gain' : 'loss'}">
                    ${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%
                </div>
            </div>
        </div>
    `).join("");
}

function renderWatchlistCompact(watchlist) {
    const container = document.getElementById("watchlistCompact");
    if (!container) return;

    if (watchlist.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem">No tickers in watchlist.</div>`;
        return;
    }

    container.innerHTML = watchlist.map(s => `
        <div class="watchlist-row" onclick="selectStock('${s.symbol}')">
            <div>
                <span class="symbol-col">${s.symbol}</span>
                <span class="sub-col"> (${s.sector})</span>
            </div>
            <div style="text-align:right">
                <span style="font-family:var(--font-mono); font-weight:600">${formatINR(s.price)}</span>
                <span class="${s.change_pct >= 0 ? 'gain' : 'loss'}" style="font-size:0.8rem; margin-left:6px">
                    ${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%
                </span>
            </div>
        </div>
    `).join("");
}

function renderOverviewHero(stock, history) {
    document.getElementById("overviewStockSymbol").textContent = stock.symbol;
    document.getElementById("overviewStockName").textContent = stock.name;
    document.getElementById("overviewStockSector").textContent = stock.sector;
    document.getElementById("overviewPrice").textContent = formatINR(stock.price);
    
    const changeElem = document.getElementById("overviewChange");
    const isGain = stock.change_amount >= 0;
    changeElem.textContent = `${isGain ? '+' : ''}${formatINR(stock.change_amount)} (${isGain ? '+' : ''}${stock.change_pct.toFixed(2)}%)`;
    changeElem.className = `price-change ${isGain ? 'gain' : 'loss'}`;

    const ctx = document.getElementById("overviewChartCanvas").getContext("2d");
    const labels = history.map(h => h.date);
    const prices = history.map(h => h.close);

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, isGain ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)');
    gradient.addColorStop(1, 'rgba(17, 24, 39, 0.0)');

    if (overviewChartInstance) {
        overviewChartInstance.destroy();
    }

    overviewChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Close Price (₹)',
                data: prices,
                borderColor: isGain ? '#10b981' : '#ef4444',
                borderWidth: 2.5,
                fill: true,
                backgroundColor: gradient,
                tension: 0.25,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1f293d',
                    titleColor: '#f3f4f6',
                    bodyColor: '#10b981',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b7280', maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#6b7280' }
                }
            }
        }
    });
}

function renderStudioCharts(stock, history, indicators) {
    document.getElementById("studioSymbol").textContent = stock.symbol;
    document.getElementById("studioPrice").textContent = formatINR(stock.price);
    
    const studioChange = document.getElementById("studioChange");
    const isGain = stock.change_amount >= 0;
    studioChange.textContent = `${isGain ? '+' : ''}${formatINR(stock.change_amount)} (${isGain ? '+' : ''}${stock.change_pct.toFixed(2)}%)`;
    studioChange.className = `badge ${isGain ? 'gain' : 'loss'}`;

    // Render Stats
    document.getElementById("studioStatsSummary").innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-secondary)">
            <span>52W High: <strong style="color:var(--text-primary); font-family:var(--font-mono)">${formatINR(stock.high_52w)}</strong></span> &bull; 
            <span>52W Low: <strong style="color:var(--text-primary); font-family:var(--font-mono)">${formatINR(stock.low_52w)}</strong></span> &bull; 
            <span>P/E: <strong style="color:var(--text-primary); font-family:var(--font-mono)">${stock.pe_ratio}</strong></span> &bull; 
            <span>Cap: <strong style="color:var(--text-primary); font-family:var(--font-mono)">${stock.market_cap}</strong></span>
        </div>
    `;

    const labels = history.map(h => h.date);
    const closes = history.map(h => h.close);

    // Main Studio Chart
    const ctxMain = document.getElementById("studioMainChart").getContext("2d");
    if (studioMainChartInstance) studioMainChartInstance.destroy();

    const datasets = [{
        label: `${stock.symbol} Price (₹)`,
        data: closes,
        borderColor: isGain ? '#10b981' : '#ef4444',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0
    }];

    if (state.showSMA20 && indicators.sma20) {
        datasets.push({
            label: 'SMA (20)',
            data: indicators.sma20,
            borderColor: '#3b82f6',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0
        });
    }

    if (state.showSMA50 && indicators.sma50) {
        datasets.push({
            label: 'SMA (50)',
            data: indicators.sma50,
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0
        });
    }

    studioMainChartInstance = new Chart(ctxMain, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#9ca3af', font: { size: 11 } } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: '#111827' }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280', maxTicksLimit: 10 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280' } }
            }
        }
    });

    // RSI Subchart
    const ctxRsi = document.getElementById("studioRsiChart").getContext("2d");
    if (studioRsiChartInstance) studioRsiChartInstance.destroy();

    const latestRsi = indicators.rsi[indicators.rsi.length - 1] || 50;
    const rsiReadingElem = document.getElementById("rsiReading");
    let statusText = "Neutral";
    if (latestRsi >= 70) statusText = "Overbought (Bearish Risk)";
    else if (latestRsi <= 30) statusText = "Oversold (Bullish Opportunity)";
    rsiReadingElem.textContent = `RSI: ${latestRsi} (${statusText})`;

    studioRsiChartInstance = new Chart(ctxRsi, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'RSI (14)',
                data: indicators.rsi,
                borderColor: '#06b6d4',
                borderWidth: 1.5,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280', maxTicksLimit: 10 } },
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280', stepSize: 30 } }
            }
        }
    });
}

function renderEconomicGrid(indicators) {
    const container = document.getElementById("econGrid");
    if (!container) return;

    container.innerHTML = indicators.map(ind => `
        <div class="glass-card econ-card">
            <div>
                <div style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase">${ind.frequency} &bull; ${ind.last_updated}</div>
                <h3 style="margin-top:4px">${ind.metric_name}</h3>
                <div class="econ-val">${ind.value} ${ind.unit}</div>
                <div class="badge ${ind.change_rate >= 0 ? 'gain' : 'loss'}" style="display:inline-block">
                    Change: ${ind.change_rate >= 0 ? '+' : ''}${ind.change_rate} ${ind.unit}
                </div>
                <p class="econ-desc">${ind.description}</p>
            </div>
        </div>
    `).join("");
}

function renderScreenerTable(stocks) {
    const tbody = document.getElementById("screenerTbody");
    const count = document.getElementById("screenerCount");
    if (!tbody) return;

    count.textContent = stocks.length;

    tbody.innerHTML = stocks.map(s => `
        <tr>
            <td>
                <button class="star-btn ${s.is_watchlist ? 'starred' : ''}" onclick="toggleWatchlist('${s.symbol}', event)">★</button>
            </td>
            <td><strong style="font-family:var(--font-mono); font-size:0.95rem">${s.symbol}</strong></td>
            <td>${s.name}</td>
            <td><span class="badge sector-badge">${s.sector}</span></td>
            <td style="font-family:var(--font-mono); font-weight:600">${formatINR(s.price)}</td>
            <td><span class="badge ${s.change_pct >= 0 ? 'gain' : 'loss'}">${s.change_pct >= 0 ? '+' : ''}${s.change_pct.toFixed(2)}%</span></td>
            <td style="font-family:var(--font-mono)">${(s.volume / 100000).toFixed(1)}L</td>
            <td style="font-family:var(--font-mono)">${s.market_cap}</td>
            <td style="font-family:var(--font-mono)">${s.pe_ratio > 0 ? s.pe_ratio : 'N/A'}</td>
            <td style="font-size:0.8rem; color:var(--text-secondary)">${formatINR(s.low_52w)} - ${formatINR(s.high_52w)}</td>
            <td>
                <button class="btn-primary btn-sm" onclick="openTradeModal('BUY', '${s.symbol}')">Trade</button>
            </td>
        </tr>
    `).join("");
}

function renderPortfolioTable(holdings) {
    const tbody = document.getElementById("portfolioTbody");
    if (!tbody) return;

    if (!holdings || holdings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">No portfolio holdings found. Use Quick Trade to buy shares.</td></tr>`;
        return;
    }

    tbody.innerHTML = holdings.map(h => `
        <tr>
            <td>
                <strong style="font-family:var(--font-mono)">${h.symbol}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted)">${h.company_name}</div>
            </td>
            <td style="font-family:var(--font-mono)">${h.shares}</td>
            <td style="font-family:var(--font-mono)">${formatINR(h.avg_buy_price)}</td>
            <td style="font-family:var(--font-mono)">${formatINR(h.current_price)}</td>
            <td style="font-family:var(--font-mono); font-weight:600">${formatINR(h.market_value)}</td>
            <td>
                <span class="badge ${h.unrealized_pl >= 0 ? 'gain' : 'loss'}">
                    ${h.unrealized_pl >= 0 ? '+' : ''}${formatINR(h.unrealized_pl)} (${h.unrealized_pl_pct}%)
                </span>
            </td>
            <td>
                <button class="btn-primary btn-sm" onclick="openTradeModal('BUY', '${h.symbol}')">Buy</button>
                <button class="btn-secondary btn-sm" onclick="openTradeModal('SELL', '${h.symbol}')">Sell</button>
            </td>
        </tr>
    `).join("");
}

function renderPortfolioDonut(holdings) {
    const ctx = document.getElementById("assetAllocationChart").getContext("2d");
    if (allocationChartInstance) allocationChartInstance.destroy();

    if (!holdings || holdings.length === 0) return;

    const labels = holdings.map(h => h.symbol);
    const data = holdings.map(h => h.market_value);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

    allocationChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#111827',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 } } }
            }
        }
    });
}

function renderNewsGrid(news) {
    const container = document.getElementById("newsGrid");
    if (!container) return;

    container.innerHTML = news.map(n => {
        let sentClass = "gain";
        if (n.sentiment === "Bearish") sentClass = "loss";
        else if (n.sentiment === "Neutral") sentClass = "sector-badge";

        return `
            <div class="glass-card news-card">
                <div>
                    <div class="news-top">
                        <span class="news-source">${n.source} &bull; ${n.timestamp}</span>
                        <span class="badge ${sentClass}">${n.sentiment} Sentiment</span>
                    </div>
                    <h3 style="margin-top:6px">${n.headline}</h3>
                    <p class="news-summary">${n.summary}</p>
                </div>
                <div class="news-footer">
                    <span>Target: <strong>${n.symbol || 'Indian Economy'}</strong></span>
                    <button class="text-link-btn" onclick="selectStock('${n.symbol || 'NIFTY50'}')">Analyze Asset &rarr;</button>
                </div>
            </div>
        `;
    }).join("");
}

// ----------------------------------------------------
// Global Search & Interactive Helpers
// ----------------------------------------------------
function initGlobalSearch() {
    const input = document.getElementById("globalSearch");
    const dropdown = document.getElementById("searchDropdown");

    input.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            dropdown.style.display = "none";
            return;
        }

        const matches = state.stocks.filter(s => 
            s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            dropdown.style.display = "none";
            return;
        }

        dropdown.innerHTML = matches.map(s => `
            <div class="search-item" onclick="selectStock('${s.symbol}'); document.getElementById('searchDropdown').style.display='none';">
                <span><strong>${s.symbol}</strong> - ${s.name}</span>
                <span class="${s.change_pct >= 0 ? 'gain' : 'loss'}">${formatINR(s.price)}</span>
            </div>
        `).join("");

        dropdown.style.display = "block";
    });
}

function selectStock(symbol) {
    state.currentSymbol = symbol;
    switchTab("chartStudioTab");
    loadStudioChartData(symbol, state.currentTimeframe);
}

async function toggleWatchlist(symbol, event) {
    if (event) event.stopPropagation();
    try {
        const res = await fetch(`/api/stock/${symbol}/watchlist`, { method: "POST" });
        const data = await res.json();
        showToast(`${symbol} ${data.is_watchlist ? 'added to' : 'removed from'} Watchlist`, "success");
        await pollStockPrices();
    } catch (err) {
        showToast("Error updating watchlist", "error");
    }
}

// ----------------------------------------------------
// Studio & Screener Controls
// ----------------------------------------------------
function initStudioControls() {
    document.getElementById("symbolSelect").addEventListener("change", (e) => {
        loadStudioChartData(e.target.value, state.currentTimeframe);
    });

    document.querySelectorAll(".tf-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentTimeframe = btn.getAttribute("data-tf");
            loadStudioChartData(state.currentSymbol, state.currentTimeframe);
        });
    });

    document.getElementById("toggleSMA20").addEventListener("change", (e) => {
        state.showSMA20 = e.target.checked;
        loadStudioChartData(state.currentSymbol, state.currentTimeframe);
    });

    document.getElementById("toggleSMA50").addEventListener("change", (e) => {
        state.showSMA50 = e.target.checked;
        loadStudioChartData(state.currentSymbol, state.currentTimeframe);
    });
}

function initScreenerControls() {
    document.getElementById("btnApplyScreener").addEventListener("click", async () => {
        const q = document.getElementById("screenerQuery").value;
        const sec = document.getElementById("screenerSector").value;
        const maxP = document.getElementById("screenerMaxPrice").value;

        const res = await fetch(`/api/screener?query=${q}&sector=${sec}&max_price=${maxP}`);
        const data = await res.json();
        renderScreenerTable(data.results || []);
    });
}

// ----------------------------------------------------
// Trade Modal Controller
// ----------------------------------------------------
function initTradeModal() {
    const modal = document.getElementById("tradeModal");
    const closeBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelTradeBtn");
    const form = document.getElementById("tradeForm");

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    cancelBtn.addEventListener("click", () => modal.classList.remove("active"));

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const action = document.getElementById("tradeAction").value;
        const symbol = document.getElementById("tradeSymbol").value;
        const shares = parseFloat(document.getElementById("tradeShares").value);

        try {
            const res = await fetch("/api/portfolio/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, symbol, shares })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, "success");
                modal.classList.remove("active");
                loadPortfolioData();
            } else {
                showToast(data.error || "Trade failed", "error");
            }
        } catch (err) {
            showToast("Network error submitting trade", "error");
        }
    });
}

function populateTradeModalOptions(stocks) {
    const select = document.getElementById("tradeSymbol");
    if (!select) return;
    select.innerHTML = stocks.map(s => `<option value="${s.symbol}">${s.symbol} - ${s.name} (${formatINR(s.price)})</option>`).join("");
}

function openTradeModal(action = "BUY", symbol = "RELIANCE") {
    const modal = document.getElementById("tradeModal");
    document.getElementById("tradeAction").value = action;
    document.getElementById("tradeSymbol").value = symbol;
    modal.classList.add("active");
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}
