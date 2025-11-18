# Phase 1: Critical Production Features - Implementation Guide

## Overview
Phase 1 implements the critical features needed before live trading:
- ✅ Live trade execution with order tracking
- ✅ Trade history and reconciliation
- ✅ Error monitoring (Sentry)
- ✅ Health checks and resilience
- ✅ Retry logic and circuit breaker

**Status:** COMPLETE - Ready for integration testing

---

## What Was Implemented

### 1. Trade Model (`models/Trade.js`)
- Full order tracking with all required fields
- Status tracking: pending, open, filled, partially_filled, cancelled, failed
- P&L calculation fields
- Exchange response storage for audit trail

### 2. Trade Execution (`utils/trade/trade-manager.js`)
**Features:**
- Retry logic with exponential backoff
- Circuit breaker pattern for exchange failures
- Trade persistence to database
- Risk management validation
- Proper error handling

**How it works:**
```javascript
const result = await executeTradeWithRisk(
    exchangeClient,
    {
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        price: 45000
    },
    {
        accountBalance: 10000,
        riskPercentage: 1,
        riskRewardRatio: 2
    },
    {
        userId: 123,
        strategyId: 'rsi-001'
    }
);
```

### 3. Trade Reconciliation (`utils/trade/trade-reconciliation.js`)
**Features:**
- Detects partial fills and cancellations
- Updates trade status every 5 minutes
- Calculates realized P&L
- Generates trade statistics

**Key Functions:**
- `reconcileTrades()` - Sync with exchange
- `updateTradeProfit()` - Calculate P&L
- `getTradeStatistics()` - Performance metrics

### 4. Resilience (`utils/resilience/retryHandler.js`)
**Features:**
- `retryWithBackoff()` - Exponential backoff with jitter
- `CircuitBreaker` class - Prevents cascading failures
- Per-exchange circuit breakers
- Configurable retry strategies

**Usage:**
```javascript
import { retryWithBackoff, CircuitBreaker } from './retryHandler.js';

// With retry
await retryWithBackoff(
    () => exchange.createOrder(...),
    {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => error.code === 'ECONNREFUSED'
    }
);

// With circuit breaker
const breaker = new CircuitBreaker({ 
    failureThreshold: 5,
    timeout: 60000 
});
await breaker.execute(() => exchange.fetchBalance());
```

### 5. Monitoring & Errors (Sentry)
- Error tracking and reporting
- Health check endpoint (`GET /health`)
- Automatic error capture
- Environment tracking

### 6. Updated TradeController
- Now uses StrategyManager
- Supports both strategy-based and manual trades
- Returns full trade data with signals
- Proper error handling

### 7. Trade Reconciliation Worker
- Runs every 5 minutes
- Syncs all user trades with exchange
- Logs reconciliation events
- Handles multi-user/multi-exchange scenarios

---

## Installation & Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

This installs:
- `@sentry/node` - Error tracking
- All existing dependencies

### 2. Environment Variables
Update `.env` with:
```env
# Existing vars
PG_HOST=...
PG_DATABASE=...
JWT_SECRET=...

# New for Phase 1
SENTRY_DSN=https://your-key@sentry.io/your-project  # Optional
NODE_ENV=production
```

Get Sentry DSN:
1. Create free account at https://sentry.io
2. Create new project (select Node.js)
3. Copy DSN from settings

### 3. Database Sync
Trade model will auto-create on first run:
```bash
npm run server  # Sequelize syncs automatically
```

---

## Testing Phase 1

### 1. Test Health Check
```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "database": "connected",
  "memory": { "heapUsed": "45MB", "heapTotal": "256MB" }
}
```

### 2. Test Trade Execution
```bash
curl -X POST http://localhost:5001/api/v1/trade/1/binance \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "buy",
    "type": "market",
    "price": 45000,
    "riskPercentage": 1,
    "riskRewardRatio": 2
  }'
```

Expected response includes:
```json
{
  "success": true,
  "data": {
    "trade": {
      "status": "success",
      "tradeRecord": { "id": 1, "exchangeOrderId": "12345", ... },
      "positionSize": 0.1,
      "entryPrice": 45000,
      "stopLoss": 44100,
      "takeProfit": 45900
    }
  }
}
```

### 3. Test Strategy-Based Trade
```bash
curl -X POST http://localhost:5001/api/v1/trade/1/binance \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "strategyId": "rsi-001",
    "riskPercentage": 1
  }'
```

### 4. Database Verification
```sql
-- Check trade was saved
SELECT * FROM Trade WHERE userId = 1 ORDER BY createdAt DESC;

-- Check order status
SELECT exchangeOrderId, status, executedQty, profitLoss FROM Trade WHERE id = 1;
```

### 5. Test Reconciliation (Manually)
```javascript
import { reconcileTrades } from './utils/trade/trade-reconciliation.js';

const result = await reconcileTrades(exchangeClient, userId);
console.log(`Reconciled ${result} trades`);
```

---

## Key Features & Behaviors

### Retry Logic
- Exponential backoff: 1s → 2s → 4s (configurable)
- Jitter to prevent thundering herd
- Smart retry: only retries network errors
- Gives up on invalid orders

### Circuit Breaker
- State machine: CLOSED → OPEN → HALF_OPEN → CLOSED
- Tracks failure count
- Auto-resets after timeout
- Per-exchange breakers (Binance, Kraken, etc.)

### Trade Status Lifecycle
```
pending → open → [partially_filled] → filled
         ↓
       cancelled/failed
```

### Reconciliation Interval
- Runs every 5 minutes
- Checks all open trades
- Updates status and execution qty
- Calculates P&L when position closes

### Error Handling
- All errors captured to Sentry (if DSN provided)
- Failed trades saved with error message
- Uncaught exceptions logged
- Health endpoint reports degraded status

---

## Monitoring & Debugging

### 1. Check Server Logs
```bash
# In production, stream logs
tail -f logs/server.log

# Look for reconciliation logs
grep "Trade Reconciliation" logs/server.log

# Look for circuit breaker state changes
grep "Circuit Breaker" logs/server.log
```

### 2. Monitor Sentry Dashboard
https://sentry.io → Your Project
- Error rates
- Failed trades
- Network timeouts
- Database issues

### 3. Check Trade Database
```sql
-- Recent trades
SELECT * FROM Trade ORDER BY createdAt DESC LIMIT 10;

-- Failed trades
SELECT * FROM Trade WHERE status = 'failed';

-- Open positions
SELECT symbol, SUM(executedQty) as position FROM Trade 
WHERE status IN ('open', 'partially_filled') 
GROUP BY symbol;

-- Daily P&L
SELECT DATE(filledAt), SUM(profitLoss) as dailyPnL 
FROM Trade 
WHERE status = 'filled' AND profitLoss IS NOT NULL
GROUP BY DATE(filledAt);
```

---

## Common Issues & Solutions

### Issue 1: "Trade model not found"
**Cause:** Trade model not imported in db.js
**Fix:**
```javascript
// db.js
import Trade from './models/Trade.js';
```

### Issue 2: "Circuit breaker is OPEN"
**Cause:** Exchange is experiencing issues
**Solution:**
- Wait for timeout (default 60s)
- Check exchange status
- Verify API keys
- Check network connectivity

### Issue 3: "Trades not reconciling"
**Cause:** Worker not started or async issues
**Fix:**
```javascript
// index.js - ensure worker starts
startTradeReconciliationWorker();

// Check logs for errors
grep "Trade Reconciliation" logs/server.log
```

### Issue 4: Sentry not capturing errors
**Cause:** SENTRY_DSN not set
**Fix:**
```bash
# Set in .env
SENTRY_DSN=https://your-key@your-project.ingest.sentry.io/id
```

---

## Performance Considerations

### Database
- Trade table can grow quickly (1000s per day)
- Add indexes on userId, strategyId, createdAt
- Archive old trades to separate table

### Reconciliation
- Fetches all user trades every 5 minutes
- Use pagination if 1000+ trades per user
- Consider separate workers per exchange

### Retry Logic
- Exponential backoff prevents API rate limits
- Max retry delay capped at 30s
- Jitter prevents coordinated retries

---

## Next Steps (Phase 2)

1. **Rate Limiting** - Per-exchange rate limiters
2. **Deployment** - Docker, CI/CD, systemd
3. **Testing** - Unit & integration tests
4. **Documentation** - API docs, examples
5. **Optimization** - Parameter tuning, walk-forward analysis

---

## Files Changed in Phase 1

**New Files:**
- `models/Trade.js` - Order tracking model
- `utils/resilience/retryHandler.js` - Retry & circuit breaker
- `utils/trade/trade-reconciliation.js` - Reconciliation logic
- `utils/trade/trade-reconciliation-worker.js` - Background worker

**Modified Files:**
- `utils/trade/trade-manager.js` - Added order tracking
- `controllers/Trade/tradeController.js` - Uses StrategyManager
- `index.js` - Added Sentry, health check, workers
- `package.json` - Added Sentry dependency
- `.env.example` - Added Sentry & trading config

---

## Support

For issues:
1. Check logs: `grep "ERROR\|error" logs/server.log`
2. Review Sentry dashboard
3. Verify database tables exist
4. Check .env variables are set
5. Test health endpoint

**Emergency:** Comment out Sentry in index.js to remove dependency:
```javascript
// if (process.env.SENTRY_DSN) {
//   Sentry.init({...});
//   app.use(Sentry.Handlers.requestHandler());
// }
```
