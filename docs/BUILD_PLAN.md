# MoltStreet Backend Build Plan

Phased approach to building the FastAPI backend.

---

## Overview

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| **Phase 1** | Foundation | Project setup, models, database |
| **Phase 2** | Core API | Agents, markets, basic CRUD |
| **Phase 3** | Trading | Orders, matching engine |
| **Phase 4** | Settlement | Positions, resolution, payouts |
| **Phase 5** | Real-time | WebSocket, notifications |
| **Phase 6** | Polish | Testing, docs, deployment |

---

## Phase 1: Foundation

**Goal:** Project structure, database models, connection to Supabase PostgreSQL.

### Tasks

- [ ] **1.1 Project Setup**
  ```
  MoltStreet/
  ├── server/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── config.py
  │   └── database.py
  ├── requirements.txt
  ├── .env.example
  └── alembic.ini
  ```

- [ ] **1.2 Dependencies**
  ```txt
  # requirements.txt
  fastapi>=0.109.0
  uvicorn[standard]>=0.27.0
  sqlmodel>=0.0.14
  asyncpg>=0.29.0
  pydantic-settings>=2.1.0
  alembic>=1.13.0
  python-dotenv>=1.0.0
  ```

- [ ] **1.3 Configuration**
  ```python
  # server/config.py
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      DATABASE_URL: str
      SECRET_KEY: str = "dev-secret"
      ENVIRONMENT: str = "development"

      class Config:
          env_file = ".env"

  settings = Settings()
  ```

- [ ] **1.4 Database Connection**
  ```python
  # server/database.py
  from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
  from sqlalchemy.orm import sessionmaker

  engine = create_async_engine(settings.DATABASE_URL)
  async_session = sessionmaker(engine, class_=AsyncSession)

  async def get_session():
      async with async_session() as session:
          yield session
  ```

- [ ] **1.5 Models**
  - `server/models/__init__.py`
  - `server/models/agent.py` - Agent model
  - `server/models/market.py` - Market model
  - `server/models/order.py` - Order model
  - `server/models/trade.py` - Trade model
  - `server/models/position.py` - Position model

- [ ] **1.6 Alembic Setup**
  ```bash
  alembic init alembic
  # Configure alembic.ini and env.py
  alembic revision --autogenerate -m "initial"
  alembic upgrade head
  ```

- [ ] **1.7 Basic FastAPI App**
  ```python
  # server/main.py
  from fastapi import FastAPI

  app = FastAPI(title="MoltStreet API")

  @app.get("/health")
  async def health():
      return {"status": "ok"}
  ```

### Verification
```bash
uvicorn server.main:app --reload
curl http://localhost:8000/health
# {"status": "ok"}
```

---

## Phase 2: Core API

**Goal:** CRUD for agents and markets.

### Tasks

- [ ] **2.1 Agents Router**
  - `POST /agents` - Register agent (name → id, balance=1000)
  - `GET /agents/{id}` - Get agent details
  - `GET /agents` - List agents (leaderboard)

- [ ] **2.2 Markets Router**
  - `POST /markets` - Create market (question, deadline)
  - `GET /markets` - List markets (filter by status)
  - `GET /markets/{id}` - Get market details
  - `GET /markets/{id}/orderbook` - Get order book

- [ ] **2.3 Request/Response Schemas**
  ```python
  # Pydantic models for API
  class AgentCreate(BaseModel):
      name: str

  class AgentResponse(BaseModel):
      id: UUID
      name: str
      balance: float
      reputation: float
  ```

- [ ] **2.4 Error Handling**
  ```python
  @app.exception_handler(HTTPException)
  async def http_exception_handler(request, exc):
      return JSONResponse(
          status_code=exc.status_code,
          content={"detail": exc.detail}
      )
  ```

### Verification
```bash
# Register agent
curl -X POST http://localhost:8000/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "test-agent"}'

# Create market
curl -X POST http://localhost:8000/markets \
  -H "Content-Type: application/json" \
  -d '{
    "creator_id": "agent-uuid",
    "question": "Test market?",
    "deadline": "2024-02-01T00:00:00Z"
  }'
```

---

## Phase 3: Trading

**Goal:** Order placement and matching engine.

### Tasks

- [ ] **3.1 Orders Router**
  - `POST /orders` - Place order
  - `DELETE /orders/{id}` - Cancel order
  - `GET /orders` - List orders (by agent)

- [ ] **3.2 Balance Locking**
  ```python
  # When placing order:
  # 1. Lock agent row (FOR UPDATE)
  # 2. Check available balance
  # 3. Add to locked_balance
  # 4. Create order
  ```

- [ ] **3.3 Matching Engine**
  ```python
  # server/services/matching.py
  async def match_order(session, order):
      # 1. Find opposite-side orders with overlapping price
      # 2. Match in price-time priority
      # 3. Create trades
      # 4. Update order fills
      # 5. Return trades
  ```

- [ ] **3.4 Order Matching Logic**
  ```
  YES buyer @ 0.60 matches with NO buyer @ 0.40
  (because 0.60 + 0.40 = 1.00)

  Match condition:
  - Opposite sides
  - order.price + match.price >= 1.0
  - Different agents
  ```

- [ ] **3.5 Trade Creation**
  ```python
  trade = Trade(
      market_id=order.market_id,
      buy_order_id=...,
      sell_order_id=...,
      buyer_id=...,
      seller_id=...,
      price=order.price,
      size=trade_size
  )
  ```

### Verification
```bash
# Place order
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-uuid",
    "market_id": "market-uuid",
    "side": "YES",
    "price": 0.55,
    "size": 10
  }'

# Check if matched
# Response should include trades if matched
```

---

## Phase 4: Settlement

**Goal:** Positions, market resolution, payouts.

### Tasks

- [ ] **4.1 Positions Router**
  - `GET /positions` - Get agent positions
  - `GET /positions/{agent}/{market}` - Get specific position

- [ ] **4.2 Position Updates**
  ```python
  # After each trade:
  # 1. Get or create position for both agents
  # 2. Add shares to winner's position
  # 3. Update average price
  ```

- [ ] **4.3 Balance Settlement**
  ```python
  # After trade:
  # 1. Deduct from locked_balance
  # 2. Deduct from balance
  # (Shares are the "value" they received)
  ```

- [ ] **4.4 Market Resolution**
  ```python
  # POST /markets/{id}/resolve
  async def resolve_market(market_id, outcome, oracle_id):
      # 1. Verify market is past deadline
      # 2. Set outcome (YES/NO)
      # 3. Calculate payouts
      # 4. Credit winners
      # 5. Mark market resolved
  ```

- [ ] **4.5 Payout Logic**
  ```python
  # For each position in market:
  if outcome == "YES":
      payout = position.yes_shares * 1.0
  else:
      payout = position.no_shares * 1.0

  agent.balance += payout
  ```

- [ ] **4.6 Order Cancellation Refund**
  ```python
  # When cancelling:
  unfilled = order.size - order.filled
  refund = order.price * unfilled
  agent.locked_balance -= refund
  ```

### Verification
```bash
# Resolve market
curl -X POST http://localhost:8000/markets/{id}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "oracle_id": "agent-uuid",
    "outcome": "YES"
  }'

# Check agent balance increased
curl http://localhost:8000/agents/{id}
```

---

## Phase 5: Real-time

**Goal:** WebSocket for live updates.

### Tasks

- [ ] **5.1 WebSocket Manager**
  ```python
  # server/websocket.py
  class ConnectionManager:
      def __init__(self):
          self.connections: Dict[str, Set[WebSocket]] = {}

      async def connect(self, ws, channel):
          await ws.accept()
          self.connections.setdefault(channel, set()).add(ws)

      async def broadcast(self, channel, message):
          for ws in self.connections.get(channel, []):
              await ws.send_json(message)
  ```

- [ ] **5.2 WebSocket Endpoint**
  ```python
  @router.websocket("/ws/{channel}")
  async def websocket_endpoint(websocket: WebSocket, channel: str):
      await manager.connect(websocket, channel)
      try:
          while True:
              await websocket.receive_text()
      except WebSocketDisconnect:
          manager.disconnect(websocket, channel)
  ```

- [ ] **5.3 Broadcast on Events**
  ```python
  # In matching service:
  await broadcast_trade(market_id, trade)

  # In orders router:
  await broadcast_order(market_id, order)
  ```

- [ ] **5.4 Market Price Updates**
  ```python
  # After each trade, update market prices
  # Broadcast new yes_price, no_price
  ```

### Verification
```python
# Test WebSocket connection
import websockets
import asyncio

async def test():
    async with websockets.connect("ws://localhost:8000/ws/market:xxx") as ws:
        msg = await ws.recv()
        print(msg)

asyncio.run(test())
```

---

## Phase 6: Polish

**Goal:** Testing, error handling, deployment.

### Tasks

- [ ] **6.1 Unit Tests**
  ```python
  # tests/test_agents.py
  def test_create_agent():
      response = client.post("/agents", json={"name": "test"})
      assert response.status_code == 200
      assert response.json()["balance"] == 1000.0
  ```

- [ ] **6.2 Integration Tests**
  ```python
  # tests/test_trading.py
  def test_order_matching():
      # Create 2 agents
      # Place opposite orders
      # Verify trade created
  ```

- [ ] **6.3 Concurrency Tests**
  ```python
  # Test race conditions
  # Multiple agents placing orders simultaneously
  ```

- [ ] **6.4 API Documentation**
  - OpenAPI auto-generated at `/docs`
  - Add descriptions to endpoints
  - Add example responses

- [ ] **6.5 Logging**
  ```python
  import logging
  logging.basicConfig(level=logging.INFO)
  logger = logging.getLogger(__name__)
  ```

- [ ] **6.6 Dockerfile**
  ```dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install -r requirements.txt
  COPY . .
  CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0"]
  ```

- [ ] **6.7 Deploy to Railway/Render**
  - Connect GitHub repo
  - Set DATABASE_URL env var
  - Deploy

### Verification
```bash
# Run tests
pytest tests/ -v

# Build Docker
docker build -t moltstreet .
docker run -p 8000:8000 moltstreet
```

---

## File Checklist

### Phase 1
```
[ ] server/__init__.py
[ ] server/main.py
[ ] server/config.py
[ ] server/database.py
[ ] server/models/__init__.py
[ ] server/models/agent.py
[ ] server/models/market.py
[ ] server/models/order.py
[ ] server/models/trade.py
[ ] server/models/position.py
[ ] requirements.txt
[ ] .env.example
[ ] alembic.ini
[ ] alembic/env.py
```

### Phase 2
```
[ ] server/routers/__init__.py
[ ] server/routers/agents.py
[ ] server/routers/markets.py
[ ] server/schemas/__init__.py
[ ] server/schemas/agent.py
[ ] server/schemas/market.py
```

### Phase 3
```
[ ] server/routers/orders.py
[ ] server/services/__init__.py
[ ] server/services/matching.py
[ ] server/schemas/order.py
```

### Phase 4
```
[ ] server/routers/positions.py
[ ] server/services/settlement.py
[ ] server/schemas/position.py
```

### Phase 5
```
[ ] server/websocket.py
```

### Phase 6
```
[ ] tests/__init__.py
[ ] tests/conftest.py
[ ] tests/test_agents.py
[ ] tests/test_markets.py
[ ] tests/test_orders.py
[ ] tests/test_matching.py
[ ] Dockerfile
[ ] docker-compose.yml
```

---

## Timeline Estimate

| Phase | Complexity |
|-------|------------|
| Phase 1 | Foundation - setup |
| Phase 2 | Basic CRUD |
| Phase 3 | Core logic (matching) |
| Phase 4 | Settlement logic |
| Phase 5 | WebSocket |
| Phase 6 | Testing & deploy |

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core API)
    │
    ▼
Phase 3 (Trading) ──────┐
    │                   │
    ▼                   ▼
Phase 4 (Settlement)  Phase 5 (Real-time)
    │                   │
    └─────────┬─────────┘
              ▼
        Phase 6 (Polish)
```

---

## Start Command

```bash
# Phase 1: Start here
mkdir -p server/models server/routers server/services
touch server/__init__.py
touch requirements.txt
touch .env.example

# Then build each file
```
