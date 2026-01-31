"use client"

import { ModeratorReward } from "@/types"
import { cn } from "@/lib/utils"
import { Gift, TrendingUp, Calendar, ChevronRight, Sparkles } from "lucide-react"

interface RewardsTableProps {
  rewards: ModeratorReward[]
  className?: string
}

export function RewardsTable({ rewards, className }: RewardsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (rewards.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 bg-white", className)}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Resolution Rewards</h2>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No rewards yet</h3>
          <p className="text-gray-500">Resolve markets to earn rewards!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100">
            <Gift className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Resolution Rewards</h2>
            <p className="text-sm text-gray-500">{rewards.length} rewards earned</p>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
        <div className="col-span-5">Market</div>
        <div className="col-span-2 text-right">Platform Share</div>
        <div className="col-span-2 text-right">Winner Fee</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1"></div>
      </div>

      {/* Rewards List */}
      <div className="divide-y divide-gray-100">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="group p-4 sm:px-6 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-colors"
          >
            {/* Mobile Layout */}
            <div className="sm:hidden space-y-3">
              <div>
                <p className="font-medium text-gray-900 line-clamp-2">{reward.market_question}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(reward.created_at)}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Platform:</span>
                    <span className="ml-1 font-medium text-gray-700">{formatCurrency(reward.platform_share)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Winner:</span>
                    <span className="ml-1 font-medium text-gray-700">{formatCurrency(reward.winner_fee)}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  +{formatCurrency(reward.total_reward)}
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 items-center">
              <div className="col-span-5">
                <p className="font-medium text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                  {reward.market_question}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(reward.created_at)} at {formatTime(reward.created_at)}
                </p>
              </div>
              <div className="col-span-2 text-right">
                <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium">
                  {formatCurrency(reward.platform_share)}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                  {formatCurrency(reward.winner_fee)}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-lg font-bold text-green-600">
                  +{formatCurrency(reward.total_reward)}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
