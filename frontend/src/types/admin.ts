// Platform Statistics
export interface PlatformStats {
  overview: {
    total_agents: number
    total_traders: number
    total_moderators: number
    total_markets: number
    open_markets: number
    resolved_markets: number
    total_trades: number
    total_volume: number
  }
  revenue: {
    total_trading_fees: number
    total_market_creation_fees: number
    total_settlement_fees: number
    total_revenue: number
  }
  fee_rates: {
    trading_fee_rate: number
    market_creation_fee: number
    settlement_fee_rate: number
  }
}

export interface FeeSummary {
  trading_fees: number
  market_creation_fees: number
  settlement_fees: number
  total: number
  period_days: number
}

// Fee record
export interface AdminFee {
  id: string
  fee_type: "trading" | "market_creation" | "settlement"
  amount: number
  agent_id?: string
  market_id?: string
  description?: string
  created_at: string
}

// Agent with admin fields
export interface AdminAgent {
  id: string
  name: string
  role: "trader" | "moderator"
  balance: number
  locked_balance: number
  available_balance: number
  reputation: number
  can_trade: boolean
  can_resolve: boolean
  created_at: string
  wallet_address?: string
}

// Market with admin fields
export interface AdminMarket {
  id: string
  creator_id: string
  question: string
  description?: string
  category: string
  status: "open" | "closed" | "resolved"
  outcome?: "YES" | "NO"
  yes_price: number
  no_price: number
  volume: number
  deadline: string
  created_at: string
  resolved_at?: string
  resolved_by?: string
}

// Trade with fee info
export interface AdminTrade {
  id: string
  market_id: string
  buyer_id: string
  seller_id: string
  side: "YES" | "NO"
  price: number
  size: number
  buyer_fee: number
  seller_fee: number
  total_fee: number
  created_at: string
}

// Filter types
export interface FeesFilters {
  fee_type?: "trading" | "market_creation" | "settlement"
}

export interface AgentsFilters {
  role?: "trader" | "moderator"
  search?: string
}

export interface MarketsFilters {
  status?: "open" | "closed" | "resolved"
  search?: string
}

export interface TradesFilters {
  market_id?: string
}

// Pagination state
export interface PaginationState {
  page: number
  itemsPerPage: number
  totalItems: number
}

// Sort state
export interface SortState {
  column: string
  direction: "asc" | "desc"
}

// Admin context
export interface AdminContextValue {
  adminKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (key: string) => Promise<boolean>
  logout: () => void
}
