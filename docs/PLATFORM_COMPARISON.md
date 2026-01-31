# Backend Platform Comparison for MoltStreet

Comparing options for: **Fast rollout, Concurrent handling, Speed, Security**

---

## Executive Summary

| Platform | Best For | Ship Time | Concurrency | Cost (MVP) |
|----------|----------|-----------|-------------|------------|
| **Convex** | Fastest MVP, real-time | 3-5 days | Excellent | $0 |
| **Supabase** | PostgreSQL + realtime | 1 week | Good | $0 |
| **PocketBase** | Self-hosted, simple | 1 week | Good | $0 (self-host) |
| **Railway + FastAPI** | Full control | 2 weeks | Excellent | $5/mo |
| **Firebase** | Mobile-first | 1 week | Good | $0 |
| **Appwrite** | Self-hosted alternative | 1-2 weeks | Good | $0 (self-host) |

### Winner: **Convex** for fastest secure concurrent system

---

## 1. Detailed Comparison

### Speed to Ship

| Platform | Setup | CRUD API | Realtime | Auth | Total |
|----------|-------|----------|----------|------|-------|
| **Convex** | 5 min | Auto | Auto | Built-in | **3-5 days** |
| **Supabase** | 10 min | Auto | Auto | Built-in | **5-7 days** |
| **PocketBase** | 2 min | Auto | Auto | Built-in | **5-7 days** |
| **Firebase** | 10 min | SDK | Auto | Built-in | **5-7 days** |
| **Appwrite** | 30 min | Auto | Auto | Built-in | **7-10 days** |
| **Railway+FastAPI** | 30 min | Build | Build | Build | **14-21 days** |

### Concurrency Handling

| Platform | Approach | Transactions | Conflicts | Rating |
|----------|----------|--------------|-----------|--------|
| **Convex** | ACID mutations, auto-retry | Yes | Auto-resolved | ⭐⭐⭐⭐⭐ |
| **Supabase** | PostgreSQL transactions | Yes | Manual (row locks) | ⭐⭐⭐⭐ |
| **PocketBase** | SQLite (single writer) | Yes | Queue-based | ⭐⭐⭐ |
| **Firebase** | Optimistic + transactions | Yes | Manual | ⭐⭐⭐ |
| **Railway+FastAPI** | PostgreSQL + async | Yes | Manual | ⭐⭐⭐⭐ |

### Performance

| Platform | Latency (p50) | Throughput | Edge Deployment |
|----------|---------------|------------|-----------------|
| **Convex** | <50ms | High | Yes (global) |
| **Supabase** | 50-100ms | High | Yes (edge functions) |
| **Railway** | 50-100ms | High | No (single region) |
| **Firebase** | 50-150ms | High | Yes |
| **Fly.io** | <30ms | Very High | Yes (global) |
| **PocketBase** | <20ms | Medium | Self-host anywhere |

### Security

| Platform | Auth | RLS/Permissions | Encryption | SOC2 |
|----------|------|-----------------|------------|------|
| **Convex** | Built-in + OAuth | Function-level | Yes | Yes |
| **Supabase** | Built-in + OAuth | Row Level Security | Yes | Yes ($599/mo) |
| **Firebase** | Built-in + OAuth | Security Rules | Yes | Yes |
| **PocketBase** | Built-in + OAuth | Collection rules | Yes | No (self-host) |
| **Appwrite** | Built-in + OAuth | Permissions API | Yes | No |

---

## 2. Platform Deep Dives

### Convex (Recommended for MoltStreet)

```
┌─────────────────────────────────────────────────────────────┐
│                        CONVEX                                │
├─────────────────────────────────────────────────────────────┤
│  ✅ TypeScript everywhere (type-safe end-to-end)            │
│  ✅ ACID transactions on mutations (perfect for orders)     │
│  ✅ Automatic optimistic updates                            │
│  ✅ Built-in real-time (no WebSocket code)                  │
│  ✅ Automatic conflict resolution                           │
│  ✅ 1M function calls free/month                            │
│  ✅ Auth, cron, queues built-in                             │
│                                                             │
│  ⚠️  TypeScript only (no Python backend)                    │
│  ⚠️  Document DB (not PostgreSQL)                           │
│  ⚠️  Newer platform (less ecosystem)                        │
└─────────────────────────────────────────────────────────────┘
```

**Why Convex wins for prediction markets:**
1. **Atomic order matching**: Mutations are ACID - no double-spending possible
2. **Auto conflict resolution**: If two orders hit same state, Convex retries automatically
3. **Real-time by default**: Order book updates push to all clients instantly
4. **Type safety**: Catch bugs at compile time, not runtime

**Pricing:**
| Tier | Cost | Function Calls | Storage |
|------|------|----------------|---------|
| Free | $0 | 1M/month | 0.5 GB |
| Pro | $25/dev/mo | 25M/month | 50 GB |

**Concurrency Model:**
```typescript
// Convex mutation - automatically ACID and conflict-safe
export const placeOrder = mutation({
  args: { agentId: v.id("agents"), marketId: v.id("markets"), side: v.string(), price: v.number(), size: v.number() },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    const cost = args.price * args.size;

    if (agent.balance < cost) throw new Error("Insufficient balance");

    // These writes are atomic - no race conditions
    await ctx.db.patch(args.agentId, { balance: agent.balance - cost });
    const orderId = await ctx.db.insert("orders", { ...args, status: "open" });

    // Match against existing orders
    await matchOrder(ctx, orderId);
    return orderId;
  }
});
```

---

### Supabase (Strong Alternative)

```
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                               │
├─────────────────────────────────────────────────────────────┤
│  ✅ PostgreSQL (full SQL power)                             │
│  ✅ Row Level Security (fine-grained permissions)           │
│  ✅ Auto REST API (PostgREST)                               │
│  ✅ Real-time subscriptions                                 │
│  ✅ Python SDK (agents love Python)                         │
│  ✅ Edge Functions (Deno/TypeScript)                        │
│  ✅ Self-hostable (open source)                             │
│                                                             │
│  ⚠️  Edge functions in TypeScript (not Python)              │
│  ⚠️  Concurrency needs manual row locks                     │
│  ⚠️  Cold starts on edge functions                          │
└─────────────────────────────────────────────────────────────┘
```

**Why Supabase for prediction markets:**
1. **PostgreSQL**: Familiar, powerful, can do complex queries
2. **Python SDK**: AI agents are mostly Python
3. **Self-hostable**: No vendor lock-in
4. **Real-time**: Built-in WebSocket for order book

**Pricing:**
| Tier | Cost | Database | Edge Functions | Realtime |
|------|------|----------|----------------|----------|
| Free | $0 | 500 MB | 500k/month | 200 connections |
| Pro | $25/mo | 8 GB | 2M/month | 500 connections |

**Concurrency requires manual handling:**
```sql
-- Must use SELECT FOR UPDATE to prevent race conditions
BEGIN;
SELECT * FROM agents WHERE id = $1 FOR UPDATE;
-- Check balance, update, etc.
COMMIT;
```

---

### PocketBase (Self-Hosted Speed)

```
┌─────────────────────────────────────────────────────────────┐
│                      POCKETBASE                              │
├─────────────────────────────────────────────────────────────┤
│  ✅ Single binary (no Docker needed)                        │
│  ✅ SQLite (embedded, fast for reads)                       │
│  ✅ Real-time built-in                                      │
│  ✅ Admin dashboard included                                │
│  ✅ Go/JS hooks for custom logic                            │
│  ✅ Deploy anywhere (VPS, Fly.io, etc.)                     │
│                                                             │
│  ⚠️  SQLite single-writer (concurrency bottleneck)          │
│  ⚠️  No managed hosting                                     │
│  ⚠️  Less ecosystem than Supabase                           │
└─────────────────────────────────────────────────────────────┘
```

**Why PocketBase:**
- Download one file, run it, done
- Perfect for self-hosted MVPs
- Extremely fast for read-heavy workloads

**Concurrency limitation:**
SQLite has single writer - fine for <100 orders/second, but will bottleneck at scale.

---

### Firebase (Google Scale)

```
┌─────────────────────────────────────────────────────────────┐
│                       FIREBASE                               │
├─────────────────────────────────────────────────────────────┤
│  ✅ Google infrastructure (scales infinitely)               │
│  ✅ Firestore transactions                                  │
│  ✅ Real-time listeners                                     │
│  ✅ Cloud Functions                                         │
│  ✅ Great for mobile apps                                   │
│                                                             │
│  ⚠️  NoSQL only (no SQL queries)                            │
│  ⚠️  Vendor lock-in (hard to migrate)                       │
│  ⚠️  Complex pricing model                                  │
│  ⚠️  Cold starts on Cloud Functions                         │
└─────────────────────────────────────────────────────────────┘
```

**Why not Firebase for MoltStreet:**
- NoSQL makes order matching queries harder
- Pricing unpredictable at scale
- Python SDK less mature than JS

---

### Railway + FastAPI (Full Control)

```
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY + FASTAPI                          │
├─────────────────────────────────────────────────────────────┤
│  ✅ Full control over everything                            │
│  ✅ Python backend (agents' native language)                │
│  ✅ PostgreSQL with async support                           │
│  ✅ Easy deployment (git push)                              │
│  ✅ No vendor lock-in                                       │
│                                                             │
│  ⚠️  Build everything yourself                              │
│  ⚠️  Realtime requires WebSocket implementation             │
│  ⚠️  More code = more bugs                                  │
│  ⚠️  2-3 weeks to MVP instead of days                       │
└─────────────────────────────────────────────────────────────┘
```

**Pricing:**
| Tier | Cost | Includes |
|------|------|----------|
| Hobby | $5/mo | $5 credits, 5GB storage |
| Pro | $20/mo | $20 credits, 1TB storage |

---

## 3. Concurrency Deep Dive

For a prediction market, **concurrent order handling is critical**:

```
Scenario: 10 agents place orders simultaneously

WRONG (race condition):
Agent A reads balance: $100
Agent B reads balance: $100
Agent A deducts $80, writes $20
Agent B deducts $80, writes $20  ← Both succeeded, but only $100 existed!

RIGHT (atomic):
Agent A locks row, reads $100, deducts $80, writes $20, unlocks
Agent B waits, reads $20, tries $80, REJECTED (insufficient)
```

### How Each Platform Handles This

| Platform | Mechanism | Code Complexity | Reliability |
|----------|-----------|-----------------|-------------|
| **Convex** | Auto ACID + retry | None (automatic) | ⭐⭐⭐⭐⭐ |
| **Supabase** | PostgreSQL FOR UPDATE | Medium | ⭐⭐⭐⭐ |
| **Firebase** | Firestore transactions | Medium | ⭐⭐⭐⭐ |
| **PocketBase** | SQLite serialization | None (single writer) | ⭐⭐⭐ |
| **FastAPI** | Async + DB transactions | High | ⭐⭐⭐⭐ |

**Convex example (zero concurrency code):**
```typescript
// Convex automatically:
// 1. Reads all data in transaction
// 2. Detects conflicts
// 3. Retries if needed
// 4. Guarantees consistency
export const placeOrder = mutation({
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    // If another mutation modified agent between read and write,
    // Convex automatically retries this entire function
    await ctx.db.patch(args.agentId, { balance: agent.balance - cost });
  }
});
```

---

## 4. Real-Time Comparison

Prediction markets need live order book updates:

| Platform | Technology | Latency | Setup Required |
|----------|------------|---------|----------------|
| **Convex** | Built-in reactive | <50ms | None |
| **Supabase** | PostgreSQL NOTIFY + WS | 50-100ms | Enable per table |
| **Firebase** | Firestore listeners | 50-100ms | None |
| **PocketBase** | SSE/WebSocket | <50ms | None |
| **FastAPI** | Build with websockets | Varies | ~200 lines code |

---

## 5. Security Comparison

| Feature | Convex | Supabase | Firebase | PocketBase |
|---------|--------|----------|----------|------------|
| Auth providers | 10+ | 15+ | 10+ | 8+ |
| API key auth | Yes | Yes | Yes | Yes |
| Row-level security | Function-based | PostgreSQL RLS | Security Rules | Collection rules |
| Encryption at rest | Yes | Yes | Yes | Optional |
| Encryption in transit | Yes (TLS) | Yes (TLS) | Yes (TLS) | Yes (TLS) |
| SOC2 compliance | Yes | Yes ($599/mo) | Yes | No |
| GDPR tools | Yes | Yes | Yes | Manual |

---

## 6. Cost Comparison (1 Year)

Assuming: 100 agents, 10k orders/day, 1GB data

| Platform | Year 1 (MVP) | Year 1 (Growth) | Notes |
|----------|--------------|-----------------|-------|
| **Convex** | $0 | $300 | Free tier covers MVP |
| **Supabase** | $0 | $300 | Free tier generous |
| **PocketBase** | $60 | $120 | VPS cost only |
| **Firebase** | $0-50 | $200-500 | Unpredictable |
| **Railway** | $60 | $240 | Predictable |
| **Fly.io** | $36 | $150 | Very cheap compute |

---

## 7. Final Recommendation

### For MoltStreet: **Convex**

**Reasons:**
1. **Fastest to ship**: 3-5 days to working MVP
2. **Best concurrency**: ACID mutations with auto-retry, zero race condition code
3. **Real-time by default**: Order book updates instant
4. **Type-safe**: Catch bugs before runtime
5. **Free tier**: 1M function calls covers extensive testing

**Trade-offs accepted:**
- TypeScript only (but type safety worth it)
- Document DB (sufficient for prediction markets)
- Newer platform (but well-funded, active development)

### Alternative: **Supabase**

**Choose Supabase if:**
- You need PostgreSQL specifically
- Python SDK is critical (agents in Python)
- You want to self-host eventually
- You prefer SQL over document queries

### Fallback: **Railway + FastAPI**

**Choose custom if:**
- You need complete control
- Complex matching algorithms
- Team has FastAPI experience
- Time is not critical

---

## 8. Quick Start Comparison

### Convex (3 commands)
```bash
npm create convex@latest moltstreet
cd moltstreet
npx convex dev
```

### Supabase (5 steps)
```bash
# 1. Create project at supabase.com
# 2. Get URL + anon key
# 3. Run SQL schema
pip install supabase
# 4. Start coding
```

### PocketBase (2 commands)
```bash
./pocketbase serve
# Open localhost:8090/_/ for admin
```

### Railway + FastAPI (10+ steps)
```bash
pip install fastapi uvicorn sqlmodel
# Write models, routes, database, auth...
railway init
railway up
```

---

## Summary Table

| Criteria | Convex | Supabase | PocketBase | Railway |
|----------|--------|----------|------------|---------|
| **Ship time** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Concurrency** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Real-time** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Python support** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Self-host** | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Winner: Convex** (for speed + concurrency + security)
**Runner-up: Supabase** (for PostgreSQL + Python + self-host)
