import {
  Agent,
  Market,
  Order,
  Position,
  Trade,
  OrderBook,
  OrderBookLevel,
  CreateAgentRequest,
  CreateMarketRequest,
  CreateOrderRequest,
  PlaceOrderResponse,
  ModeratorStats,
  PendingMarket,
  ModeratorReward,
  ResolvedMarket,
  Wallet,
  Transaction,
  WalletStats,
  TransferRequest,
  TransferResponse,
  FaucetResponse,
  PendingAction,
  PendingActionListResponse,
  AgentSettingsUpdate,
  TradingMode,
} from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

// Helper to convert Decimal strings to numbers
function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value)
  return 0
}

// Parse agent response (Decimal fields: balance, locked_balance, reputation)
function parseAgent(data: Record<string, unknown>): Agent {
  return {
    ...data,
    balance: parseDecimal(data.balance),
    locked_balance: parseDecimal(data.locked_balance),
    reputation: parseDecimal(data.reputation),
  } as Agent
}

// Parse market response (Decimal fields: yes_price, no_price, volume)
function parseMarket(data: Record<string, unknown>): Market {
  return {
    ...data,
    yes_price: parseDecimal(data.yes_price),
    no_price: parseDecimal(data.no_price),
    volume: parseDecimal(data.volume),
  } as Market
}

// Parse order response (Decimal fields: price)
function parseOrder(data: Record<string, unknown>): Order {
  return {
    ...data,
    price: parseDecimal(data.price),
  } as Order
}

// Parse trade response (Decimal fields: price)
function parseTrade(data: Record<string, unknown>): Trade {
  return {
    ...data,
    price: parseDecimal(data.price),
  } as Trade
}

// Parse order book level (Decimal fields: price, size)
function parseOrderBookLevel(data: Record<string, unknown>): OrderBookLevel {
  return {
    price: parseDecimal(data.price),
    size: Number(data.size) || 0,
  }
}

// Parse order book response
function parseOrderBook(data: Record<string, unknown>): OrderBook {
  return {
    market_id: data.market_id as string,
    bids: (data.bids as Record<string, unknown>[])?.map(parseOrderBookLevel) || [],
    asks: (data.asks as Record<string, unknown>[])?.map(parseOrderBookLevel) || [],
    best_bid: data.best_bid != null ? parseDecimal(data.best_bid) : undefined,
    best_ask: data.best_ask != null ? parseDecimal(data.best_ask) : undefined,
    spread: data.spread != null ? parseDecimal(data.spread) : undefined,
    mid_price: data.mid_price != null ? parseDecimal(data.mid_price) : undefined,
  }
}

// Parse position response (Decimal fields: avg_yes_price, avg_no_price)
function parsePosition(data: Record<string, unknown>): Position {
  return {
    ...data,
    avg_yes_price: data.avg_yes_price != null ? parseDecimal(data.avg_yes_price) : undefined,
    avg_no_price: data.avg_no_price != null ? parseDecimal(data.avg_no_price) : undefined,
  } as Position
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new ApiError(response.status, error.detail || "Request failed")
  }

  return response.json()
}

// Agents API
export const agentsApi = {
  create: async (data: CreateAgentRequest): Promise<Agent> => {
    const raw = await fetchApi<Record<string, unknown>>("/agents", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return parseAgent(raw)
  },

  get: async (agentId: string): Promise<Agent> => {
    const raw = await fetchApi<Record<string, unknown>>(`/agents/${agentId}`)
    return parseAgent(raw)
  },

  list: async (params?: { limit?: number; order_by?: string }): Promise<Agent[]> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.order_by) searchParams.set("order_by", params.order_by)
    const query = searchParams.toString()
    const raw = await fetchApi<Record<string, unknown>[]>(`/agents${query ? `?${query}` : ""}`)
    return raw.map(parseAgent)
  },

  updateSettings: async (agentId: string, data: AgentSettingsUpdate): Promise<Agent> => {
    const raw = await fetchApi<Record<string, unknown>>(`/agents/${agentId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    return parseAgent(raw)
  },
}

// Markets API
export const marketsApi = {
  create: async (data: CreateMarketRequest): Promise<Market> => {
    const raw = await fetchApi<Record<string, unknown>>("/markets", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return parseMarket(raw)
  },

  get: async (marketId: string): Promise<Market> => {
    const raw = await fetchApi<Record<string, unknown>>(`/markets/${marketId}`)
    return parseMarket(raw)
  },

  list: async (params?: { status?: string; category?: string; creator_id?: string; trending?: boolean; limit?: number }): Promise<Market[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set("status", params.status)
    if (params?.category) searchParams.set("category", params.category)
    if (params?.creator_id) searchParams.set("creator_id", params.creator_id)
    if (params?.trending) searchParams.set("trending", "true")
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const query = searchParams.toString()
    const raw = await fetchApi<Record<string, unknown>[]>(`/markets${query ? `?${query}` : ""}`)
    return raw.map(parseMarket)
  },

  getCategories: async (): Promise<string[]> => {
    return fetchApi<string[]>("/markets/categories")
  },

  getOrderBook: async (marketId: string): Promise<OrderBook> => {
    const raw = await fetchApi<Record<string, unknown>>(`/markets/${marketId}/orderbook`)
    return parseOrderBook(raw)
  },

  resolve: async (marketId: string, data: { moderator_id: string; outcome: "YES" | "NO"; evidence?: string }): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>(`/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

// Orders API
export const ordersApi = {
  place: async (data: CreateOrderRequest): Promise<PlaceOrderResponse> => {
    const raw = await fetchApi<{ order: Record<string, unknown>; trades: Record<string, unknown>[] }>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return {
      order: parseOrder(raw.order),
      trades: raw.trades.map(parseTrade),
    }
  },

  cancel: (orderId: string, agentId: string): Promise<{ order_id: string; status: string; refunded: number }> =>
    fetchApi(`/orders/${orderId}?agent_id=${agentId}`, {
      method: "DELETE",
    }),

  list: async (params: { agent_id: string; status?: string; market_id?: string; limit?: number }): Promise<Order[]> => {
    const searchParams = new URLSearchParams()
    searchParams.set("agent_id", params.agent_id)
    if (params.status) searchParams.set("status", params.status)
    if (params.market_id) searchParams.set("market_id", params.market_id)
    if (params.limit) searchParams.set("limit", params.limit.toString())
    const raw = await fetchApi<Record<string, unknown>[]>(`/orders?${searchParams.toString()}`)
    return raw.map(parseOrder)
  },
}

// Positions API
export const positionsApi = {
  list: async (agentId: string): Promise<Position[]> => {
    const raw = await fetchApi<Record<string, unknown>[]>(`/positions?agent_id=${agentId}`)
    return raw.map(parsePosition)
  },

  get: async (agentId: string, marketId: string): Promise<Position> => {
    const raw = await fetchApi<Record<string, unknown>>(`/positions/${agentId}/${marketId}`)
    return parsePosition(raw)
  },
}

// Trades API
export const tradesApi = {
  list: async (params?: { market_id?: string; agent_id?: string; limit?: number }): Promise<Trade[]> => {
    const searchParams = new URLSearchParams()
    if (params?.market_id) searchParams.set("market_id", params.market_id)
    if (params?.agent_id) searchParams.set("agent_id", params.agent_id)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const query = searchParams.toString()
    const raw = await fetchApi<Record<string, unknown>[]>(`/trades${query ? `?${query}` : ""}`)
    return raw.map(parseTrade)
  },
}

// Admin API
export const adminApi = {
  getStats: async (adminKey: string): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>("/admin/stats", {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getFees: async (adminKey: string, params?: { fee_type?: string; limit?: number; offset?: number }): Promise<Record<string, unknown>[]> => {
    const searchParams = new URLSearchParams()
    if (params?.fee_type) searchParams.set("fee_type", params.fee_type)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString())
    const query = searchParams.toString()
    return fetchApi<Record<string, unknown>[]>(`/admin/fees${query ? `?${query}` : ""}`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getFeeSummary: async (adminKey: string, days: number = 30): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>(`/admin/fees/summary?days=${days}`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getAgents: async (adminKey: string, params?: { role?: string; limit?: number; offset?: number; order_by?: string }): Promise<Record<string, unknown>[]> => {
    const searchParams = new URLSearchParams()
    if (params?.role) searchParams.set("role", params.role)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString())
    if (params?.order_by) searchParams.set("order_by", params.order_by)
    const query = searchParams.toString()
    return fetchApi<Record<string, unknown>[]>(`/admin/agents${query ? `?${query}` : ""}`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getAgentActivity: async (adminKey: string, agentId: string): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>(`/admin/agents/${agentId}/activity`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getMarkets: async (adminKey: string, params?: { status?: string; limit?: number; offset?: number }): Promise<Record<string, unknown>[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set("status", params.status)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString())
    const query = searchParams.toString()
    return fetchApi<Record<string, unknown>[]>(`/admin/markets${query ? `?${query}` : ""}`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getMarketDetails: async (adminKey: string, marketId: string): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>(`/admin/markets/${marketId}/details`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  getTrades: async (adminKey: string, params?: { market_id?: string; limit?: number; offset?: number }): Promise<Record<string, unknown>[]> => {
    const searchParams = new URLSearchParams()
    if (params?.market_id) searchParams.set("market_id", params.market_id)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString())
    const query = searchParams.toString()
    return fetchApi<Record<string, unknown>[]>(`/admin/trades${query ? `?${query}` : ""}`, {
      headers: { "X-Admin-Key": adminKey },
    })
  },

  healthCheck: async (adminKey: string): Promise<Record<string, unknown>> => {
    return fetchApi<Record<string, unknown>>("/admin/health", {
      headers: { "X-Admin-Key": adminKey },
    })
  },
}

// Moderator API
export const moderatorApi = {
  getStats: async (moderatorId: string): Promise<ModeratorStats> => {
    return fetchApi<ModeratorStats>(`/moderator/stats/${moderatorId}`)
  },

  getPendingMarkets: async (limit: number = 50): Promise<PendingMarket[]> => {
    return fetchApi<PendingMarket[]>(`/moderator/pending?limit=${limit}`)
  },

  getRewards: async (moderatorId: string, limit: number = 50, offset: number = 0): Promise<ModeratorReward[]> => {
    return fetchApi<ModeratorReward[]>(`/moderator/rewards/${moderatorId}?limit=${limit}&offset=${offset}`)
  },

  getResolvedMarkets: async (moderatorId: string, limit: number = 50, offset: number = 0): Promise<ResolvedMarket[]> => {
    return fetchApi<ResolvedMarket[]>(`/moderator/resolved/${moderatorId}?limit=${limit}&offset=${offset}`)
  },
}

// Parse wallet response
function parseWallet(data: Record<string, unknown>): Wallet {
  return {
    ...data,
    balance: parseDecimal(data.balance),
    locked_balance: parseDecimal(data.locked_balance),
    available_balance: parseDecimal(data.available_balance),
  } as Wallet
}

// Parse transaction response
function parseTransaction(data: Record<string, unknown>): Transaction {
  return {
    ...data,
    amount: parseDecimal(data.amount),
    balance_after: parseDecimal(data.balance_after),
  } as Transaction
}

// Parse wallet stats response
function parseWalletStats(data: Record<string, unknown>): WalletStats {
  return {
    total_deposited: parseDecimal(data.total_deposited),
    total_withdrawn: parseDecimal(data.total_withdrawn),
    total_traded: parseDecimal(data.total_traded),
    total_won: parseDecimal(data.total_won),
    total_lost: parseDecimal(data.total_lost),
    total_fees_paid: parseDecimal(data.total_fees_paid),
    transaction_count: Number(data.transaction_count) || 0,
  }
}

// Wallet API
export const walletApi = {
  get: async (agentId: string): Promise<Wallet> => {
    const raw = await fetchApi<Record<string, unknown>>(`/wallet/${agentId}`)
    return parseWallet(raw)
  },

  getTransactions: async (agentId: string, params?: { limit?: number; offset?: number; type?: string }): Promise<Transaction[]> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.offset) searchParams.set("offset", params.offset.toString())
    if (params?.type) searchParams.set("type", params.type)
    const query = searchParams.toString()
    const raw = await fetchApi<Record<string, unknown>[]>(`/wallet/${agentId}/transactions${query ? `?${query}` : ""}`)
    return raw.map(parseTransaction)
  },

  getStats: async (agentId: string): Promise<WalletStats> => {
    const raw = await fetchApi<Record<string, unknown>>(`/wallet/${agentId}/stats`)
    return parseWalletStats(raw)
  },

  transfer: async (agentId: string, data: TransferRequest): Promise<TransferResponse> => {
    const raw = await fetchApi<Record<string, unknown>>(`/wallet/${agentId}/transfer`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    return {
      transaction_id: raw.transaction_id as string,
      from_address: raw.from_address as string,
      to_address: raw.to_address as string,
      amount: parseDecimal(raw.amount),
      new_balance: parseDecimal(raw.new_balance),
    }
  },

  faucet: async (agentId: string, amount?: number): Promise<FaucetResponse> => {
    const raw = await fetchApi<Record<string, unknown>>(`/wallet/${agentId}/faucet`, {
      method: "POST",
      body: JSON.stringify(amount ? { amount } : {}),
    })
    return {
      transaction_id: raw.transaction_id as string,
      amount: parseDecimal(raw.amount),
      new_balance: parseDecimal(raw.new_balance),
    }
  },

  lookupByAddress: async (address: string): Promise<Wallet> => {
    const raw = await fetchApi<Record<string, unknown>>(`/wallet/lookup/${encodeURIComponent(address)}`)
    return parseWallet(raw)
  },
}

// Pending Actions API
export const pendingActionsApi = {
  list: async (agentId: string, params?: { status?: string; action_type?: string; limit?: number }): Promise<PendingActionListResponse> => {
    const searchParams = new URLSearchParams()
    searchParams.set("agent_id", agentId)
    if (params?.status) searchParams.set("status", params.status)
    if (params?.action_type) searchParams.set("action_type", params.action_type)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    return fetchApi<PendingActionListResponse>(`/pending-actions?${searchParams.toString()}`)
  },

  get: async (actionId: string, agentId: string): Promise<PendingAction> => {
    return fetchApi<PendingAction>(`/pending-actions/${actionId}?agent_id=${agentId}`)
  },

  approve: async (actionId: string, agentId: string): Promise<PendingAction> => {
    return fetchApi<PendingAction>(`/pending-actions/${actionId}/approve?agent_id=${agentId}`, {
      method: "POST",
    })
  },

  reject: async (actionId: string, agentId: string, reason?: string): Promise<PendingAction> => {
    return fetchApi<PendingAction>(`/pending-actions/${actionId}/reject?agent_id=${agentId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  delete: async (actionId: string, agentId: string): Promise<void> => {
    await fetchApi<{ message: string }>(`/pending-actions/${actionId}?agent_id=${agentId}`, {
      method: "DELETE",
    })
  },
}

// Export all APIs
export const api = {
  agents: agentsApi,
  markets: marketsApi,
  orders: ordersApi,
  positions: positionsApi,
  trades: tradesApi,
  admin: adminApi,
  moderator: moderatorApi,
  wallet: walletApi,
  pendingActions: pendingActionsApi,
}

export { ApiError }
