# Visual Diagrams & Architecture Guide

## 1. Complete User Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────────┘

PHASE 1: AUTHENTICATION
┌─────────────────┐
│  New User       │
│  (No Account)   │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ Sign Up │ ──POST /api/v1/auth/signup──> Database (User created)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Login   │ ──POST /api/v1/auth/login──> JWT Token + Cookie
    └────┬────┘
         │
         ▼ (Now Authenticated)
         
PHASE 2: EXCHANGE SETUP
┌────────────────────────┐
│ Get Exchange API Keys  │ (From Binance, Kraken, etc.)
│ • API Key             │ (eak)
│ • API Secret          │ (eas)
└────────────┬───────────┘
             │
             ▼
    ┌──────────────────┐
    │ Add Exchange     │ ──POST /api/v1/exchange/:userId──> 
    │ to Platform      │     (Keys ENCRYPTED & stored)
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Verify Exchange  │ ──GET /api/v1/portfolio/.../value──> 
    │ Connection       │     (Shows balance: $5,000)
    └────────┬─────────┘
             │
             ▼

PHASE 3: BOT CREATION
┌────────────────────────┐
│ View Available         │ ──GET /api/v1/bots/templates──>
│ Bot Templates          │ [RSI_SMA_MACD, BOLLINGER_BANDS, HYBRID]
└────────────┬───────────┘
             │
             ▼
    ┌──────────────────┐
    │ Select Strategy  │ (e.g., HYBRID - safest)
    │ & Pair           │ (BTC/USDT)
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Create Bot       │ ──POST /api/v1/bots/quick-create/...──>
    │ (Auto-configured)│     (Bot created with optimal defaults)
    └────────┬─────────┘
             │
             ▼

PHASE 4: AUTOMATED TRADING
┌────────────────────────┐
│ Start Bot              │ ──POST /api/v1/bots/bot/1/start──>
│ (Trading Begins)       │     (Bot status: ACTIVE)
└────────────┬───────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ EVERY 4 HOURS                  │
    ├────────────────────────────────┤
    │ 1. Fetch 200 candles of data   │
    │ 2. Analyze with 4 indicators   │
    │ 3. Check consensus (all agree?)│
    │ 4. Calculate position size     │
    │ 5. Place BUY/SELL order        │
    │ 6. Monitor for exit            │
    │ 7. Record results              │
    └────────────┬────────────────────┘
                 │
                 ▼ (If signal & consensus)
         ┌──────────────┐
         │ Trade 1:     │
         │ BUY 0.039 BTC│ → Entry: $42,500
         │ at $42,500   │   SL: $41,863
         └──────┬───────┘   TP: $44,412
                │
        ┌───────┴──────┐
        │              │
        ▼              ▼
    ┌────────┐    ┌────────┐
    │ Price  │    │ Price  │
    │ hits   │    │ hits   │
    │ TP: +$ │    │ SL: -$ │
    └────────┘    └────────┘
        │              │
        ▼              ▼
    PROFIT ✅      LOSS ✅
        
PHASE 5: PROFIT TRACKING
┌────────────────────────┐
│ Check Performance      │ ──GET /api/v1/bots/bot/1/performance──>
│ • 10 trades executed   │ ├─ 7 wins
│ • $165 profit          │ ├─ 3 losses
│ • 70% win rate         │ └─ Sharpe ratio: 1.95
└────────────┬───────────┘
             │
             ▼
    ┌──────────────────┐
    │ Check Portfolio  │ ──GET /api/v1/portfolio/.../value──>
    │ • Started: $5,000│ ├─ Current: $5,165
    │ • Profit: +$165  │ └─ Return: +3.3%
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Withdraw Profits │ (Send to bank account)
    │ +$165 to bank    │
    └──────────────────┘
```

---

## 2. Bot Trading Loop (Detailed)

```
┌──────────────────────────────────────────────────────────────────┐
│                    TRADING ENGINE LOOP                           │
│                  (Runs every 4 hours for HYBRID)                 │
└──────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────────────────────────────────────────┐
│ 1. FETCH MARKET DATA                            │
│    ├─ Exchange: Binance                         │
│    ├─ Pair: BTC/USDT                            │
│    ├─ Interval: 4h                              │
│    └─ Request 200 historical candles            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼ (CCXT API Call)
    ┌────────────────────────────┐
    │ OHLCV Data Received:       │
    │ [T1: O:42000 H:42500       │
    │       L:41900 C:42200 V:..] │
    │ [T2: O:42200 H:42700       │
    │       L:42100 C:42600 V:..]│
    │ ...                        │
    │ [T200: O:42600 H:42900     │
    │         L:42500 C:42800 V:]│
    └────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. ANALYZE WITH INDICATORS                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ A) RSI INDICATOR                                │
│    └─ Calculate Relative Strength Index         │
│       ├─ Look at last 14 candles               │
│       ├─ Compare gains vs losses                │
│       ├─ Result: RSI = 25 (Oversold!)          │
│       └─ Signal: BUY ✅                         │
│                                                 │
│ B) SMA INDICATORS                               │
│    ├─ 20-period SMA = $41,800                  │
│    ├─ 200-period SMA = $40,200                 │
│    ├─ Current Price: $42,500                   │
│    ├─ Check: $42,500 > $41,800 > $40,200      │
│    └─ Signal: BULLISH ✅                       │
│                                                 │
│ C) MACD INDICATOR                               │
│    ├─ MACD Line = $250                         │
│    ├─ Signal Line = $200                       │
│    ├─ Histogram = $50 (positive)               │
│    └─ Signal: BULLISH ✅                       │
│                                                 │
│ D) BOLLINGER BANDS                              │
│    ├─ Upper Band = $43,200                     │
│    ├─ Lower Band = $40,800                     │
│    ├─ Current: $42,500                         │
│    └─ Signal: Near resistance, caution ⚠️      │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 3. CHECK CONSENSUS (HYBRID RULE)                │
│                                                 │
│ Do ALL 4 indicators agree?                      │
│ ├─ RSI: BUY ✅                                  │
│ ├─ SMA: BULLISH ✅                              │
│ ├─ MACD: BULLISH ✅                             │
│ ├─ Bollinger: Caution (but trend is up)       │
│ └─ Consensus: YES, SIGNAL = BUY ✅             │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 4. CALCULATE POSITION SIZE WITH RISK MGMT       │
├─────────────────────────────────────────────────┤
│                                                 │
│ Account Balance: $5,000                         │
│ Risk Per Trade: 0.5%                            │
│ Risk Amount = $5,000 × 0.5% = $25              │
│                                                 │
│ Stop Loss: 1.5% below entry                     │
│ Entry Price: $42,500                            │
│ SL Price: $42,500 - (1.5% × $42,500) = $41,862│
│                                                 │
│ Position Size = Risk / SL % = $25 / 1.5% = $1,667
│                                                 │
│ Order Quantity = $1,667 / $42,500 = 0.039 BTC │
│                                                 │
│ Check Limits:                                   │
│ ├─ $1,667 < Max Position ($8,000)? YES ✅     │
│ └─ Ready to execute                            │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 5. EXECUTE TRADE                                │
│                                                 │
│ POST Order to Exchange:                         │
│ ├─ Symbol: BTC/USDT                            │
│ ├─ Side: BUY                                    │
│ ├─ Type: MARKET                                 │
│ ├─ Quantity: 0.039 BTC                          │
│ └─ Price: Market (executes immediately)         │
│                                                 │
│ Order Status: FILLED ✅                         │
│ Execution Price: $42,500                        │
│ Fee: ~0.1% ($1.66)                              │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 6. RECORD TRADE IN DATABASE                     │
│                                                 │
│ INSERT INTO trades:                             │
│ ├─ bot_id: 1                                   │
│ ├─ symbol: BTC/USDT                            │
│ ├─ side: BUY                                    │
│ ├─ quantity: 0.039                              │
│ ├─ entry_price: 42500                           │
│ ├─ stop_loss: 41862                             │
│ ├─ take_profit: 44412 (3% above entry)         │
│ ├─ status: OPEN                                 │
│ └─ created_at: 2024-01-15 19:00:00              │
│                                                 │
│ UPDATE bots SET:                                │
│ ├─ totalTrades: 1                               │
│ ├─ lastTradeAt: 2024-01-15 19:00:00             │
│ └─ trades: [{trade_details}]                    │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 7. MONITOR POSITION (Continuous)                │
│                                                 │
│ Check every minute:                             │
│ ├─ Current BTC/USDT price                       │
│ ├─ If price ≥ $44,412 → HIT TAKE PROFIT        │
│ │  └─ CLOSE: SELL 0.039 BTC at $44,412          │
│ │  └─ Profit: $44,412 - $42,500 = $1,912        │
│ │  └─ P&L: +$64.57 (fees included)              │
│ │  └─ Status: CLOSED ✅ PROFIT                  │
│ │                                               │
│ ├─ If price ≤ $41,862 → HIT STOP LOSS          │
│ │  └─ CLOSE: SELL 0.039 BTC at $41,862          │
│ │  └─ Loss: $41,862 - $42,500 = -$24.83         │
│ │  └─ Status: CLOSED ✅ LOSS (LIMITED)          │
│ │                                               │
│ └─ Otherwise → Keep waiting                     │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │ TRADE CLOSED    │
        │ (PROFIT or LOSS)│
        └────────┬────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 8. EVERY 5 MIN: RECONCILIATION WORKER           │
│                                                 │
│ Background job:                                 │
│ ├─ Check all open trades with exchange         │
│ ├─ Verify fills, cancellations, partials       │
│ ├─ Calculate fees & update P&L                  │
│ ├─ Sync exchange state with local DB            │
│ └─ Ensure consistency                           │
│                                                 │
│ Update performance stats:                       │
│ ├─ totalTrades: 1                               │
│ ├─ winningTrades: 1                             │
│ ├─ winRate: 100%                                │
│ ├─ totalProfit: $64.57                          │
│ ├─ netProfit: $64.57                            │
│ └─ lastTradeAt: [current time]                  │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
        ┌────────────────────┐
        │ WAIT FOR NEXT 4H   │
        │ Then loop again    │
        └────────────────────┘
```

---

## 3. Data Flow Through System

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA FLOW ARCHITECTURE                    │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Frontend  │ (React/Vue app in browser)
│             │
│ User clicks │
│ "Start Bot" │
└──────┬──────┘
       │ HTTP POST /api/v1/bots/bot/1/start
       │
       ▼
┌──────────────────────────────────────────┐
│        Express Backend Server            │
│                                          │
│  POST /api/v1/bots/bot/:botId/start     │
│  ├─ Verify JWT token                    │
│  ├─ Find bot in database                │
│  ├─ Check bot not already running       │
│  ├─ Retrieve exchange credentials       │
│  └─ Pass to Trading Engine              │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│      Database (PostgreSQL)               │
│                                          │
│  Table: Exchanges                        │
│  ├─ eak (encrypted)                     │
│  ├─ eas (encrypted)                     │
│  └─ exchangeName                        │
│                                          │
│  Table: Bots                             │
│  ├─ strategy                            │
│  ├─ symbol                              │
│  ├─ parameters                          │
│  └─ isActive                            │
└──────┬───────────────────────────────────┘
       │ Retrieve & Decrypt
       │
       ▼
┌──────────────────────────────────────────┐
│    Decryption Module                     │
│                                          │
│  Using RSA private key (only on server):│
│  ├─ Decrypt eak                         │
│  ├─ Decrypt eas                         │
│  └─ Return plain keys                   │
└──────┬───────────────────────────────────┘
       │ (Keys never exposed, used internally)
       │
       ▼
┌──────────────────────────────────────────┐
│    CCXT Exchange Connection              │
│                                          │
│  import binance from ccxt.binance        │
│  const exchange = new ccxt.binance({     │
│    apiKey: decryptedEak,                 │
│    secret: decryptedEas                  │
│  })                                      │
│                                          │
│  Functions available:                    │
│  ├─ exchange.fetchBalance()              │
│  ├─ exchange.fetchOHLCV()                │
│  ├─ exchange.createOrder()               │
│  └─ exchange.fetchOrder()                │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Trading Engine (Core Logic)             │
│                                          │
│  Every 4 hours:                          │
│  1. Fetch 200 candles from exchange      │
│  2. Run all 4 indicators (strategy)      │
│  3. Analyze signals                      │
│  4. Place order if consensus             │
│  5. Monitor position                     │
│  6. Record trade results                 │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Background Workers                      │
│                                          │
│  1. Strategy Polling Worker              │
│     └─ Runs every candle interval        │
│     └─ Fetches data, analyzes, trades    │
│                                          │
│  2. Trade Reconciliation Worker          │
│     └─ Runs every 5 minutes              │
│     └─ Syncs with exchange               │
│     └─ Updates performance stats         │
│                                          │
│  3. Monitoring & Alerts                  │
│     └─ Tracks errors                     │
│     └─ Sends alerts via Sentry           │
│     └─ Logs all activity                 │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│   Database Updates                       │
│                                          │
│  UPDATE bots SET:                        │
│  ├─ isActive = true                      │
│  ├─ lastError = null                     │
│  └─ updatedAt = NOW()                    │
│                                          │
│  INSERT INTO trades:                     │
│  ├─ symbol, side, quantity               │
│  ├─ entry_price, stop_loss, take_profit  │
│  └─ status = 'OPEN'                      │
│                                          │
│  UPDATE performance:                     │
│  ├─ totalTrades += 1                     │
│  ├─ winningTrades += 1 (if profit)       │
│  ├─ netProfit += profit                  │
│  └─ winRate = wins / total * 100         │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│   Frontend Dashboard Update              │
│                                          │
│  GET /api/v1/bots/bot/1                 │
│  └─ Returns: isActive = true ✅          │
│                                          │
│  GET /api/v1/bots/bot/1/performance      │
│  └─ Returns: Updated stats & trades      │
│                                          │
│  Display:                                │
│  ├─ Bot Status: ACTIVE                   │
│  ├─ Latest Trade: [details]              │
│  ├─ Win Rate: 70%                        │
│  ├─ Net Profit: $165.25                  │
│  └─ Last Updated: [timestamp]            │
└──────────────────────────────────────────┘
```

---

## 4. Exchange Connection Security

```
┌──────────────────────────────────────────────────────────────────┐
│            SECURE EXCHANGE CONNECTION FLOW                       │
└──────────────────────────────────────────────────────────────────┘

FRONTEND (User's Computer)
├─ User enters API key: abc123xyz
├─ User enters API secret: xyz789abc
│
│  [SHOULD NOT send plaintext!]
│  [Use encryption in real setup]
│
└────────────── SEND ENCRYPTED ───────────────►

BACKEND (Server - Secure)
├─ Receive encrypted keys
├─ NEVER log the keys
├─ ENCRYPT again with RSA (strong encryption)
│
│  Plain: abc123xyz
│  Encrypted with RSA public key:
│  ENCRYPTED_ABC123XYZ_12345...
│
└────────────── STORE IN DB ─────────────────►

DATABASE (PostgreSQL)
├─ Table: Exchanges
├─ eak: ENCRYPTED_ABC123XYZ_12345...
├─ eas: ENCRYPTED_XYZ789ABC_67890...
│
│  [Keys are NEVER readable without private key]
│  [Only backend has private key]
│  [DB breach doesn't expose keys]
│
└────────────── WHEN NEEDED ────────────────►

BACKEND (During Trade Execution)
├─ Retrieve encrypted key from DB
├─ DECRYPT using RSA private key
│  ENCRYPTED_ABC123XYZ_12345...
│  └─ Decrypted: abc123xyz
├─ Use decrypted key to authenticate with Binance
├─ NEVER store plain key in memory
├─ NEVER log the key
├─ Discard key after use
│
└────────────── CONNECT TO EXCHANGE ────────►

EXCHANGE (Binance)
├─ Receives auth with valid API key
├─ Returns candle data, balance, order fills
├─ Backend processes and records results
│
└────────────── RETURN TO FRONTEND ─────────►

FRONTEND Dashboard
├─ Shows results
├─ NEVER shows actual API keys
├─ Shows only status & performance
│
└─ User sees: "Bot status: ACTIVE ✅"
  (Real keys never visible to user in UI)
```

---

## 5. Bot Performance Over Time

```
Portfolio Value Over 30 Days (Example)

Day     Value       Profit    Win% Strategy
─────────────────────────────────────────────
Day 0   $5,000.00   $0        0%   HYBRID
Day 1   $5,064.57   +$64.57   100%
Day 2   $5,114.97   +$114.97  66%
Day 3   $5,165.25   +$165.25  70%
Day 4   $5,229.85   +$229.85  72%
Day 5   $5,280.15   +$280.15  70%
Day 10  $5,518.75   +$518.75  68%
Day 15  $5,712.50   +$712.50  69%
Day 20  $5,923.40   +$923.40  68%
Day 30  $6,250.15   +$1,250.15 70%

Total Return: 25% in 30 days! 🎉

     $6,250 ▲
          │
    $6,000 │                 ╱
          │                ╱
    $5,750 │              ╱
          │             ╱
    $5,500 │            ╱
          │           ╱
    $5,250 │          ╱
          │         ╱
    $5,000 └────────────────────► Days
        0    5   10   15  20  25  30

Key Metrics:
├─ Total Trades: 157
├─ Winning Trades: 110
├─ Losing Trades: 47
├─ Win Rate: 70%
├─ Average Win: +$12.50
├─ Average Loss: -$6.25
├─ Max Drawdown: 3.2%
├─ Sharpe Ratio: 1.85
└─ Return on Risk: Excellent

Note: These are examples. Actual results vary
based on market conditions, strategy parameters,
and luck. Always start with small amounts.
```

---

## 6. Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING FLOW                            │
└──────────────────────────────────────────────────────────────────┘

API Request comes in
│
▼
┌─ Validation Layer
│  ├─ Check JWT token valid?
│  │  ├─ NO → Return 401 Unauthorized
│  │  └─ YES → Continue
│  │
│  ├─ Check required fields present?
│  │  ├─ NO → Return 400 Bad Request
│  │  └─ YES → Continue
│  │
│  └─ Check data type correct?
│     ├─ NO → Return 400 Bad Request
│     └─ YES → Continue
│
▼
┌─ Database Query
│  ├─ Record found?
│  │  ├─ NO → Return 404 Not Found
│  │  └─ YES → Continue
│  │
│  └─ Query executes?
│     ├─ NO → Log error, return 500 Server Error
│     └─ YES → Continue
│
▼
┌─ Business Logic
│  ├─ Bot already running?
│  │  ├─ YES → Return 400 Bot already active
│  │  └─ NO → Continue
│  │
│  ├─ Exchange connection valid?
│  │  ├─ NO → Return 503 Service Unavailable
│  │  └─ YES → Continue
│  │
│  ├─ Sufficient balance?
│  │  ├─ NO → Return 400 Insufficient balance
│  │  └─ YES → Continue
│  │
│  └─ Order execution
│     ├─ Failed → Log error, return 500
│     └─ Success → Continue
│
▼
┌─ Response
│  ├─ SUCCESS: Return 200 + data
│  ├─ ERROR: Return error code + message
│  └─ ERROR: Also send to Sentry for monitoring
│
▼
┌─ Client Receives
│  ├─ Success → Show result to user
│  ├─ Error → Show error message
│  └─ Network error → Show "Please try again"

Examples:

SUCCESS (200):
{
  "success": true,
  "message": "Bot started successfully",
  "data": { bot_details }
}

ERROR (400):
{
  "success": false,
  "message": "Bot is already running"
}

ERROR (401):
{
  "success": false,
  "message": "Unauthorized - Invalid token"
}

ERROR (500):
{
  "success": false,
  "message": "Server error - Please try again later"
}
```

---

## 7. Technology Stack Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                              │
└──────────────────────────────────────────────────────────────────┘

FRONTEND LAYER (User Facing)
├─ React / Vue.js / Angular
├─ HTML, CSS, JavaScript
├─ State management (Redux/Vuex)
├─ HTTP client (Axios)
└─ Charts library (Chart.js, D3)

BACKEND LAYER (Node.js)
├─ Express.js (Web framework)
├─ AsyncHandler (Error handling)
├─ CORS (Cross-origin requests)
├─ Helmet (Security headers)
├─ Rate Limiting
├─ Authentication:
│  ├─ JWT (Tokens)
│  ├─ bcrypt (Password hashing)
│  └─ Cookies (Session)
└─ Swagger (API documentation)

DATA LAYER
├─ PostgreSQL (Database)
├─ Sequelize (ORM)
└─ Migrations (Schema management)

EXCHANGE INTEGRATION
├─ CCXT Library (Multi-exchange)
├─ Binance API
├─ Kraken API
├─ Coinbase API
└─ Others supported

SECURITY LAYER
├─ RSA Encryption (API keys)
├─ bcrypt (Passwords)
├─ JWT Tokens (Auth)
├─ SSL/TLS (HTTPS)
└─ API Rate Limiting

MONITORING & LOGGING
├─ Sentry (Error tracking)
├─ Console logs
├─ Performance metrics
└─ Health check endpoint

BACKGROUND JOBS
├─ Strategy Polling Worker
├─ Trade Reconciliation Worker
├─ Portfolio Snapshot Worker
└─ Monitoring Alerts

DEPLOYMENT
├─ Docker (Containerization)
├─ PM2 (Process management)
├─ Nginx (Reverse proxy)
├─ Render.com (Hosting)
├─ Vercel (Frontend hosting)
└─ GitHub Actions (CI/CD)
```

---

This completes the visual guide! 🎨
