// Agent role type
export type AgentRole = "trader" | "moderator"

// Trading mode type
export type TradingMode = "manual" | "auto"

// Market category type
export type MarketCategory = "crypto" | "politics" | "sports" | "tech" | "ai" | "finance" | "culture"

// Market types
export interface Market {
  id: string
  creator_id: string
  question: string
  description?: string
  category: MarketCategory
  status: "open" | "closed" | "resolved"
  yes_price: number
  no_price: number
  volume: number
  deadline: string
  created_at: string
  outcome?: "YES" | "NO"
  resolved_at?: string
  resolved_by?: string
  resolution_evidence?: string
}

// Agent types
export interface Agent {
  id: string
  name: string
  role: AgentRole
  trading_mode: TradingMode
  balance: number
  locked_balance: number
  reputation: number
  can_trade: boolean
  can_resolve: boolean
  created_at?: string
}

// Order types
export interface Order {
  id: string
  agent_id: string
  market_id: string
  side: "YES" | "NO"
  price: number
  size: number
  filled: number
  status: "open" | "partial" | "filled" | "cancelled"
  created_at: string
}

// Position types
export interface Position {
  market_id: string
  question?: string
  yes_shares: number
  no_shares: number
  avg_yes_price?: number
  avg_no_price?: number
  market_status?: string
}

// Trade types
export interface Trade {
  id: string
  market_id: string
  buyer_id: string
  seller_id: string
  side: "YES" | "NO"
  price: number
  size: number
  created_at: string
}

// Order book types
export interface OrderBookLevel {
  price: number
  size: number
}

export interface OrderBook {
  market_id: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  // Spread information
  best_bid?: number
  best_ask?: number
  spread?: number
  mid_price?: number
}

// API Request types
export interface CreateAgentRequest {
  name: string
  role?: AgentRole
}

export interface ResolveMarketRequest {
  moderator_id: string
  outcome: "YES" | "NO"
  evidence?: string
}

export interface CreateMarketRequest {
  creator_id: string
  question: string
  description?: string
  category?: MarketCategory
  deadline: string
}

export interface CreateOrderRequest {
  agent_id: string
  market_id: string
  side: "YES" | "NO"
  price: number
  size: number
}

export interface PlaceOrderResponse {
  order: Order
  trades: Trade[]
}

// Moderator types
export interface ModeratorStats {
  total_earnings: number
  markets_resolved: number
  pending_markets: number
  average_reward: number
  platform_share_total: number
  winner_fee_total: number
}

export interface PendingMarket {
  id: string
  question: string
  description?: string
  category: MarketCategory
  deadline: string
  days_overdue: number
  volume: number
  status: string
}

export interface ModeratorReward {
  id: number
  market_id: string
  market_question?: string
  platform_share: number
  winner_fee: number
  total_reward: number
  total_winner_profits: number
  created_at: string
}

export interface ResolvedMarket {
  id: string
  question: string
  outcome: string
  volume: number
  resolved_at: string
  reward?: ModeratorReward
}

// Wallet types
export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "trade_buy"
  | "trade_sell"
  | "trade_win"
  | "trade_loss"
  | "market_create"
  | "order_lock"
  | "order_unlock"
  | "fee"
  | "transfer_in"
  | "transfer_out"
  | "reward"

export type TransactionStatus = "pending" | "completed" | "failed"

export interface Wallet {
  id: string
  agent_id: string
  internal_address: string
  external_address?: string
  chain_id?: number
  balance: number
  locked_balance: number
  available_balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  wallet_id: string
  agent_id: string
  type: TransactionType
  status: TransactionStatus
  amount: number
  balance_after: number
  market_id?: string
  trade_id?: string
  order_id?: string
  counterparty_id?: string
  description?: string
  created_at: string
  market_question?: string
  counterparty_name?: string
}

export interface WalletStats {
  total_deposited: number
  total_withdrawn: number
  total_traded: number
  total_won: number
  total_lost: number
  total_fees_paid: number
  transaction_count: number
}

export interface TransferRequest {
  to_address: string
  amount: number
  description?: string
}

export interface TransferResponse {
  transaction_id: string
  from_address: string
  to_address: string
  amount: number
  new_balance: number
}

export interface FaucetResponse {
  transaction_id: string
  amount: number
  new_balance: number
}

// Pending Action types
export type ActionType = "place_order" | "cancel_order" | "transfer" | "create_market"
export type ActionStatus = "pending" | "approved" | "rejected" | "expired"

export interface PendingAction {
  id: string
  agent_id: string
  action_type: ActionType
  action_payload: Record<string, unknown>
  status: ActionStatus
  created_at: string
  expires_at: string
  reviewed_at?: string
  rejection_reason?: string
  result_data?: Record<string, unknown>
}

export interface PendingActionListResponse {
  actions: PendingAction[]
  total: number
  pending_count: number
}

export interface PendingActionResult {
  status: "pending_approval"
  pending_action_id: string
  action_type: ActionType
  message: string
  expires_at: string
}

export interface AgentSettingsUpdate {
  trading_mode?: TradingMode
}
