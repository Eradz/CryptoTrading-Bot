# Simplified Bot Creation Guide

## Overview

Users can now create trading bots in two ways:

1. **Quick Create (Recommended)** - One-click bot selection with pre-configured optimal defaults
2. **Advanced Create** - Full customization of all bot parameters

## Bot Templates

Three pre-configured bot templates are available, each optimized for different trading styles:

### 1. RSI + SMA + MACD Strategy
- **ID**: `RSI_SMA_MACD`
- **Type**: Momentum-based strategy
- **Description**: Combines RSI overbought/oversold signals with SMA crossovers and MACD confirmation
- **Default Interval**: 1 hour
- **Estimated Win Rate**: 55-65%
- **Risk Profile**: Moderate
- **Best For**: Traders wanting momentum confirmation from multiple indicators

**Parameters**:
```json
{
  "rsi": { "period": 14, "overbought": 70, "oversold": 30 },
  "sma": { "shortPeriod": 20, "longPeriod": 200 },
  "macd": { "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 }
}
```

**Risk Management**:
```json
{
  "riskPercentage": 1,           // 1% risk per trade
  "riskRewardRatio": 2,          // 1:2 risk/reward ratio
  "maxPositionSize": 10000,      // $10,000 max position
  "maxRiskPerTrade": 2,          // 2% max risk per trade
  "stopLossPercentage": 2,       // 2% stop loss
  "takeProfitPercentage": 4      // 4% take profit
}
```

---

### 2. Bollinger Bands Strategy
- **ID**: `BOLLINGER_BANDS`
- **Type**: Mean-reversion strategy
- **Description**: Detects oversold/overbought conditions using Bollinger Bands with RSI confirmation
- **Default Interval**: 1 hour
- **Estimated Win Rate**: 50-60%
- **Risk Profile**: Moderate
- **Best For**: Range-bound markets with clear support/resistance

**Parameters**:
```json
{
  "bollinger": { "period": 20, "standardDev": 2 },
  "rsi": { "period": 14, "overbought": 70, "oversold": 30 }
}
```

**Risk Management**:
```json
{
  "riskPercentage": 1,           // 1% risk per trade
  "riskRewardRatio": 1.5,        // 1:1.5 risk/reward ratio
  "maxPositionSize": 5000,       // $5,000 max position
  "maxRiskPerTrade": 1.5,        // 1.5% max risk per trade
  "stopLossPercentage": 3,       // 3% stop loss
  "takeProfitPercentage": 4.5    // 4.5% take profit
}
```

---

### 3. Hybrid Multi-Strategy (RECOMMENDED FOR BEGINNERS)
- **ID**: `HYBRID`
- **Type**: Conservative multi-strategy consensus
- **Description**: Combines RSI, SMA, MACD, and Bollinger Bands. Trades only when all indicators agree (high-confidence signals)
- **Default Interval**: 4 hours
- **Estimated Win Rate**: 65-75%
- **Risk Profile**: Conservative
- **Best For**: Risk-averse traders wanting maximum confidence before trades

**Parameters**:
```json
{
  "rsi": { "period": 14, "overbought": 70, "oversold": 30 },
  "sma": { "shortPeriod": 20, "longPeriod": 200 },
  "macd": { "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 },
  "bollinger": { "period": 20, "standardDev": 2 }
}
```

**Risk Management**:
```json
{
  "riskPercentage": 0.5,         // 0.5% risk per trade (ultra-conservative)
  "riskRewardRatio": 3,          // 1:3 risk/reward ratio
  "maxPositionSize": 8000,       // $8,000 max position
  "maxRiskPerTrade": 1,          // 1% max risk per trade
  "stopLossPercentage": 1.5,     // 1.5% tight stop loss
  "takeProfitPercentage": 4.5    // 4.5% take profit
}
```

---

## API Endpoints

### 1. Get Available Templates

Retrieve all available bot templates with descriptions and risk profiles.

**Endpoint**: `GET /api/v1/bots/templates`

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

---

### 2. Create Bot with Template (RECOMMENDED)

Create a bot using a pre-configured template. User only needs to select bot type and trading pair.

**Endpoint**: `POST /api/v1/bots/quick-create/{userId}/{exchangeId}`

**Path Parameters**:
- `userId` (required): User ID
- `exchangeId` (required): Exchange ID (e.g., Binance, Kraken)

**Request Body**:
```json
{
  "botType": "HYBRID",           // Required: RSI_SMA_MACD, BOLLINGER_BANDS, or HYBRID
  "symbol": "BTC/USDT",          // Required: Trading pair
  "name": "My Hybrid BTC Bot"    // Optional: Custom name (defaults to "Template Name - Symbol")
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Bot created successfully with template configuration",
  "data": {
    "bot": {
      "id": 15,
      "userId": 3,
      "exchangeId": 1,
      "name": "My Hybrid BTC Bot",
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
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "template": {
      "description": "Conservative strategy combining multiple indicators with high confidence signals (Recommended for beginners)",
      "estimatedWinRate": "65-75%"
    },
    "status": "Bot created and ready to activate"
  }
}
```

**Error Responses**:
- 400: Invalid bot type or missing required fields
- 500: Server error

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/v1/bots/quick-create/3/1 \
  -H "Content-Type: application/json" \
  -d '{
    "botType": "HYBRID",
    "symbol": "BTC/USDT",
    "name": "My Hybrid BTC Bot"
  }'
```

---

### 3. Create Bot with Full Configuration (Advanced)

For advanced users who want to customize all parameters manually.

**Endpoint**: `POST /api/v1/bots/{userId}/{exchangeId}`

**Path Parameters**:
- `userId` (required): User ID
- `exchangeId` (required): Exchange ID

**Request Body**:
```json
{
  "name": "Custom Bot",
  "strategy": "RSI_SMA_MACD",
  "symbol": "ETH/USDT",
  "interval": "4h",
  "parameters": {
    "rsi": { "period": 14, "overbought": 70, "oversold": 30 },
    "sma": { "shortPeriod": 20, "longPeriod": 200 },
    "macd": { "fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9 }
  },
  "riskManagement": {
    "riskPercentage": 1.5,
    "riskRewardRatio": 2.5,
    "maxPositionSize": 15000,
    "maxRiskPerTrade": 2.5,
    "stopLossPercentage": 2.5,
    "takeProfitPercentage": 6
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Bot created successfully",
  "data": {
    "id": 16,
    "userId": 3,
    "exchangeId": 1,
    "name": "Custom Bot",
    ...
  }
}
```

---

### 4. Get All User Bots

Retrieve all bots for a specific user.

**Endpoint**: `GET /api/v1/bots/{userId}`

**Path Parameters**:
- `userId` (required): User ID

**Response**:
```json
{
  "success": true,
  "message": "Bots retrieved successfully",
  "data": [
    {
      "id": 15,
      "name": "My Hybrid BTC Bot",
      "strategy": "HYBRID",
      "symbol": "BTC/USDT",
      "isActive": false,
      ...
    }
  ]
}
```

---

### 5. Get Bot by ID

Retrieve a specific bot with all its configuration.

**Endpoint**: `GET /api/v1/bots/bot/{botId}`

**Path Parameters**:
- `botId` (required): Bot ID

**Response**:
```json
{
  "success": true,
  "message": "Bot retrieved successfully",
  "data": {
    "id": 15,
    "name": "My Hybrid BTC Bot",
    ...
  }
}
```

---

### 6. Activate Bot

Start the bot's trading engine.

**Endpoint**: `POST /api/v1/bots/bot/{botId}/start`

**Path Parameters**:
- `botId` (required): Bot ID

**Response**:
```json
{
  "success": true,
  "message": "Bot started successfully",
  "data": {
    "id": 15,
    "isActive": true,
    ...
  }
}
```

---

### 7. Deactivate Bot

Stop the bot's trading engine.

**Endpoint**: `POST /api/v1/bots/bot/{botId}/stop`

**Path Parameters**:
- `botId` (required): Bot ID

**Response**:
```json
{
  "success": true,
  "message": "Bot stopped successfully",
  "data": {
    "id": 15,
    "isActive": false,
    ...
  }
}
```

---

### 8. Update Bot Configuration

Modify bot settings (only when bot is inactive).

**Endpoint**: `PUT /api/v1/bots/bot/{botId}`

**Path Parameters**:
- `botId` (required): Bot ID

**Request Body** (partial update):
```json
{
  "name": "Updated Bot Name",
  "parameters": { ... },
  "riskManagement": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bot updated successfully",
  "data": { ... }
}
```

---

### 9. Get Bot Performance

Retrieve performance metrics for a bot.

**Endpoint**: `GET /api/v1/bots/bot/{botId}/performance`

**Path Parameters**:
- `botId` (required): Bot ID

**Response**:
```json
{
  "success": true,
  "message": "Performance retrieved successfully",
  "data": {
    "totalTrades": 25,
    "winningTrades": 18,
    "losingTrades": 7,
    "winRate": 72,
    "totalProfit": 1250.50,
    "totalLoss": 320.25,
    "netProfit": 930.25,
    "maxDrawdown": 2.5,
    "sharpeRatio": 1.85,
    "lastTradeAt": "2024-01-15T15:45:00Z",
    "trades": [...]
  }
}
```

---

### 10. Delete Bot

Remove a bot (only when inactive).

**Endpoint**: `DELETE /api/v1/bots/bot/{botId}`

**Path Parameters**:
- `botId` (required): Bot ID

**Response**:
```json
{
  "success": true,
  "message": "Bot deleted successfully"
}
```

---

## Quick Start Flow

### For End Users

1. **View Available Templates**
   ```bash
   GET /api/v1/bots/templates
   ```

2. **Create Bot from Template** (30 seconds)
   ```bash
   POST /api/v1/bots/quick-create/3/1
   {
     "botType": "HYBRID",
     "symbol": "BTC/USDT"
   }
   ```
   → Returns ready-to-use bot with ID 15

3. **Start Trading** (Immediate)
   ```bash
   POST /api/v1/bots/bot/15/start
   ```
   → Bot begins trading with optimal pre-configured parameters

4. **Monitor Performance**
   ```bash
   GET /api/v1/bots/bot/15/performance
   ```

---

## For Frontend Implementation

### Suggested UI Flow

```
1. Welcome Screen
   → Show 3 strategy cards (RSI_SMA_MACD, BOLLINGER_BANDS, HYBRID)
   → Each card shows: name, description, win rate, risk profile

2. Select Strategy
   → User clicks "Start Trading" on chosen strategy

3. Input Form
   Required: Trading pair (e.g., BTC/USDT)
   Optional: Custom bot name
   → User submits form

4. Bot Created Screen
   → Show bot details
   → Display estimated win rate & risk info
   → Offer to "Start Bot Immediately" or "Save for Later"

5. Bot Dashboard
   → Real-time trade updates
   → Performance metrics
   → Start/Stop controls
```

---

## Customization

Users can customize any aspect after bot creation:

1. **Update Parameters** (While Inactive)
   ```
   PUT /api/v1/bots/bot/15
   { "parameters": { ... } }
   ```

2. **Adjust Risk Management** (While Inactive)
   ```
   PUT /api/v1/bots/bot/15
   { "riskManagement": { ... } }
   ```

3. **Change Trading Pair** (While Inactive)
   ```
   PUT /api/v1/bots/bot/15
   { "symbol": "ETH/USDT" }
   ```

---

## Key Features

✅ **One-Click Bot Creation** - Select strategy type + trading pair, get ready-to-trade bot
✅ **Pre-Optimized Defaults** - Each template is tuned for its strategy
✅ **Risk-Aware Profiles** - Conservative to aggressive options
✅ **Performance Tracking** - Win rate, profit/loss, drawdown metrics
✅ **Easy Management** - Start, stop, update, delete operations
✅ **Advanced Customization** - Full parameter control for power users

---

## Notes

- Bots cannot be modified while active (must stop first)
- All trades are persisted with full audit trail
- Performance metrics update every 5 minutes via reconciliation worker
- Estimated win rates are based on historical backtesting (actual results vary)
- Risk management parameters are strictly enforced by the trading engine
