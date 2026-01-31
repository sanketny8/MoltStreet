# Supabase for MoltStreet: Analysis Report

Should we use Supabase instead of FastAPI + PostgreSQL?

---

## TL;DR

**Recommendation: YES for MVP, with hybrid approach**

| Component | Use Supabase? | Notes |
|-----------|---------------|-------|
| Database | Yes | Managed PostgreSQL, backups, extensions |
| Realtime | Yes | Built-in WebSocket for order book updates |
| Auth | Maybe | Simple API keys might be enough |
| Edge Functions | Yes | Order matching logic |
| Storage | No | Not needed for MoltStreet |

---

## 1. What Supabase Gives Us

### Immediate Benefits

```
┌─────────────────────────────────────────────────────────────┐
│                  WITHOUT SUPABASE                           │
├─────────────────────────────────────────────────────────────┤
│  You build:                                                 │
│  • FastAPI server           (500+ lines)                   │
│  • Database setup           (Docker, migrations)           │
│  • REST API endpoints       (CRUD for each model)          │
│  • WebSocket server         (real-time updates)            │
│  • Auth system              (API keys, tokens)             │
│  • Deployment config        (Dockerfile, Railway)          │
└─────────────────────────────────────────────────────────────┘
                           vs
┌─────────────────────────────────────────────────────────────┐
│                   WITH SUPABASE                             │
├─────────────────────────────────────────────────────────────┤
│  You get FREE:                                              │
│  • Managed PostgreSQL       (auto-backups, scaling)        │
│  • Auto REST API            (PostgREST, instant CRUD)      │
│  • Auto WebSocket           (Realtime subscriptions)       │
│  • Auth built-in            (API keys, JWT)                │
│  • Dashboard                (DB explorer, logs)            │
│                                                             │
│  You build:                                                 │
│  • Edge Functions           (order matching only)          │
│  • DB schema + RLS policies                                 │
└─────────────────────────────────────────────────────────────┘
```

### Code Reduction

| Feature | Custom FastAPI | Supabase | Savings |
|---------|---------------|----------|---------|
| Agent CRUD | ~100 lines | 0 lines (auto) | 100% |
| Market CRUD | ~150 lines | 0 lines (auto) | 100% |
| Order CRUD | ~200 lines | 0 lines (auto) | 100% |
| Order matching | ~300 lines | ~300 lines (Edge Fn) | 0% |
| Real-time updates | ~200 lines | 0 lines (built-in) | 100% |
| Auth | ~150 lines | ~20 lines (config) | 87% |
| **Total** | **~1100 lines** | **~320 lines** | **71%** |

---

## 2. Architecture with Supabase

```
┌─────────────────────────────────────────────────────────────┐
│                      AI AGENTS                               │
│         (Python clients using supabase-py SDK)              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE                                 │
├──────────────────┬──────────────────┬───────────────────────┤
│   PostgREST      │   Realtime       │   Edge Functions      │
│   (Auto CRUD)    │   (WebSocket)    │   (Custom Logic)      │
├──────────────────┴──────────────────┴───────────────────────┤
│                     PostgreSQL                               │
│   agents | markets | orders | trades | positions            │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

**1. Agent Registration (Auto via PostgREST)**
```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create agent - no backend code needed!
agent = supabase.table("agents").insert({
    "name": "my-agent"
}).execute()
```

**2. List Markets (Auto via PostgREST)**
```python
# Filtering, pagination - all automatic
markets = supabase.table("markets") \
    .select("*") \
    .eq("status", "open") \
    .order("created_at", desc=True) \
    .limit(20) \
    .execute()
```

**3. Real-time Order Book (Auto via Realtime)**
```python
# Subscribe to order book changes
def on_order_change(payload):
    print(f"New order: {payload}")

supabase.table("orders") \
    .on("INSERT", on_order_change) \
    .subscribe()
```

**4. Place Order (Edge Function for business logic)**
```typescript
// supabase/functions/place-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { agent_id, market_id, side, price, size } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Start transaction
  const { data: agent } = await supabase
    .from("agents")
    .select("balance, locked_balance")
    .eq("id", agent_id)
    .single()

  const cost = price * size
  if (agent.balance - agent.locked_balance < cost) {
    return new Response(JSON.stringify({ error: "INSUFFICIENT_BALANCE" }), { status: 400 })
  }

  // Lock balance
  await supabase
    .from("agents")
    .update({ locked_balance: agent.locked_balance + cost })
    .eq("id", agent_id)

  // Create order
  const { data: order } = await supabase
    .from("orders")
    .insert({ agent_id, market_id, side, price, size, status: "open" })
    .select()
    .single()

  // Match order (call matching engine)
  const trades = await matchOrder(supabase, order)

  return new Response(JSON.stringify({ order, trades }))
})
```

---

## 3. Database Schema (Supabase SQL)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Agents table
create table agents (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  balance numeric(20,4) default 1000.0,
  locked_balance numeric(20,4) default 0.0,
  reputation numeric(10,2) default 0.0,
  created_at timestamp with time zone default now()
);

-- Markets table
create table markets (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references agents(id),
  question text not null,
  description text,
  deadline timestamp with time zone not null,
  status text default 'open' check (status in ('open', 'closed', 'resolved')),
  outcome text check (outcome in ('YES', 'NO', null)),
  yes_price numeric(5,4) default 0.5,
  no_price numeric(5,4) default 0.5,
  volume numeric(20,4) default 0.0,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

-- Orders table
create table orders (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id),
  market_id uuid references markets(id),
  side text not null check (side in ('YES', 'NO')),
  price numeric(5,4) not null check (price >= 0.01 and price <= 0.99),
  size integer not null check (size > 0),
  filled integer default 0,
  status text default 'open' check (status in ('open', 'partial', 'filled', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- Trades table
create table trades (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id),
  buy_order_id uuid references orders(id),
  sell_order_id uuid references orders(id),
  buyer_id uuid references agents(id),
  seller_id uuid references agents(id),
  side text not null,
  price numeric(5,4) not null,
  size integer not null,
  created_at timestamp with time zone default now()
);

-- Positions table
create table positions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id),
  market_id uuid references markets(id),
  yes_shares integer default 0,
  no_shares integer default 0,
  avg_yes_price numeric(5,4),
  avg_no_price numeric(5,4),
  unique(agent_id, market_id)
);

-- Enable Row Level Security
alter table agents enable row level security;
alter table markets enable row level security;
alter table orders enable row level security;
alter table trades enable row level security;
alter table positions enable row level security;

-- RLS Policies (example: agents can only see their own orders)
create policy "Agents can read own orders"
  on orders for select
  using (agent_id = auth.uid());

create policy "Agents can insert own orders"
  on orders for insert
  with check (agent_id = auth.uid());

-- Public read for markets (everyone can see)
create policy "Markets are public"
  on markets for select
  using (true);

-- Indexes for performance
create index idx_orders_market_status on orders(market_id, status);
create index idx_orders_matching on orders(market_id, side, price, status);
create index idx_positions_agent on positions(agent_id);
create index idx_markets_status on markets(status, deadline);

-- Enable realtime for tables
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table trades;
alter publication supabase_realtime add table markets;
```

---

## 4. Pricing Analysis

### Free Tier (Good for MVP)

| Resource | Limit | MoltStreet Usage | Verdict |
|----------|-------|------------------|---------|
| Database | 500 MB | ~10MB for 100k trades | OK |
| API Requests | Unlimited | N/A | OK |
| Edge Functions | 500k/month | ~100k orders/month | OK |
| Realtime Connections | 200 concurrent | ~50 agents | OK |
| Realtime Messages | 2M/month | ~500k/month | OK |

**Free tier works for:** Testing, MVP, up to ~50 concurrent agents

### Pro Tier ($25/month)

| Resource | Limit | Why Upgrade |
|----------|-------|-------------|
| Database | 8 GB | More history |
| Edge Functions | 2M/month | More trades |
| Realtime | 500 connections | More agents |
| No pause | Always on | Production |

**Pro tier for:** Production with 100+ agents

### Cost Comparison

| Approach | Monthly Cost | Notes |
|----------|--------------|-------|
| Supabase Free | $0 | MVP, pauses after 1 week inactive |
| Supabase Pro | $25 | Production-ready |
| Railway (FastAPI + Postgres) | $5-20 | More ops work |
| Self-hosted VPS | $5-10 | Most ops work |
| AWS/GCP | $50+ | Overkill |

---

## 5. Pros & Cons

### Pros

| Benefit | Impact |
|---------|--------|
| No backend code for CRUD | 70% less code |
| Built-in realtime | Instant order book updates |
| Managed PostgreSQL | No DevOps |
| Auto-generated API docs | Agents can discover endpoints |
| Dashboard included | Monitor without building UI |
| Python SDK | Easy agent integration |
| Free tier | $0 for MVP |

### Cons

| Drawback | Mitigation |
|----------|------------|
| Edge Functions in TypeScript/Deno | Simple logic, not a problem |
| Vendor lock-in | Supabase is open-source, can self-host |
| Less control over matching engine | Edge Function handles it |
| Cold starts on Edge Functions | Keep functions warm with cron |
| 500ms timeout on free tier | Pro has 150s timeout |

---

## 6. Hybrid Approach (Recommended)

Use Supabase for what it's good at, custom code for complex logic:

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE HANDLES                        │
├─────────────────────────────────────────────────────────────┤
│  • Database (PostgreSQL)                                    │
│  • CRUD API (agents, markets, orders, positions)           │
│  • Realtime subscriptions (order book, trades)             │
│  • Auth (API keys for agents)                              │
│  • Dashboard (monitoring, logs)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS HANDLE                    │
├─────────────────────────────────────────────────────────────┤
│  • POST /functions/place-order    (matching logic)         │
│  • POST /functions/cancel-order   (refund logic)           │
│  • POST /functions/resolve-market (payout logic)           │
│  • POST /functions/create-market  (fee deduction)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   OPTIONAL: PYTHON WORKER                   │
├─────────────────────────────────────────────────────────────┤
│  • Complex matching engine (if Edge Functions too slow)    │
│  • Oracle/resolution automation                            │
│  • Reputation calculation (batch job)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Plan with Supabase

### Week 1: Setup & Schema
```bash
# 1. Create Supabase project
# 2. Run SQL schema (above)
# 3. Enable realtime on tables
# 4. Test CRUD via dashboard
```

### Week 2: Edge Functions
```bash
# Deploy edge functions
supabase functions deploy place-order
supabase functions deploy cancel-order
supabase functions deploy resolve-market
supabase functions deploy create-market
```

### Week 3: Python Client
```python
# pip install supabase
# Create MoltStreetClient wrapper
```

### Week 4: Testing & Polish
```bash
# Integration tests
# Example agents
# Claude Code skill
```

---

## 8. Python SDK Usage

```python
from supabase import create_client
import os

class MoltStreetClient:
    def __init__(self):
        self.client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
        self.agent_id = None

    def register(self, name: str):
        result = self.client.table("agents").insert({"name": name}).execute()
        self.agent_id = result.data[0]["id"]
        return result.data[0]

    def get_balance(self):
        result = self.client.table("agents").select("balance").eq("id", self.agent_id).single().execute()
        return result.data["balance"]

    def list_markets(self, status: str = "open"):
        return self.client.table("markets").select("*").eq("status", status).execute().data

    def place_order(self, market_id: str, side: str, price: float, size: int):
        # Call Edge Function for business logic
        return self.client.functions.invoke("place-order", {
            "body": {
                "agent_id": self.agent_id,
                "market_id": market_id,
                "side": side,
                "price": price,
                "size": size
            }
        })

    def subscribe_to_trades(self, market_id: str, callback):
        return self.client.table("trades") \
            .on("INSERT", lambda p: callback(p) if p["new"]["market_id"] == market_id else None) \
            .subscribe()


# Usage
client = MoltStreetClient()
client.register("my-agent")

print(f"Balance: {client.get_balance()}")

markets = client.list_markets()
if markets:
    client.place_order(markets[0]["id"], "YES", 0.55, 10)

# Real-time trade updates
client.subscribe_to_trades(markets[0]["id"], lambda t: print(f"Trade: {t}"))
```

---

## 9. Decision Matrix

| Criteria | FastAPI Custom | Supabase | Winner |
|----------|---------------|----------|--------|
| Time to MVP | 2-3 weeks | 1 week | Supabase |
| Code to write | ~1100 lines | ~320 lines | Supabase |
| Realtime | Build it | Built-in | Supabase |
| Control | Full | Partial | FastAPI |
| Cost (MVP) | $5-10/mo | $0 | Supabase |
| Cost (Prod) | $10-30/mo | $25/mo | Tie |
| Scalability | Manual | Auto | Supabase |
| Self-host option | Yes | Yes | Tie |
| Learning curve | Python | SQL + TypeScript | FastAPI |

**Final Score: Supabase 6, FastAPI 2, Tie 2**

---

## 10. Recommendation

### For MoltStreet MVP: Use Supabase

**Why:**
1. Ship in 1 week instead of 3
2. Built-in realtime for order book
3. $0 cost for testing
4. Less code = fewer bugs
5. Focus on agent experience, not infrastructure

**When to switch to custom:**
- If Edge Function latency becomes a problem (>100ms matching)
- If you need complex matching algorithms
- If you hit free tier limits and want cheaper scaling

### Quick Start

```bash
# 1. Create project at supabase.com
# 2. Get URL and anon key
# 3. Run schema SQL in SQL editor
# 4. Deploy edge functions
# 5. Install Python SDK: pip install supabase
# 6. Start trading!
```
