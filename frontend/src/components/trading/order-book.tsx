"use client"

import { OrderBook as OrderBookType, OrderBookLevel } from "@/types"

interface OrderBookProps {
  orderBook: OrderBookType | null
  loading?: boolean
}

export function OrderBook({ orderBook, loading }: OrderBookProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  const bids = orderBook?.bids || []
  const asks = orderBook?.asks || []

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No orders in the book yet
      </div>
    )
  }

  const maxSize = Math.max(
    ...bids.map(b => b.size),
    ...asks.map(a => a.size),
    1
  )

  // Use backend-provided spread or calculate fallback
  const bestBid = orderBook?.best_bid ?? bids[0]?.price ?? 0
  const bestAsk = orderBook?.best_ask ?? asks[0]?.price ?? 1
  const spread = orderBook?.spread ?? (bestAsk - bestBid)
  const midPrice = orderBook?.mid_price ?? ((bestBid + bestAsk) / 2)
  const spreadPercent = bestBid > 0 ? ((spread / bestBid) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-3 text-xs text-gray-500 font-medium">
        <span>Price</span>
        <span className="text-center">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sell orders) - reversed to show highest at top */}
      <div className="space-y-1">
        <p className="text-xs text-gray-400 mb-2">Asks (Sell YES)</p>
        {asks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No asks</p>
        ) : (
          [...asks].reverse().map((ask, i) => {
            const widthPercent = (ask.size / maxSize) * 100
            const cumulative = asks.slice(0, asks.length - i).reduce((sum, a) => sum + a.size, 0)
            return (
              <div key={`ask-${ask.price}`} className="relative">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-50"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 py-1 text-sm">
                  <span className="text-red-600 font-mono">{(ask.price * 100).toFixed(0)}¢</span>
                  <span className="text-center font-mono">{ask.size}</span>
                  <span className="text-right text-gray-500 font-mono">{cumulative}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-center gap-6 py-3 border-y border-gray-100 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-400">Best Bid</p>
          <p className="text-sm font-medium text-green-600">{bestBid > 0 ? `${(bestBid * 100).toFixed(0)}¢` : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Spread</p>
          <p className="text-sm font-medium text-gray-700">{(spread * 100).toFixed(1)}¢ ({spreadPercent}%)</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Mid Price</p>
          <p className="text-sm font-medium text-purple-600">{midPrice > 0 ? `${(midPrice * 100).toFixed(0)}¢` : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Best Ask</p>
          <p className="text-sm font-medium text-red-600">{bestAsk < 1 ? `${(bestAsk * 100).toFixed(0)}¢` : "—"}</p>
        </div>
      </div>

      {/* Bids (Buy orders) */}
      <div className="space-y-1">
        <p className="text-xs text-gray-400 mb-2">Bids (Buy YES)</p>
        {bids.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No bids</p>
        ) : (
          bids.map((bid, i) => {
            const widthPercent = (bid.size / maxSize) * 100
            const cumulative = bids.slice(0, i + 1).reduce((sum, b) => sum + b.size, 0)
            return (
              <div key={`bid-${bid.price}`} className="relative">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-green-50"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 py-1 text-sm">
                  <span className="text-green-600 font-mono">{(bid.price * 100).toFixed(0)}¢</span>
                  <span className="text-center font-mono">{bid.size}</span>
                  <span className="text-right text-gray-500 font-mono">{cumulative}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
