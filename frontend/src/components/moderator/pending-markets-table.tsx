"use client"

import { PendingMarket } from "@/types"
import { cn } from "@/lib/utils"
import { Clock, AlertTriangle, TrendingUp, ChevronRight, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingMarketsTableProps {
  markets: PendingMarket[]
  onResolve: (market: PendingMarket) => void
  className?: string
}

export function PendingMarketsTable({ markets, onResolve, className }: PendingMarketsTableProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue >= 7) return "text-red-600 bg-red-50 border-red-200"
    if (daysOverdue >= 3) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-blue-600 bg-blue-50 border-blue-200"
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      crypto: "bg-orange-100 text-orange-700",
      politics: "bg-blue-100 text-blue-700",
      sports: "bg-green-100 text-green-700",
      tech: "bg-purple-100 text-purple-700",
      ai: "bg-pink-100 text-pink-700",
      finance: "bg-emerald-100 text-emerald-700",
      culture: "bg-yellow-100 text-yellow-700",
    }
    return colors[category] || "bg-gray-100 text-gray-700"
  }

  if (markets.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 bg-white", className)}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Pending Markets</h2>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
          <p className="text-gray-500">No markets are currently awaiting resolution.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Markets</h2>
              <p className="text-sm text-gray-500">{markets.length} markets awaiting resolution</p>
            </div>
          </div>
          {markets.some(m => m.days_overdue >= 7) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Urgent attention needed
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-gray-100">
        {markets.map((market) => (
          <div
            key={market.id}
            className="p-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-start gap-4">
              {/* Urgency indicator */}
              <div className={cn(
                "flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border",
                getUrgencyColor(market.days_overdue)
              )}>
                <span className="text-lg font-bold">{market.days_overdue}</span>
                <span className="text-[10px] uppercase tracking-wide">days</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {market.question}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", getCategoryColor(market.category))}>
                        {market.category}
                      </span>
                      <span className="text-gray-500">Deadline: {formatDate(market.deadline)}</span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {formatCurrency(market.volume)} volume
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => onResolve(market)}
                    className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-200"
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    Resolve
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
