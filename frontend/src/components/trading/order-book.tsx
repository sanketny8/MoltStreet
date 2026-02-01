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

  const bids = (orderBook?.bids || []).filter(b => b && typeof b.price === 'number')
  const asks = (orderBook?.asks || []).filter(a => a && typeof a.price === 'number')

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No orders in the book yet
      </div>
    )
  }

  const maxSize = Math.max(
    ...bids.map(b => b.size || 0),
    ...asks.map(a => a.size || 0),
    1
  )

  // Use backend-provided spread or calculate fallback with safe access
  const bestBid = orderBook?.best_bid ?? (bids.length > 0 && bids[0]?.price != null ? bids[0].price : 0)
  const bestAsk = orderBook?.best_ask ?? (asks.length > 0 && asks[0]?.price != null ? asks[0].price : 1)
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

      {/* Asks (SELL orders for YES shares) - reversed to show highest at top */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Asks - Selling YES</p>
          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">SELL</span>
        </div>
        {asks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No asks</p>
        ) : (
          [...asks].reverse().map((ask, i) => {
            if (!ask || typeof ask.price !== 'number') return null
            const widthPercent = ((ask.size || 0) / maxSize) * 100
            const cumulative = asks.slice(0, asks.length - i).reduce((sum, a) => sum + (a?.size || 0), 0)
            return (
              <div key={`ask-${ask.price}-${i}`} className="relative">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-50"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 py-1 text-sm">
                  <span className="text-red-600 font-mono">{(ask.price * 100).toFixed(0)}¢</span>
                  <span className="text-center font-mono">{ask.size || 0}</span>
                  <span className="text-right text-gray-500 font-mono">{cumulative}</span>
                </div>
              </div>
            )
          }).filter(Boolean)
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

      {/* Bids (BUY orders for YES shares) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Bids - Buying YES</p>
          <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">BUY</span>
        </div>
        {bids.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No bids</p>
        ) : (
          bids.map((bid, i) => {
            if (!bid || typeof bid.price !== 'number') return null
            const widthPercent = ((bid.size || 0) / maxSize) * 100
            const cumulative = bids.slice(0, i + 1).reduce((sum, b) => sum + (b?.size || 0), 0)
            return (
              <div key={`bid-${bid.price}-${i}`} className="relative">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-green-50"
                  style={{ width: `${widthPercent}%` }}
                />
                <div className="relative grid grid-cols-3 py-1 text-sm">
                  <span className="text-green-600 font-mono">{(bid.price * 100).toFixed(0)}¢</span>
                  <span className="text-center font-mono">{bid.size || 0}</span>
                  <span className="text-right text-gray-500 font-mono">{cumulative}</span>
                </div>
              </div>
            )
          }).filter(Boolean)
        )}
      </div>
    </div>
  )
}
