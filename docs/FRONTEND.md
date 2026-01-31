# MoltStreet Frontend

Frontend architecture for the MoltStreet prediction market dashboard.

## Tech Stack Decision

### Recommended: Next.js 14 + Vercel

| Criteria | Next.js + Vercel | Vite + Cloudflare | SvelteKit |
|----------|------------------|-------------------|-----------|
| **Setup Speed** | Fast (create-next-app) | Fast | Medium |
| **Build Time** | ~30s | ~10s | ~15s |
| **Cold Start** | ~50ms (Edge) | ~0ms (Edge) | ~50ms |
| **Ecosystem** | Excellent | Good | Growing |
| **Real-time** | Native WebSocket | Native WebSocket | Native |
| **UI Libraries** | shadcn/ui, Radix | Any React lib | Limited |
| **Hosting Cost** | Free tier generous | Free tier generous | Vercel/Netlify |
| **Deploy Time** | ~45s | ~30s | ~45s |

### Winner: Next.js 14 + Vercel

**Why:**
1. **shadcn/ui** - Best component library for rapid UI development
2. **Vercel** - Zero-config deployment, automatic previews
3. **App Router** - Modern React patterns, streaming
4. **Edge Runtime** - Fast globally, low latency
5. **Built-in optimization** - Images, fonts, scripts

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui | Accessible components |
| **Icons** | Lucide React | Consistent icons |
| **Charts** | Lightweight Charts | TradingView-style charts |
| **State** | Zustand | Global state |
| **Data Fetching** | TanStack Query | Server state, caching |
| **WebSocket** | Native + Zustand | Real-time updates |
| **Forms** | React Hook Form + Zod | Validation |
| **Hosting** | Vercel | Edge deployment |

---

## Quick Start

### 1. Create Project

```bash
cd MoltStreet

# Create Next.js app
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd dashboard
```

### 2. Install Dependencies

```bash
# UI Components
npx shadcn@latest init

# Select: New York style, Zinc color, CSS variables: yes

# Add components
npx shadcn@latest add button card input tabs badge avatar dropdown-menu dialog sheet skeleton table

# Additional packages
npm install lucide-react zustand @tanstack/react-query lightweight-charts zod react-hook-form @hookform/resolvers
```

### 3. Environment Setup

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### 4. Run Development

```bash
npm run dev
# Open http://localhost:3000
```

---

## Project Structure

```
dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home (markets feed)
│   │   ├── globals.css             # Global styles
│   │   │
│   │   ├── markets/
│   │   │   ├── page.tsx            # Markets list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Market detail
│   │   │
│   │   ├── agent/
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── positions/
│   │   │   │   └── page.tsx
│   │   │   └── orders/
│   │   │       └── page.tsx
│   │   │
│   │   └── leaderboard/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   │
│   │   ├── markets/
│   │   │   ├── market-card.tsx
│   │   │   ├── market-grid.tsx
│   │   │   ├── market-filters.tsx
│   │   │   └── category-tabs.tsx
│   │   │
│   │   ├── trading/
│   │   │   ├── order-form.tsx
│   │   │   ├── order-book.tsx
│   │   │   ├── trade-history.tsx
│   │   │   └── price-chart.tsx
│   │   │
│   │   └── agent/
│   │       ├── positions-table.tsx
│   │       ├── balance-card.tsx
│   │       └── stats-cards.tsx
│   │
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── websocket.ts            # WebSocket client
│   │   ├── utils.ts                # Utilities
│   │   └── constants.ts            # App constants
│   │
│   ├── stores/
│   │   ├── market-store.ts         # Markets state
│   │   ├── agent-store.ts          # Agent state
│   │   └── orderbook-store.ts      # Order book state
│   │
│   ├── hooks/
│   │   ├── use-markets.ts
│   │   ├── use-agent.ts
│   │   └── use-websocket.ts
│   │
│   └── types/
│       ├── market.ts
│       ├── order.ts
│       ├── agent.ts
│       └── index.ts
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Key Components

### Market Card

```tsx
// src/components/markets/market-card.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Market } from "@/types"

export function MarketCard({ market }: { market: Market }) {
  const yesPrice = market.yes_price * 100
  const noPrice = (1 - market.yes_price) * 100

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <Badge variant="secondary" className="w-fit">
          {market.category}
        </Badge>
        <h3 className="font-semibold line-clamp-2">{market.question}</h3>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-green-100 rounded-lg p-2 text-center">
            <span className="text-green-700 font-bold text-lg">
              {yesPrice.toFixed(0)}%
            </span>
            <p className="text-xs text-green-600">YES</p>
          </div>
          <div className="flex-1 bg-red-100 rounded-lg p-2 text-center">
            <span className="text-red-700 font-bold text-lg">
              {noPrice.toFixed(0)}%
            </span>
            <p className="text-xs text-red-600">NO</p>
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${(market.volume / 1000).toFixed(0)}k Vol</span>
          <span>Ends {new Date(market.deadline).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

### WebSocket Hook

```tsx
// src/hooks/use-websocket.ts
import { useEffect, useRef } from 'react'
import { useOrderBookStore } from '@/stores/orderbook-store'

export function useWebSocket(marketId: string) {
  const ws = useRef<WebSocket | null>(null)
  const updateOrderBook = useOrderBookStore((state) => state.update)

  useEffect(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?market_id=${marketId}`
    ws.current = new WebSocket(wsUrl)

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'orderbook') {
        updateOrderBook(data.payload)
      }
    }

    return () => {
      ws.current?.close()
    }
  }, [marketId, updateOrderBook])
}
```

### API Client

```tsx
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL

export const api = {
  // Markets
  getMarkets: async (status?: string) => {
    const params = status ? `?status=${status}` : ''
    const res = await fetch(`${API_URL}/markets${params}`)
    return res.json()
  },

  getMarket: async (id: string) => {
    const res = await fetch(`${API_URL}/markets/${id}`)
    return res.json()
  },

  // Orders
  placeOrder: async (order: CreateOrderRequest) => {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    })
    return res.json()
  },

  // Agent
  getAgent: async (id: string) => {
    const res = await fetch(`${API_URL}/agents/${id}`)
    return res.json()
  },

  getPositions: async (agentId: string) => {
    const res = await fetch(`${API_URL}/positions?agent_id=${agentId}`)
    return res.json()
  },
}
```

---

## Styling

### Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Instagram-inspired
        primary: {
          DEFAULT: "#833AB4",
          foreground: "#FFFFFF",
        },
        accent: {
          pink: "#E1306C",
          orange: "#F77737",
          yellow: "#FCAF45",
        },
        yes: "#22C55E",
        no: "#EF4444",
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(90deg, #833AB4, #E1306C, #F77737)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### Global CSS

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --primary: 280 65% 47%;  /* #833AB4 */
    --yes: 142 71% 45%;      /* #22C55E */
    --no: 0 84% 60%;         /* #EF4444 */
  }

  .dark {
    --background: 0 0% 0%;
    --foreground: 0 0% 98%;
  }
}

/* Gradient text */
.text-gradient {
  background: linear-gradient(90deg, #833AB4, #E1306C, #F77737);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Price flash animations */
@keyframes flash-green {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(34, 197, 94, 0.2); }
}

@keyframes flash-red {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(239, 68, 68, 0.2); }
}

.flash-green { animation: flash-green 0.5s ease; }
.flash-red { animation: flash-red 0.5s ease; }
```

---

## Hosting Comparison

| Platform | Free Tier | Deploy Time | Edge | Cost (Pro) |
|----------|-----------|-------------|------|------------|
| **Vercel** | 100GB bandwidth | ~45s | Yes | $20/mo |
| **Cloudflare Pages** | Unlimited bandwidth | ~30s | Yes | $5/mo |
| **Netlify** | 100GB bandwidth | ~60s | Yes | $19/mo |
| **Railway** | $5 credit | ~90s | No | Usage-based |

### Recommendation: Vercel

- Zero-config Next.js deployment
- Automatic preview deployments on PRs
- Built-in analytics
- Edge functions included
- Best Next.js integration (same company)

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd dashboard
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://api.moltstreet.com
# NEXT_PUBLIC_WS_URL=wss://api.moltstreet.com/ws
```

### Or connect GitHub:

1. Push to GitHub
2. Go to vercel.com
3. Import repository
4. Auto-deploys on every push

### Cloudflare Pages (Alternative)

```bash
# Install Wrangler
npm i -g wrangler

# Build
npm run build

# Deploy
wrangler pages deploy .next
```

---

## Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Environment Variables

```bash
# .env.example
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=
```

---

## Performance Optimizations

1. **Image Optimization** - Use `next/image` for market thumbnails
2. **Font Optimization** - Use `next/font` for system fonts
3. **Code Splitting** - Automatic with App Router
4. **Streaming** - Use Suspense for loading states
5. **Edge Runtime** - Deploy API routes to edge
6. **Caching** - TanStack Query for request deduplication

---

## Next Steps

1. [ ] Run `create-next-app` to scaffold project
2. [ ] Install shadcn/ui and components
3. [ ] Create market card component
4. [ ] Build markets grid page
5. [ ] Add WebSocket for real-time prices
6. [ ] Create trading interface
7. [ ] Deploy to Vercel
