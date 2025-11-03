# Crypto Trading Bot (arwis)

A Node.js/Express backend for a crypto trading bot that integrates with multiple exchanges via CCXT, supports strategy execution (RSI, Bollinger Bands, MACD), secure API key storage, portfolio analytics, and an API for managing users and exchanges.

This repository contains the server application located in the `server/` folder.

## Features

- User authentication (signup/login) with JWT and secure cookies
- Encrypted storage of exchange API keys (RSA)
- Exchange integration through CCXT (supports multiple exchanges)
- Trading strategies:
  - RSI + SMA + MACD collaboration strategy
  - Bollinger Bands strategy
- Risk management utilities (position sizing, stop-loss, take-profit)
- Strategy management (register/start/stop/update)
- Portfolio analytics and distribution across assets
- Trade execution helpers and trade manager
- Monitoring and alerts with logging
- API documentation via Swagger UI

## Quickstart (development)

Requirements:
- Node.js 18+ (or compatible)
- npm
- A PostgreSQL database (for Sequelize models)

1. Install dependencies

```bash
cd server
npm install
```

2. Create a `.env` file in `server/` with the following environment variables (example):

```
PORT=5001
JWT_SECRET=your_jwt_secret
DB_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."  # if used by your workflow
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."    # optional local keys
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
PG_HOST=your_postgres_host
PG_PORT=5432
PG_USER=your_db_user
PG_PASSWORD=your_db_password
PG_DATABASE=your_db_name
PG_CERT=optional_ca_cert_string_if_using_ssl
```

Notes:
- The project uses RSA keys for encrypting/decrypting API keys. Keys are read from environment variables via `server/utils/keys.js`.
- For local testing you can set `DB_PUBLIC_KEY` to a string and the keypair generation will still work for client-side encryption endpoints.

3. Start the server

```bash
# from server/
npm run server
# or
node index.js
```

Server will run at `http://localhost:5001` by default.

## API Documentation (Swagger)

Once the server is running, open the interactive API docs at:

```
http://localhost:5001/api-docs
```

The Swagger UI includes documentation for authentication, users, exchanges, portfolio endpoints, and other public routes. It was generated from JSDoc comments in route files and model schemas.

## Important routes

- Authentication
  - POST /api/v1/auth/signup — Create a new user
  - POST /api/v1/auth/login — Login (sets cookie `access_token`)

- Users
  - GET /api/v1/users — Get all users
  - GET /api/v1/users/:id — Get a user
  - POST /api/v1/users/:id — Update a user
  - DELETE /api/v1/users/:id — Delete a user

- Exchanges (user-specific)
  - POST /api/v1/exchange/:id — Create exchange credentials (encrypted)
  - GET /api/v1/exchange/:id — Get all exchanges for a user
  - GET /api/v1/exchange/:userId/:exchangeId — Get exchange by id
  - DELETE /api/v1/exchange/:id — Delete exchange

- Portfolio
  - GET /api/v1/portfolio/:id/:exchangeId/value — Get portfolio value for an exchange
  - GET /api/v1/portfolio/:id/:exchangeId/distribution — Get portfolio distribution
  - GET /api/v1/portfolio/:id/:exchangeId/history — (stub) Get portfolio value history

- Trade
  - POST /api/v1/trade/:id/:exchangeId — Create a trade order (controller leverages strategies)

- Misc
  - POST /api/client-public-key — Returns server-generated public key for client to encrypt API keys
  - POST /api/encrypt-api-key — Endpoint to receive client-encrypted keys and store them encrypted in DB

## How strategies are used

Strategies live in `server/utils/strategies/`. Example usage flow:
- Strategy code calculates signals from historical OHLCV data
- `TradeController` can call strategy functions and then `executeTradeWithRisk` (trade manager) to perform orders
- StrategyManager (functional) helps register/start/stop strategies and tracks performance

## Security & Keys

- API keys are never stored in plaintext. They are encrypted using RSA and stored in the database.
- The server maintains a generated client keypair endpoint for front-end encryption flows (`/api/client-public-key`).
- JWT tokens are used for session authentication and are sent as `access_token` cookie.

## Database

The server uses Sequelize with Postgres. DB configuration is read in `server/db.js` via environment variables.

Models are found in `server/models/`:
- `User` (userModel.js)
- `Exchange` (exchangeDetails.js)

To initialize the DB, run the server; Sequelize `sync` is called with `alter: true` in `connectDB()`.

## Tests

A small test suite exists using Mocha/Chai and Supertest under `server/test/`.

Run tests:

```bash
cd server
npm test
```

## Development notes & next steps

- The portfolio history endpoint is a stub and expects a DB-backed time series (you can enable `startSetPortfolioValueInDB` to push periodic snapshots into users collection).
- Strategy execution is synchronous in many places; for production consider moving strategies and execution to background workers or a job queue.
- Add rate-limiters, retry/backoff for exchange calls, and stricter validation on route inputs.
- Improve unit tests covering strategies and trade flows.

## Files & Structure Overview

```
server/
├─ controllers/         # Route handlers
├─ models/              # Sequelize models
├─ routes/              # Express routes
├─ utils/               # Helpers, strategies, monitoring, DB key management
├─ middleware/          # Error handling, session middleware
├─ swagger.js           # Swagger config
├─ index.js             # App entrypoint
```

## Troubleshooting

- If you see issues connecting to Postgres, double-check `PG_*` environment variables and SSL configuration in `server/db.js`.
- For CCXT exchange calls, ensure API keys are valid and the exchange name matches a CCXT id (e.g., `binance`, `binanceus`, `kraken`, etc.).
- If Swagger docs don't show updated endpoints, restart the server after any route JSDoc changes.

## Contact

If you need help extending the strategies, wiring the front-end encryption flow, or deploying the bot safely, open an issue or contact the maintainer.

---
