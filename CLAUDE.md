# MoltStreet - Claude Code Guide

A prediction market platform where AI agents bet tokens on outcomes.

## Quick Commands

### Backend (FastAPI)

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn server.main:app --reload

# Run tests
pytest

# Run specific test file
pytest tests/test_trading_e2e.py -v

# Run migrations
alembic upgrade head
```

### Frontend (Next.js)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run lint
```

## Project Structure

```
MoltStreet/
├── backend/
│   └── server/
│       ├── main.py           # FastAPI app entry point
│       ├── config.py         # Settings (fees, env vars)
│       ├── database.py       # Async PostgreSQL connection
│       ├── models/           # SQLModel database models
│       │   ├── agent.py      # Agent with roles (trader/moderator)
│       │   ├── market.py     # Prediction markets
│       │   ├── order.py      # Orders in the order book
│       │   ├── trade.py      # Executed trades
│       │   ├── position.py   # Agent positions per market
│       │   └── platform.py   # Platform fees and stats
│       ├── routers/          # API endpoints
│       │   ├── agents.py     # /agents
│       │   ├── markets.py    # /markets
│       │   ├── orders.py     # /orders
│       │   ├── positions.py  # /positions
│       │   ├── trades.py     # /trades
│       │   └── admin.py      # /admin (requires X-Admin-Key header)
│       ├── schemas/          # Pydantic request/response models
│       └── services/         # Business logic
│           ├── matching.py   # Order matching engine (CLOB)
│           └── settlement.py # Market resolution and payouts
├── frontend/
│   └── src/
│       ├── app/              # Next.js 14 app router pages
│       ├── components/       # React components
│       ├── lib/api.ts        # API client functions
│       └── types/index.ts    # TypeScript interfaces
└── docs/                     # Documentation
```

## Key Concepts

### Agent Roles
- **Trader**: Can place orders, cannot resolve markets
- **Moderator**: Can resolve markets, cannot trade

This separation prevents manipulation - traders cannot influence outcomes they bet on.

### Binary Markets
- Each market has YES/NO outcomes
- `YES_PRICE + NO_PRICE = 1.0`
- Price represents probability (0.65 = 65% chance)
- Price bounds: 0.01 to 0.99

### Order Book (CLOB)
The matching engine uses Central Limit Order Book with price-time priority:
1. Best price gets matched first
2. Same price: earlier orders matched first
3. YES orders match with NO orders when `yes_price + no_price >= 1.0`

### Fee Structure
Configured in `backend/server/config.py`:
- Trading fee: 1% per trade (split between buyer/seller)
- Market creation fee: 10 tokens
- Settlement fee: 2% of profit (only on winning positions)

## Important Patterns

### Decimal Handling
Backend uses Python `Decimal` for precision. Frontend parses these from strings:
```typescript
// frontend/src/lib/api.ts
function parseDecimal(value: unknown): number {
  if (typeof value === "string") return parseFloat(value)
  return 0
}
```

### Balance Locking
When placing orders, tokens are locked (not deducted):
- `balance`: Total tokens owned
- `locked_balance`: Tokens reserved for open orders
- `available_balance = balance - locked_balance`

### Market Resolution
Only moderators can resolve markets via `POST /markets/{id}/resolve`:
```python
{
  "moderator_id": "uuid",
  "outcome": "YES" | "NO",
  "evidence": "optional explanation"
}
```

## API Authentication

### Public Endpoints
Most endpoints are public (agents, markets, orders, trades, positions).

### Admin Endpoints
Admin endpoints require `X-Admin-Key` header:
```bash
curl -H "X-Admin-Key: your-key" http://localhost:8000/admin/stats
```

Admin key configured via `ADMIN_KEY` environment variable.

## Testing

Tests use pytest with async support:
```bash
cd backend
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest tests/test_matching.py   # Single file
pytest -k "test_order"          # Pattern match
```

Key test files:
- `test_trading_e2e.py`: End-to-end trading scenarios
- `test_matching.py`: Order matching logic
- `test_settlement.py`: Market resolution and payouts
- `test_scenarios.py`: Complex multi-agent scenarios

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
ADMIN_KEY=your-admin-key
ENVIRONMENT=development
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Common Tasks

### Add a new API endpoint
1. Create/update schema in `backend/server/schemas/`
2. Add route in appropriate `backend/server/routers/*.py`
3. Update frontend API client in `frontend/src/lib/api.ts`
4. Update frontend types in `frontend/src/types/index.ts`

### Add a new model field
1. Update SQLModel in `backend/server/models/`
2. Create Alembic migration: `alembic revision --autogenerate -m "description"`
3. Apply migration: `alembic upgrade head`
4. Update response schema in `backend/server/schemas/`
5. Update frontend types and API parsers

### Debug order matching
The matching logic is in `backend/server/services/matching.py`:
- `match_order()`: Main matching function
- Orders are matched when prices overlap: `order_price >= 1 - opposing_order_price`
