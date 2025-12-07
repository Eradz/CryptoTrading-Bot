# Bot Stop Functions Implementation

## Overview
Two new functions have been implemented to cleanly stop trading bots and cancel open trades:

1. **stopAllBotsController** - Stop all active bots globally
2. **stopIndividualBotController** - Stop a specific bot

## Functions

### 1. stopAllBotsController

**Location:** `controllers/bot/BotController.js`

**Purpose:** Stops all active bots for a user and cancels all their open trades

**Behavior:**
- Queries all active bots for the user (`Bot.findAll({isActive: true})`)
- For each bot:
  - Retrieves all open trades (`strategyId=botId`, status in ['open', 'pending', 'partially_filled'])
  - Calls exchange API to cancel each order (`exchange.cancelOrder()`)
  - Updates trade status to 'cancelled' with timestamp and notes
  - Stops the TradingEngine instance
  - Updates bot: `isActive=false`, sets `lastError`, records `stoppedAt`
  - Updates performance: decrements `openTrades` counter
- Returns summary with count of stopped bots and cancelled trades

**Response:**
```json
{
  "success": true,
  "message": "All bots stopped successfully",
  "data": {
    "botsStoppedCount": 3,
    "tradesCancelledCount": 7,
    "details": [
      {
        "botId": "1",
        "botName": "My BTC Bot",
        "tradesCancelled": 2,
        "status": "stopped"
      }
    ],
    "summary": "Stopped 3 bot(s) and cancelled 7 trade(s)"
  }
}
```

**Error Handling:**
- Continues processing other bots/trades even if individual ones fail
- Logs errors but returns partial success
- Returns 400 if userId not provided

---

### 2. stopIndividualBotController

**Location:** `controllers/bot/BotController.js`

**Purpose:** Stops a specific bot and cancels all its open trades

**Behavior:**
- Validates bot ownership (must belong to authenticated user)
- Retrieves bot by ID
- If already inactive, returns success response
- Gets all open trades for the bot (`strategyId=botId`)
- For each open trade:
  - Calls exchange API to cancel order
  - Updates trade status to 'cancelled' with timestamp and notes
- Stops the TradingEngine instance
- Updates bot: `isActive=false`, sets `lastError`, records `stoppedAt`
- Updates performance: decrements `openTrades` counter
- Returns detailed response with list of cancelled trades

**Response:**
```json
{
  "success": true,
  "message": "Bot stopped successfully",
  "data": {
    "botId": "1",
    "botName": "My BTC Bot",
    "status": "stopped",
    "tradesCancelledCount": 2,
    "cancelledTrades": [
      {
        "tradeId": 123,
        "exchangeOrderId": "12345678",
        "symbol": "BTC/USDT",
        "side": "buy",
        "quantity": 0.5
      }
    ],
    "summary": "Stopped bot \"My BTC Bot\" and cancelled 2 open trade(s)"
  }
}
```

**Authorization:**
- Returns 403 if bot doesn't belong to user
- Returns 404 if bot not found
- Returns 400 if botId or userId not provided

---

## API Routes

### Stop All Bots
```
POST /api/v1/bots/{userId}/stop-all
```

**Parameters:**
- `userId` (path, required): User ID

**Security:** Cookie-based JWT authentication

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/bots/1/stop-all \
  -H "Cookie: jwt=<token>"
```

---

### Stop Individual Bot
```
POST /api/v1/bots/{botId}/{userId}/stop
```

**Parameters:**
- `botId` (path, required): Bot ID to stop
- `userId` (path, required): User ID (must own the bot)

**Security:** Cookie-based JWT authentication

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/bots/1/5/stop \
  -H "Cookie: jwt=<token>"
```

---

## Implementation Details

### Trade Cancellation Process
1. **Exchange Cancel:** Call `exchange.cancelOrder(exchangeOrderId, symbol)` via CCXT
2. **Status Update:** Set trade status to 'cancelled' with timestamp
3. **Notes:** Append cancellation timestamp and method to trade notes
4. **Error Handling:** Continue with other trades if one fails

### Bot Status Update
1. Set `isActive = false`
2. Set `lastError = 'Bot stopped by user'`
3. Record `stoppedAt = new Date()`
4. Update performance metrics (decrement `openTrades`)

### TradingEngine Cleanup
1. Call `engine.stop()` to halt polling and processing
2. Remove from `activeBots` Map
3. Log cleanup completion

### Performance Tracking
- **Open Trades:** Decremented by count of cancelled trades
- **Trade History:** Cancelled trades NOT counted toward totalTrades (they didn't complete)
- **Metrics:** winRate and netProfit unchanged (no profit/loss for cancelled trades)

---

## Error Scenarios & Handling

| Scenario | Handling |
|----------|----------|
| Exchange API fails | Logs error, continues with other trades |
| TradingEngine stop fails | Logs error, continues with bot status update |
| User unauthorized | Returns 403 Forbidden |
| Bot not found | Returns 404 Not Found |
| No open trades | Returns success with 0 cancelled count |
| Already inactive | Returns success immediately |

---

## Database Updates

### Trade Table
```sql
UPDATE Trade 
SET status = 'cancelled', 
    closedAt = NOW(), 
    notes = CONCAT(notes, '\nCancelled via stop function at ', NOW())
WHERE strategyId = ? AND status IN ('open', 'pending', 'partially_filled')
```

### Bot Table
```sql
UPDATE Bot 
SET isActive = false, 
    lastError = 'Bot stopped by user',
    stoppedAt = NOW(),
    performance = jsonb_set(performance, '{openTrades}', ?)
WHERE id = ?
```

---

## Logging

All operations are logged with `[stopAllBots]` or `[stopIndividualBot]` prefixes:

```
[stopAllBots] Cancelled exchange order 12345678 for bot 1
[stopAllBots] Stopped trading engine for bot 1
[stopAllBots] Stopped bot 1 (My BTC Bot), cancelled 2 trades
[stopIndividualBot] Stopped bot 1, cancelled 2 trades
```

---

## Testing Recommendations

1. **Test stopAllBots with multiple active bots**
   - Create 2-3 active bots with open trades
   - Call stopAllBots
   - Verify all bots are marked inactive
   - Verify all trades are cancelled with timestamps

2. **Test stopIndividualBot**
   - Create active bot with multiple open trades
   - Call stopIndividualBot
   - Verify bot is inactive
   - Verify specific trades are cancelled
   - Verify bot is excluded from global operations

3. **Test authorization**
   - Try to stop bot owned by different user
   - Verify 403 Forbidden response

4. **Test already inactive bot**
   - Try to stop already inactive bot
   - Verify success response with 0 cancelled trades

5. **Test exchange API failures**
   - Mock exchange.cancelOrder to fail
   - Verify graceful handling and partial success

6. **Test performance metrics**
   - Verify openTrades decremented correctly
   - Verify cancelled trades NOT counted in totalTrades
   - Verify winRate unchanged

---

## Integration Points

- **BotController.js:** New functions exported for route handling
- **BotRoute.js:** Two new POST routes with Swagger documentation
- **Trade Model:** Used to query and update trade statuses
- **Bot Model:** Used to query, update, and persist bot status changes
- **AuthenticateExchange:** Called to get exchange instance for order cancellation
- **TradingEngine:** Stopped via engine.stop() method
- **activeBots Map:** Used to retrieve and cleanup engine instances

---

## Future Enhancements

1. **Partial Stop:** Option to stop only certain strategies (RSI, BOLLINGER, etc.)
2. **Notification:** Send notification to user when bots stopped
3. **Stop with Resume:** Graceful stop that allows resuming
4. **Trade Timeout:** Automatically stop if open trades exceed time limit
5. **Risk-based Stop:** Auto-stop if drawdown exceeds threshold
6. **Schedule Stop:** Schedule bot stop at specific times

---

## Backward Compatibility

- No changes to existing functions
- New exports added to BotController
- New routes added to BotRoute
- No modifications to models or database schema required
- Fully compatible with existing bot creation and management flows
