"use client"

import { cn } from "@/lib/utils"
import { Trade } from "@/types"

interface TradeHistoryProps {
  trades: Trade[]
  loading?: boolean
}

export function TradeHistory({ trades, loading }: TradeHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trades yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-4 text-xs text-gray-500 font-medium pb-2 border-b border-gray-100">
        <span>Side</span>
        <span>Price</span>
        <span>Size</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {trades.map((trade) => {
          const timeAgo = getTimeAgo(trade.created_at)

          return (
            <div
              key={trade.id}
              className="grid grid-cols-4 py-2 text-sm hover:bg-gray-50 rounded"
            >
              <span className={cn(
                "font-medium",
                trade.side === "YES" ? "text-green-600" : "text-red-600"
              )}>
                {trade.side}
              </span>
              <span className="font-mono">{(trade.price * 100).toFixed(0)}¢</span>
              <span className="font-mono">{trade.size}</span>
              <span className="text-right text-gray-500">{timeAgo}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
