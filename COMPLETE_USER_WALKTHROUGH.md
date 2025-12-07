# 🚀 Crypto Trading Bot - Complete User Walkthrough

## Overview

This is a comprehensive guide showing the complete journey from account creation through receiving profits from your trading bots. The system handles authentication, API key management, bot creation, automated trading, and profit tracking.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Phase 1: Account Setup](#phase-1-account-setup)
3. [Phase 2: Exchange Connection](#phase-2-exchange-connection)
4. [Phase 3: Bot Creation](#phase-3-bot-creation)
5. [Phase 4: Bot Trading](#phase-4-bot-trading)
6. [Phase 5: Profit Tracking](#phase-5-profit-tracking)
7. [Complete API Flow](#complete-api-flow)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│              (React/Vue Web or Mobile App)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Server                         │
│                  (Node.js + Express)                         │
├─────────────────────────────────────────────────────────────┤
│  Authentication    Exchange Integration    Bot Management    │
│  • Signup          • CCXT Library         • Create Bot       │
│  • Login           • Multi-Exchange       • Start Bot        │
│  • Sessions        • API Key Management   • Stop Bot         │
│  • JWT Tokens      • Secure Storage       • Monitor Stats    │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────┐      ┌──────────────┐    ┌─────────────┐
    │ Database │      │   Exchanges  │    │  Workers    │
    │PostgreSQL│      │   (Binance   │    │  • Polling  │
    │          │      │   Kraken     │    │  • Reconcil │
    │• Users   │      │  Coinbase)   │    │  • Monitoring
    │• Bots    │      │              │    └─────────────┘
    │• Trades  │      └──────────────┘
    │• Portfolio
    └─────────┘
```

---

## 🎯 Phase 1: Account Setup

### Step 1: User Signup

The first step is creating a user account with email and password.

**Frontend Flow**:
```
User opens app → Clicks "Sign Up" → Fills form → Clicks "Register"
```

**API Endpoint**:
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "username": "john_trader",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Backend Process**:
1. ✅ Validates all fields are provided
2. ✅ Checks email doesn't already exist in database
3. ✅ Hashes password using bcrypt (security: passwords never stored in plaintext)
4. ✅ Creates user record in PostgreSQL database
5. ✅ Returns success message

**Response**:
```json
{
  "success": true,
  "message": "Signup successful",
  "data": null
}
```

**User Account Created** ✅

---

### Step 2: User Login

Once account is created, user logs in to access the platform.

**Frontend Flow**:
```
User → Enters email + password → Clicks "Login" → Authenticated
```

**API Endpoint**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Backend Process**:
1. ✅ Validates email and password provided
2. ✅ Finds user in database by email
3. ✅ Compares password hash using bcrypt
4. ✅ Generates JWT token for session management
5. ✅ Sets `access_token` cookie for authentication
6. ✅ Returns user data and token

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "username": "john_trader",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**User Logged In** ✅
**Session established with JWT token and cookie**

---

## 🔐 Phase 2: Exchange Connection

### Step 3: Generate API Keys on Exchange

User must create API keys on their chosen exchange (e.g., Binance).

**Process**:
1. User logs into their Binance account
2. Goes to API Management section
3. Creates new API key with restrictions:
   - ✅ Spot trading enabled
   - ✅ Can read balances
   - ✅ Can place orders
   - ❌ Withdraw disabled (security)
4. Gets:
   - **Exchange API Key (eak)**: Public identifier
   - **Exchange API Secret (eas)**: Secret for signing requests

**Important**: Keys look like:
- `eak`: `Vo7rE3x7...` (visible in UI)
- `eas`: `NtGbZk8w...` (secret, never shown again)

---

### Step 4: Add Exchange to Trading Platform

User enters their exchange API keys into the platform securely.

**Frontend Flow**:
```
Dashboard → Settings → "Add Exchange" → Enter Exchange Name, API Key, Secret → Save
```

**API Endpoint**:
```http
POST /api/v1/exchange/:userId
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "exchangeName": "binance",
  "eak": "Vo7rE3x7...",
  "eas": "NtGbZk8w..."
}
```

Replace `:userId` with the actual user ID (e.g., `1`)

**Backend Security Process** (This is crucial!):
```javascript
1. Receives API keys from frontend
2. ENCRYPTS both keys using RSA encryption
   ├─ eak → encrypted_eak (can only decrypt with private key)
   └─ eas → encrypted_eas (can only decrypt with private key)
3. Stores encrypted versions in database
4. Returns success (actual keys never logged or exposed)
```

**Database Storage**:
```
Exchange Table
├─ id: 1
├─ userId: 1
├─ exchangeName: "binance"
├─ eak: "ENCRYPTED_STRING_12345..."
├─ eas: "ENCRYPTED_STRING_67890..."
└─ createdAt: "2024-01-15T10:00:00Z"
```

**Response**:
```json
{
  "success": true,
  "message": "Exchange created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "exchangeName": "binance",
    "eak": "ENCRYPTED_STRING_12345...",
    "eas": "ENCRYPTED_STRING_67890..."
  }
}
```

**Exchange Connected** ✅
**API Keys securely encrypted and stored**

---

### Step 5: Verify Exchange Connection (Optional)

User can verify that the exchange connection is working by fetching their balance.

**Frontend Flow**:
```
Settings → Connected Exchanges → Click "Verify" → Shows current balance
```

**What Happens Behind the Scenes**:
```javascript
1. System retrieves encrypted API keys from database
2. Decrypts using private key (only backend has this)
3. Uses CCXT library to authenticate with exchange
4. Fetches user's wallet balances (BTC, ETH, USDT, etc.)
5. Returns current portfolio value
```

**Response Example**:
```json
{
  "success": true,
  "message": "Portfolio value retrieved successfully",
  "data": {
    "value": 5250.75
  }
}
```

**Means**: User has ~$5,250 worth of crypto on this exchange

---

## 🤖 Phase 3: Bot Creation

### Step 6: View Available Bot Templates

Before creating a bot, user sees what strategies are available.

**Frontend Flow**:
```
Dashboard → "Create Bot" → See 3 strategy cards with descriptions
```

**API Endpoint**:
```http
GET /api/v1/bots/templates
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "message": "Bot templates retrieved successfully",
  "data": [
    {
      "id": "RSI_SMA_MACD",
      "name": "RSI + SMA + MACD Strategy",
      "description": "Momentum-based strategy combining RSI overbought/oversold with SMA crossovers and MACD confirmation",
      "strategy": "RSI_SMA_MACD",
      "interval": "1h",
      "estimatedWinRate": "55-65%",
      "riskProfile": "Moderate"
    },
    {
      "id": "BOLLINGER_BANDS",
      "name": "Bollinger Bands Strategy",
      "description": "Mean-reversion strategy using Bollinger Bands with volatility confirmation",
      "strategy": "BOLLINGER_BANDS",
      "interval": "1h",
      "estimatedWinRate": "50-60%",
      "riskProfile": "Moderate"
    },
    {
      "id": "HYBRID",
      "name": "Hybrid Multi-Strategy",
      "description": "Conservative strategy combining multiple indicators with high confidence signals (Recommended for beginners)",
      "strategy": "HYBRID",
      "interval": "4h",
      "estimatedWinRate": "65-75%",
      "riskProfile": "Conservative"
    }
  ]
}
```

**User Options**:
- **RSI + SMA + MACD**: For trending markets, moderate risk
- **Bollinger Bands**: For range-bound markets, moderate risk
- **HYBRID**: Safest option, recommended for beginners, conservative risk

---

### Step 7: Create Bot from Template

User selects a strategy and trading pair, bot is auto-configured.

**Frontend Flow**:
```
Select "HYBRID" Strategy → Enter "BTC/USDT" → Click "Create Bot" → Done!
```

**API Endpoint**:
```http
POST /api/v1/bots/quick-create/:userId/:exchangeId
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "botType": "HYBRID",
  "symbol": "BTC/USDT",
  "name": "My Bitcoin Bot"
}
```

Replace `:userId` with `1` and `:exchangeId` with `1`

**Backend Process**:
```javascript
1. Validates bot type is in templates (HYBRID, RSI_SMA_MACD, BOLLINGER_BANDS)
2. Validates symbol format is correct (e.g., BTC/USDT)
3. Retrieves template configuration for HYBRID strategy
4. Creates Bot record with:
   - Strategy parameters (RSI, SMA, MACD, Bollinger Bands settings)
   - Risk management (0.5% risk per trade, 1:3 reward/risk ratio)
   - Performance tracking initialized to zeros
   - Status: INACTIVE (not trading yet)
5. Stores in database with auto-generated bot ID
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Bot created successfully with template configuration",
  "data": {
    "bot": {
      "id": 1,
      "userId": 1,
      "exchangeId": 1,
      "name": "My Bitcoin Bot",
      "strategy": "HYBRID",
      "symbol": "BTC/USDT",
      "interval": "4h",
      "isActive": false,
      "parameters": {
        "rsi": { "period": 14, "overbought": 70, "oversold": 30 },
        "sma": { "shortPeriod": 20, "longPeriod": 200 },
        "macd": { "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 },
        "bollinger": { "period": 20, "standardDev": 2 }
      },
      "riskManagement": {
        "riskPercentage": 0.5,
        "riskRewardRatio": 3,
        "maxPositionSize": 8000,
        "maxRiskPerTrade": 1,
        "stopLossPercentage": 1.5,
        "takeProfitPercentage": 4.5
      },
      "performance": {
        "totalTrades": 0,
        "winningTrades": 0,
        "losingTrades": 0,
        "winRate": 0,
        "totalProfit": 0,
        "totalLoss": 0,
        "netProfit": 0,
        "maxDrawdown": 0,
        "sharpeRatio": 0,
        "lastTradeAt": null,
        "trades": []
      },
      "lastError": null,
      "errorCount": 0,
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    },
    "template": {
      "description": "Conservative strategy combining multiple indicators...",
      "estimatedWinRate": "65-75%"
    },
    "status": "Bot created and ready to activate"
  }
}
```

**What This Means**:
- ✅ Bot created with ID `1`
- ✅ All parameters configured from HYBRID template
- ✅ Will trade BTC/USDT on 4-hour candles
- ✅ Conservative 0.5% risk per trade
- ✅ Currently inactive (status: `isActive: false`)

**Bot Created** ✅
**Ready to start trading**

---

## ⚙️ Phase 4: Bot Trading

### Step 8: Start Bot

User activates the bot to begin automated trading.

**Frontend Flow**:
```
Dashboard → Click bot "My Bitcoin Bot" → Click "Start Trading" → Bot Status: Active
```

**API Endpoint**:
```http
POST /api/v1/bots/bot/1/start
Authorization: Bearer {access_token}
```

**Backend Process**:
```javascript
1. Finds bot with ID 1
2. Validates bot is not already running
3. Retrieves encrypted API keys for exchange
4. Decrypts keys for authentication
5. Creates Trading Engine instance with:
   - Authenticated CCXT exchange connection
   - Bot configuration (strategy, symbol, parameters)
6. Initializes polling worker that runs continuously
7. Updates bot status: isActive = true
8. Logging: "Bot 1 started for BTC/USDT with HYBRID strategy"
```

**Response**:
```json
{
  "success": true,
  "message": "Bot started successfully",
  "data": {
    "id": 1,
    "name": "My Bitcoin Bot",
    "strategy": "HYBRID",
    "symbol": "BTC/USDT",
    "isActive": true
  }
}
```

**Bot Now Trading** ✅

---

### Step 9: How the Bot Trades (Behind the Scenes)

Once started, the bot continuously:

**Every 4 Hours (HYBRID default interval)**:

```
1️⃣ FETCH MARKET DATA
   ├─ Retrieves last 200 candles of BTC/USDT 4-hour data
   ├─ Each candle has: Open, High, Low, Close, Volume, Timestamp
   └─ Recent price: $42,500

2️⃣ ANALYZE WITH ALL 4 INDICATORS
   ├─ RSI Calculation
   │  ├─ Calculates relative strength index
   │  ├─ If RSI < 30 → OVERSOLD (potential BUY)
   │  ├─ If RSI > 70 → OVERBOUGHT (potential SELL)
   │  └─ Current: RSI = 25 (OVERSOLD)
   │
   ├─ SMA Calculation
   │  ├─ 20-period SMA = $41,800 (short-term trend)
   │  ├─ 200-period SMA = $40,200 (long-term trend)
   │  ├─ Price above both? (BULLISH)
   │  └─ Current: $42,500 > $41,800 > $40,200 ✅ BULLISH
   │
   ├─ MACD Calculation
   │  ├─ MACD Line = $250
   │  ├─ Signal Line = $200
   │  ├─ Histogram = $50 (positive = bullish)
   │  └─ Current: HISTOGRAM positive ✅ BULLISH
   │
   └─ Bollinger Bands
      ├─ Upper Band = $43,200
      ├─ Lower Band = $40,800
      ├─ Middle Band = $42,000
      └─ Current: $42,500 near upper band

3️⃣ CONSENSUS CHECK (HYBRID = ALL must agree)
   ├─ RSI says: BUY ✅
   ├─ SMA says: BULLISH ✅
   ├─ MACD says: BULLISH ✅
   ├─ Bollinger Bands says: Near resistance (caution)
   └─ Consensus: ALL 4 indicators AGREE → EXECUTE BUY ✅

4️⃣ CALCULATE POSITION SIZE WITH RISK MANAGEMENT
   ├─ Account Balance: $5,000
   ├─ Risk Percentage: 0.5% per trade
   ├─ Risk Amount: $5,000 × 0.5% = $25
   ├─ Stop Loss: 1.5% below entry
   ├─ Position Size = Risk Amount / Stop Loss % = $25 / 1.5% = $1,667
   ├─ Check Max Position: $1,667 < $8,000 limit ✅
   └─ Order Size: ~0.039 BTC at $42,500

5️⃣ EXECUTE TRADE
   ├─ Order Type: Market (buy at current price)
   ├─ Action: BUY 0.039 BTC
   ├─ Entry Price: $42,500
   ├─ Stop Loss: $42,500 - 1.5% = $41,863
   ├─ Take Profit: $42,500 + 4.5% = $44,412
   └─ Status: FILLED ✅

6️⃣ RECORD TRADE
   ├─ Store in Trade table:
   │  ├─ order_id: "12345678"
   │  ├─ symbol: "BTC/USDT"
   │  ├─ side: "BUY"
   │  ├─ quantity: 0.039
   │  ├─ entry_price: 42500
   │  ├─ stop_loss: 41863
   │  ├─ take_profit: 44412
   │  ├─ status: "OPEN"
   │  └─ created_at: "2024-01-15T15:00:00Z"
   └─ Log: "Trade executed: BUY 0.039 BTC at $42,500"

7️⃣ MONITOR POSITION
   ├─ Continuously checks price every minute
   ├─ If price reaches $44,412 → SELL at take profit ✅ PROFIT
   ├─ If price drops to $41,863 → SELL at stop loss ✅ LOSS
   └─ Update Trade record with close price and P&L

8️⃣ EVERY 5 MINUTES: RECONCILIATION WORKER
   ├─ Checks all open trades with exchange
   ├─ If trade status changed on exchange → update local DB
   ├─ If filled/partially filled → calculate fees and profit
   ├─ If cancelled → mark as closed
   └─ This ensures DB is always in sync with exchange
```

**Example Profit Scenario**:
```
Entry: BUY 0.039 BTC @ $42,500 (Cost: $1,667.50)
Take Profit Hit: Price reaches $44,412
Exit: SELL 0.039 BTC @ $44,412 (Received: $1,732.07)

Profit = $1,732.07 - $1,667.50 = $64.57
Return = 3.87% on position (matches expected 4.5% TP)
Success! ✅
```

**Example Loss Scenario**:
```
Entry: BUY 0.039 BTC @ $42,500 (Cost: $1,667.50)
Stop Loss Hit: Price drops to $41,863
Exit: SELL 0.039 BTC @ $41,863 (Received: $1,632.66)

Loss = $1,632.66 - $1,667.50 = -$34.84
Loss = 2.09% on position (matches expected 1.5% SL)
Expected, limited loss ✅
```

---

### Step 10: Monitor Bot Performance

User checks how bot is performing in real-time.

**Frontend Flow**:
```
Dashboard → Click bot → Performance Tab → See live stats
```

**API Endpoint**:
```http
GET /api/v1/bots/bot/1/performance
Authorization: Bearer {access_token}
```

**Response** (After 10 trades):
```json
{
  "success": true,
  "message": "Performance retrieved successfully",
  "data": {
    "totalTrades": 10,
    "winningTrades": 7,
    "losingTrades": 3,
    "winRate": 70,
    "totalProfit": 250.50,
    "totalLoss": 85.25,
    "netProfit": 165.25,
    "maxDrawdown": 2.5,
    "sharpeRatio": 1.95,
    "lastTradeAt": "2024-01-15T18:30:00Z",
    "trades": [
      {
        "symbol": "BTC/USDT",
        "side": "BUY",
        "entryPrice": 42500,
        "exitPrice": 44412,
        "quantity": 0.039,
        "profit": 64.57,
        "profitPercent": 3.87,
        "duration": "2 hours"
      },
      // ... more trades
    ]
  }
}
```

**What This Means**:
- ✅ **10 total trades** executed
- ✅ **7 wins, 3 losses** = 70% win rate
- ✅ **$165.25 profit** (net after all wins and losses)
- ✅ **Max drawdown 2.5%** (never lost more than 2.5% at once)
- ✅ **Sharpe ratio 1.95** (good risk-adjusted returns)

---

## 📊 Phase 5: Profit Tracking

### Step 11: Check Portfolio Value

User sees current account balance including unrealized profits/losses.

**Frontend Flow**:
```
Dashboard → Portfolio Tab → See current balance, breakdown by asset
```

**API Endpoint**:
```http
GET /api/v1/portfolio/1/1/value
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "message": "Portfolio value retrieved successfully",
  "data": {
    "value": 5415.50
  }
}
```

**What Happened**:
- Started with: $5,000
- Bot profits: +$165.25
- Current value: $5,415.50
- **Total return: 8.31%** ✅

---

### Step 12: Check Portfolio Distribution

User sees what assets their account holds and the breakdown.

**Frontend Flow**:
```
Dashboard → Portfolio → See pie chart: 60% BTC, 30% ETH, 10% USDT
```

**API Endpoint**:
```http
GET /api/v1/portfolio/1/1/distribution
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "message": "Portfolio distribution retrieved successfully",
  "data": {
    "totalValue": 5415.50,
    "assets": [
      {
        "symbol": "BTC",
        "quantity": 0.127,
        "value": 3250.75,
        "percentage": 60.0
      },
      {
        "symbol": "ETH",
        "quantity": 1.5,
        "value": 1624.50,
        "percentage": 30.0
      },
      {
        "symbol": "USDT",
        "quantity": 540.25,
        "value": 540.25,
        "percentage": 10.0
      }
    ]
  }
}
```

**What This Shows**:
- 60% in Bitcoin (0.127 BTC worth $3,250.75)
- 30% in Ethereum (1.5 ETH worth $1,624.50)
- 10% in stablecoin USDT ($540.25)
- Total: $5,415.50

---

### Step 13: Withdraw Profits

User withdraws some of their profits to their bank account.

**Process**:
```
1. User goes to Withdraw section
2. Selects USDT (stablecoin) for withdrawal
3. Enters amount: $165.25 (their bot profits)
4. Confirms address for withdrawal
5. System processes withdrawal to crypto exchange
6. Exchange converts to fiat and sends to bank
7. User receives funds in 1-3 business days
```

**Result**:
- Portfolio value: $5,250.25 (after withdrawal)
- Realized profit: $165.25 in bank account ✅

---

## 📈 Complete API Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

STEP 1: AUTHENTICATION
  POST /api/v1/auth/signup        → Create account
  POST /api/v1/auth/login         → Get JWT token
  
STEP 2: EXCHANGE CONNECTION
  POST /api/v1/exchange/:userId   → Add Binance API keys
  GET  /api/v1/portfolio/.../value → Verify connection
  
STEP 3: BOT SETUP
  GET  /api/v1/bots/templates                    → See strategies
  POST /api/v1/bots/quick-create/:userId/:exId  → Create bot
  
STEP 4: TRADING
  POST /api/v1/bots/bot/:botId/start             → Start bot
  GET  /api/v1/bots/bot/:botId/performance      → Check stats
  
STEP 5: PROFIT TRACKING
  GET  /api/v1/portfolio/:userId/:exId/value        → Total value
  GET  /api/v1/portfolio/:userId/:exId/distribution → Asset breakdown
  POST /api/v1/portfolio/:userId/:exId/withdraw     → Withdraw profits
```

---

## 🔄 Data Flow in Each Trade

```
┌─────────────────────────────────────────────────────────┐
│              TRADE EXECUTION FLOW                       │
└─────────────────────────────────────────────────────────┘

EVERY 4 HOURS (HYBRID bot interval):

1. FETCH DATA
   └─→ GET 200 candles from Binance
   
2. ANALYZE SIGNALS
   ├─→ Calculate RSI (momentum)
   ├─→ Calculate SMA (trend)
   ├─→ Calculate MACD (momentum)
   └─→ Calculate Bollinger Bands (volatility)
   
3. REACH CONSENSUS
   └─→ Check if ALL 4 indicators agree
   
4. CALCULATE POSITION SIZE
   ├─→ Account balance: $5,000
   ├─→ Risk per trade: 0.5%
   ├─→ Max position: $1,667
   └─→ Order quantity: 0.039 BTC
   
5. PLACE ORDER
   ├─→ POST to exchange (BUY 0.039 BTC)
   ├─→ Order fills at market price
   └─→ Receive 0.039 BTC in wallet
   
6. RECORD TRADE
   ├─→ Save to database
   ├─→ Track entry price
   ├─→ Set stop loss & take profit
   └─→ Status: OPEN
   
7. MONITOR POSITION
   ├─→ Check every minute
   ├─→ If price hits take profit
   │  └─→ SELL at $44,412 → CLOSE with PROFIT ✅
   ├─→ If price hits stop loss
   │  └─→ SELL at $41,863 → CLOSE with LOSS ✅
   └─→ Update performance stats
   
8. RECONCILIATION (Every 5 mins)
   ├─→ Sync with exchange
   ├─→ Verify fills
   ├─→ Calculate fees
   ├─→ Update P&L
   └─→ Ensure DB matches exchange
```

---

## 💾 Database Schema Overview

### Users Table
```sql
CREATE TABLE Users (
  id INTEGER PRIMARY KEY,
  username VARCHAR,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,  -- bcrypt hashed
  created_at TIMESTAMP
);
```

### Exchanges Table (Encrypted)
```sql
CREATE TABLE Exchanges (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id),
  exchange_name VARCHAR,
  eak VARCHAR,  -- ENCRYPTED API Key
  eas VARCHAR,  -- ENCRYPTED API Secret
  created_at TIMESTAMP
);
```

### Bots Table
```sql
CREATE TABLE Bots (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id),
  exchange_id INTEGER REFERENCES Exchanges(id),
  name VARCHAR,
  strategy ENUM('RSI_SMA_MACD', 'BOLLINGER_BANDS', 'HYBRID'),
  symbol VARCHAR,
  interval ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d'),
  is_active BOOLEAN,
  parameters JSON,         -- Strategy settings
  risk_management JSON,    -- Risk settings
  performance JSON,        -- Trade stats
  created_at TIMESTAMP
);
```

### Trades Table
```sql
CREATE TABLE Trades (
  id INTEGER PRIMARY KEY,
  bot_id INTEGER REFERENCES Bots(id),
  user_id INTEGER REFERENCES Users(id),
  exchange_order_id VARCHAR UNIQUE,
  symbol VARCHAR,
  side ENUM('BUY', 'SELL'),
  quantity DECIMAL,
  entry_price DECIMAL,
  exit_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  profit_loss DECIMAL,
  status ENUM('OPEN', 'FILLED', 'CANCELLED', 'FAILED'),
  filled_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### Portfolio Snapshots Table
```sql
CREATE TABLE PortfolioSnapshots (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id),
  exchange_id INTEGER REFERENCES Exchanges(id),
  total_value DECIMAL,
  assets JSON,  -- {BTC: 0.127, ETH: 1.5, USDT: 540}
  timestamp TIMESTAMP
);
```

---

## 🔐 Security Measures

### 1. Password Security
```javascript
// Signup
password: "MyPassword123"
  ↓ (bcrypt with 10 rounds)
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/gUe

// Never stored in plaintext
// Login: compare entered password hash with stored hash
```

### 2. API Key Encryption
```javascript
// Exchange API key: "abc123xyz"
// Encrypted with RSA public key (2048-bit)
  ↓
// Stored encrypted in database
ENCRYPTED_ABC123XYZ...

// When needed:
// Decrypted with RSA private key (only on server)
  ↓
// Used to authenticate with exchange
// Never exposed to frontend or logs
```

### 3. Session Authentication
```javascript
// After login
User → Receives JWT token
  ↓
All requests include: Authorization: Bearer {JWT_TOKEN}
  ↓
Server verifies token signature
  ↓
Request processed or rejected
```

### 4. Database Security
```
PostgreSQL with SSL/TLS connection
├─ Encrypted password storage (bcrypt)
├─ Encrypted API keys (RSA)
├─ User isolation (each user only sees their data)
└─ Read-only API key exposure (can't withdraw funds)
```

---

## 📊 Complete Example Scenario

### Day 1: New User Journey

```
TIME    ACTION                          BALANCE    TRADES
─────────────────────────────────────────────────────────
09:00   Sign up                          $0        0
10:00   Add Binance (deposit $5,000)     $5,000    0
10:30   Create HYBRID bot for BTC/USDT   $5,000    0
11:00   Start bot trading                $5,000    0

─── NEXT 4 HOURS: First Trading Window ───

12:00   [No signal yet]                  $5,000    0
14:00   [No signal yet]                  $5,000    0
16:00   [No signal yet]                  $5,000    0
19:00   [HYBRID signal: BUY BTC]
        Entry: $42,500
        Position: 0.039 BTC ($1,667.50)  $3,332.50 1 (OPEN)

─── WAIT FOR EXIT ───

20:00   [Monitoring...]                  $3,332.50 1 (OPEN)
22:00   [Price at $43,200]               $3,332.50 1 (OPEN)
23:00   [TAKE PROFIT hit: $44,412]
        Exit: SELL 0.039 BTC
        Profit: +$64.57                  $5,064.57 1 (CLOSED)

─── NEXT TRADING WINDOW ───

23:30   [HYBRID signal: SELL/SHORT]
        Entry: $44,000
        Position: $2,000 short            $7,064.57 2 (OPEN)

01:00   [Price drops to $43,500]
        EXIT: Close short
        Profit: +$25.75                  $7,090.32 2 (CLOSED)

─── END OF DAY ───
Final Balance: $7,090.32
Day 1 Profit: +$2,090.32 (41.8% return!)
Total Trades: 2
Win Rate: 100% (2/2)
```

**Note**: Returns vary by market conditions and luck of signal timing.

---

## 🚨 Risks & Warnings

### Market Risks
- ⚠️ **Crypto volatility**: Market can move 20%+ in hours
- ⚠️ **Flash crashes**: Sudden price drops can trigger stop losses
- ⚠️ **Low liquidity**: Some pairs may not fill orders instantly

### Bot Risks
- ⚠️ **Overfitting**: Past performance ≠ future results
- ⚠️ **Black swan events**: Unexpected events break all strategies
- ⚠️ **Technical failures**: Server downtime, network issues, API outages

### Mitigation
- ✅ Always start with small amounts
- ✅ Use stop losses (bot enforces these)
- ✅ Monitor bot regularly
- ✅ Keep profits separate from trading capital
- ✅ Never risk more than you can afford to lose

---

## 🎓 Trading Concepts

### Key Terms

| Term | Meaning |
|------|---------|
| **BUY/LONG** | Purchase asset expecting price increase |
| **SELL/SHORT** | Sell/borrow asset expecting price decrease |
| **ENTRY** | Price at which trade is opened |
| **EXIT** | Price at which trade is closed |
| **STOP LOSS** | Price that automatically closes position to prevent big losses |
| **TAKE PROFIT** | Price that automatically closes position to lock in gains |
| **P&L** | Profit & Loss on a trade |
| **WIN RATE** | Percentage of trades that are profitable |
| **DRAWDOWN** | Maximum loss experienced from peak |
| **POSITION SIZE** | How much of account is risked per trade |

### HYBRID Strategy Indicators

| Indicator | What It Does |
|-----------|-------------|
| **RSI** | Measures if asset is overbought (>70) or oversold (<30) |
| **SMA** | Shows trend direction (price above = bullish) |
| **MACD** | Confirms momentum (line > signal = bullish) |
| **Bollinger Bands** | Shows volatility and support/resistance |

**HYBRID Rule**: Trade only when ALL 4 agree (high confidence)

---

## 📱 Frontend Integration Checklist

For developers building the frontend:

- [ ] Sign up form with validation
- [ ] Login form with email/password
- [ ] Dashboard showing portfolio value
- [ ] "Add Exchange" form to enter API keys
- [ ] Exchange verification button
- [ ] Bot creation wizard (template selector)
- [ ] Bot list with start/stop buttons
- [ ] Bot performance dashboard
- [ ] Portfolio breakdown chart
- [ ] Trade history table
- [ ] Withdraw profits flow
- [ ] Settings/account management

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot won't start | Invalid API keys | Verify keys on Binance |
| No trades executed | Signals not generated | Wait for next 4h candle |
| Trades failing | Insufficient balance | Deposit more funds |
| Wrong profit calculation | Exchange fees not included | Bot includes fees in P&L |
| Bot disconnected | Server restarted | Restart bot |
| API key error | Key expired | Regenerate on Binance |

---

## 📞 API Reference Quick Links

**Authentication**:
- POST /api/v1/auth/signup
- POST /api/v1/auth/login

**Exchanges**:
- POST /api/v1/exchange/:userId
- GET /api/v1/exchange/:userId

**Bots**:
- GET /api/v1/bots/templates
- POST /api/v1/bots/quick-create/:userId/:exchangeId
- POST /api/v1/bots/bot/:botId/start
- POST /api/v1/bots/bot/:botId/stop
- GET /api/v1/bots/bot/:botId/performance

**Portfolio**:
- GET /api/v1/portfolio/:userId/:exchangeId/value
- GET /api/v1/portfolio/:userId/:exchangeId/distribution

---

## ✅ Summary

**Complete User Journey**:
```
1. Sign up → Account created
2. Add exchange → API keys encrypted and stored
3. Create bot → Strategy auto-configured from template
4. Start bot → Trading begins automatically
5. Monitor stats → Track performance and profits
6. Withdraw profits → Move gains to bank account
```

**Key Achievements**:
- ✅ Secure authentication and session management
- ✅ Encrypted API key storage
- ✅ Automated bot trading with multiple strategies
- ✅ Real-time performance tracking
- ✅ Risk management enforced
- ✅ Profit tracking and portfolio analytics

**Technology Stack**:
- Node.js + Express backend
- PostgreSQL database
- CCXT for exchange integration
- RSA encryption for API keys
- JWT for authentication
- Sequelize ORM for database

---

This completes the entire flow from signup to profits! 🚀
