# Trade API - Swagger Documentation Guide

## Overview

The Trade API endpoints are fully documented with Swagger/OpenAPI 3.0 specifications. Access the interactive API documentation at:

```
http://localhost:5001/api-docs
```

## Endpoints

### 1. Execute Trade Order
**POST** `/api/v1/trade/{id}/{exchangeId}`

Create and execute a new trade order with automatic risk management.

#### Features:
- ✅ Manual trade execution (with explicit side)
- ✅ Strategy-based trade execution (with strategyId)
- ✅ Automatic position sizing based on risk
- ✅ Stop-loss and take-profit calculation
- ✅ Trade persistence to database
- ✅ Automatic reconciliation every 5 minutes
- ✅ Full error handling with Sentry integration

#### Request Examples

**Manual Buy Order:**
```json
POST /api/v1/trade/1/binance

{
  "symbol": "BTC/USDT",
  "side": "buy",
  "type": "market",
  "riskPercentage": 1,
  "riskRewardRatio": 2
}
```

**Strategy-Based Order:**
```json
POST /api/v1/trade/1/binance

{
  "symbol": "BTC/USDT",
  "strategyId": "rsi-001",
  "riskPercentage": 1
}
```

**Limit Order:**
```json
POST /api/v1/trade/1/binance

{
  "symbol": "ETH/USDT",
  "side": "buy",
  "type": "limit",
  "price": 2500,
  "riskPercentage": 1.5
}
```

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` (path) | string | ✅ | - | User ID |
| `exchangeId` (path) | string | ✅ | - | Exchange ID (binance, kraken, etc.) |
| `symbol` | string | ✅* | - | Trading pair (required for manual, optional for strategy) |
| `side` | string | ✅* | - | 'buy' or 'sell' (required for manual, ignored if strategyId) |
| `strategyId` | string | ❌ | - | Strategy ID to use (if provided, side is ignored) |
| `type` | string | ❌ | market | 'market' or 'limit' |
| `price` | number | ❌* | - | Limit price (required if type='limit') |
| `riskPercentage` | number | ❌ | 1 | Risk per trade (1-5%) |
| `riskRewardRatio` | number | ❌ | 2 | Ratio for SL/TP calculation |

*Either `side` (manual) or `strategyId` (strategy) must be provided

#### Response Example

```json
{
  "success": true,
  "message": "Order executed successfully",
  "data": {
    "trade": {
      "status": "success",
      "tradeRecord": {
        "id": 1,
        "exchangeOrderId": "12345678",
        "userId": 1,
        "strategyId": "rsi-001",
        "symbol": "BTC/USDT",
        "side": "buy",
        "status": "filled",
        "quantity": 0.05,
        "executedQty": 0.05,
        "price": 45000,
        "avgExecutedPrice": 45000,
        "fee": 22.50,
        "stopLoss": 44100,
        "takeProfit": 45900,
        "profitLoss": null,
        "createdAt": "2025-11-20T10:30:00.000Z",
        "filledAt": "2025-11-20T10:30:05.000Z"
      },
      "positionSize": 0.05,
      "entryPrice": 45000,
      "stopLoss": 44100,
      "takeProfit": 45900
    },
    "signal": {
      "action": "buy",
      "symbol": "BTC/USDT",
      "price": 45000,
      "reason": "STRONG BUY: Above SMA200, Golden Cross, RSI Oversold, MACD Crossover Up"
    }
  }
}
```

#### Status Codes

| Code | Description |
|------|-------------|
| 200 | Trade executed successfully |
| 400 | Invalid request or validation failed |
| 404 | Strategy or exchange not found |
| 500 | Trade execution failed |

#### Error Examples

**Missing Parameters:**
```json
{
  "success": false,
  "message": "User ID and Exchange ID are required"
}
```

**Strategy Not Found:**
```json
{
  "success": false,
  "message": "Strategy rsi-001 not found"
}
```

**No Strategy Signal:**
```json
{
  "success": true,
  "message": "No trading signals from strategy",
  "data": {
    "signal": null
  }
}
```

---

### 2. Get Trade History
**GET** `/api/v1/trade/{userId}/{exchangeId}`

Retrieve order history from exchange for a user.

#### Request Example

```bash
GET /api/v1/trade/1/binance?symbol=BTC/USDT
```

#### Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` (path) | string | ✅ | - | User ID |
| `exchangeId` (path) | string | ✅ | - | Exchange ID |
| `symbol` (query) | string | ❌ | - | Filter by trading pair |

#### Response Example

```json
{
  "success": true,
  "message": "Trade history retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "12345678",
        "symbol": "BTC/USDT",
        "type": "market",
        "side": "buy",
        "price": 45000,
        "amount": 0.05,
        "filled": 0.05,
        "remaining": 0,
        "status": "closed",
        "timestamp": 1699776000000,
        "datetime": "2025-11-20T10:30:00.000Z",
        "average": 45000,
        "cost": 2250,
        "fee": {
          "currency": "BNB",
          "cost": 0.00225,
          "rate": 0.001
        }
      },
      {
        "id": "12345679",
        "symbol": "BTC/USDT",
        "type": "limit",
        "side": "sell",
        "price": 46000,
        "amount": 0.05,
        "filled": 0.05,
        "remaining": 0,
        "status": "closed",
        "timestamp": 1699776300000,
        "datetime": "2025-11-20T10:35:00.000Z",
        "average": 45950,
        "cost": 2297.5,
        "fee": {
          "currency": "BNB",
          "cost": 0.002297,
          "rate": 0.001
        }
      }
    ]
  }
}
```

---

## Data Models

### Trade Schema

The Trade schema includes all fields needed for order tracking and performance analysis:

```json
{
  "id": 1,
  "exchangeOrderId": "12345678",
  "userId": 1,
  "strategyId": "rsi-001",
  "symbol": "BTC/USDT",
  "side": "buy",
  "status": "filled",
  "quantity": 0.05,
  "executedQty": 0.05,
  "price": 45000,
  "avgExecutedPrice": 45000,
  "cost": 2250,
  "fee": 2.25,
  "feeCurrency": "USDT",
  "stopLoss": 44100,
  "takeProfit": 45900,
  "riskPercentage": 1,
  "riskRewardRatio": 2,
  "profitLoss": 150.50,
  "profitLossPercent": 6.67,
  "createdAt": "2025-11-20T10:30:00.000Z",
  "filledAt": "2025-11-20T10:30:05.000Z",
  "closedAt": "2025-11-20T10:35:00.000Z"
}
```

### Trade Status Lifecycle

```
pending → open → [partially_filled] → filled
         ↓
       cancelled/failed
```

**Status Meanings:**
- **pending**: Trade created, awaiting execution
- **open**: Trade sent to exchange, waiting to fill
- **partially_filled**: Some quantity filled, rest pending
- **filled**: All quantity executed
- **cancelled**: User or exchange cancelled the order
- **failed**: Order execution failed

---

## Usage Patterns

### Pattern 1: Manual Trading
```bash
# Buy 0.05 BTC at market price with 1% risk
curl -X POST http://localhost:5001/api/v1/trade/1/binance \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "buy",
    "type": "market",
    "riskPercentage": 1
  }'
```

### Pattern 2: Strategy-Based Trading
```bash
# Execute RSI strategy signal
curl -X POST http://localhost:5001/api/v1/trade/1/binance \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "strategyId": "rsi-001",
    "riskPercentage": 1
  }'
```

### Pattern 3: Custom Risk Management
```bash
# Trade with custom risk parameters
curl -X POST http://localhost:5001/api/v1/trade/1/binance \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ETH/USDT",
    "side": "buy",
    "riskPercentage": 2,
    "riskRewardRatio": 3,
    "maxPositionSize": 1.5
  }'
```

### Pattern 4: Retrieve History
```bash
# Get all trades for a symbol
curl "http://localhost:5001/api/v1/trade/1/binance?symbol=BTC/USDT"

# Get all trades (no filter)
curl "http://localhost:5001/api/v1/trade/1/binance"
```

---

## Best Practices

### 1. Risk Management
- Always set `riskPercentage` appropriately (1-2% recommended)
- Use `riskRewardRatio` of 2:1 or higher
- Never exceed `maxRiskPerTrade` per day

### 2. Strategy Parameters
- Test strategies via backtesting before live trading
- Start with small position sizes (0.5-1% of account)
- Monitor strategy performance over time

### 3. Error Handling
- Always check the `success` flag
- Log all trades for audit trail
- Set up Sentry monitoring for critical errors

### 4. Monitoring
- Check health endpoint regularly: `GET /health`
- Monitor trade execution in database
- Review reconciliation logs every 5 minutes

---

## Troubleshooting

### Issue: "No trading signals from strategy"
**Cause:** Strategy conditions not met  
**Solution:**
- Verify strategy is registered
- Check market conditions match strategy logic
- Try manual trade instead

### Issue: "Strategy not found"
**Cause:** strategyId doesn't exist  
**Solution:**
- Register strategy first via Strategy API
- Verify strategyId spelling

### Issue: "User ID and Exchange ID are required"
**Cause:** Missing path parameters  
**Solution:**
- Ensure both `:id` and `:exchangeId` in URL
- Format: `/api/v1/trade/{userId}/{exchangeId}`

### Issue: Trade execution failed
**Cause:** Exchange API error  
**Solution:**
- Check API key permissions
- Verify exchange connectivity
- Check balance for margin/collateral
- Review Sentry for detailed error

---

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function executeTrade() {
  try {
    const response = await axios.post(
      'http://localhost:5001/api/v1/trade/1/binance',
      {
        symbol: 'BTC/USDT',
        strategyId: 'rsi-001',
        riskPercentage: 1
      }
    );
    
    console.log('Trade executed:', response.data);
  } catch (error) {
    console.error('Trade failed:', error.response.data);
  }
}

executeTrade();
```

### Python
```python
import requests

def execute_trade():
    url = 'http://localhost:5001/api/v1/trade/1/binance'
    payload = {
        'symbol': 'BTC/USDT',
        'strategyId': 'rsi-001',
        'riskPercentage': 1
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print('Trade executed:', response.json())
    except requests.exceptions.RequestException as e:
        print('Trade failed:', str(e))

execute_trade()
```

### cURL
```bash
curl -X POST 'http://localhost:5001/api/v1/trade/1/binance' \
  -H 'Content-Type: application/json' \
  -d '{
    "symbol": "BTC/USDT",
    "strategyId": "rsi-001",
    "riskPercentage": 1
  }' \
  -w '\nHTTP Status: %{http_code}\n'
```

---

## See Also

- [Strategy API Documentation](./STRATEGY_API.md)
- [Backtesting Documentation](./BACKTESTING_API.md)
- [Phase 1 Implementation Guide](./PHASE_1_IMPLEMENTATION.md)
- [Swagger UI](http://localhost:5001/api-docs)
