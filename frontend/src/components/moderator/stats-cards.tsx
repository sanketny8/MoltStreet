"use client"

import { ModeratorStats } from "@/types"
import { cn } from "@/lib/utils"
import { DollarSign, CheckCircle2, Clock, TrendingUp, Coins, Users } from "lucide-react"

interface StatsCardsProps {
  stats: ModeratorStats
  className?: string
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  variant?: "default" | "success" | "warning" | "purple"
}

function StatCard({ title, value, subtitle, icon, trend, variant = "default" }: StatCardProps) {
  const variants = {
    default: "from-gray-50 to-white border-gray-200",
    success: "from-green-50 to-emerald-50 border-green-200",
    warning: "from-amber-50 to-yellow-50 border-amber-200",
    purple: "from-purple-50 to-violet-50 border-purple-200",
  }

  const iconVariants = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-600",
    warning: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all hover:shadow-lg hover:-translate-y-0.5",
      variants[variant]
    )}>
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl" />

      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {subtitle && (
              <span className="text-sm text-gray-500">{subtitle}</span>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-600">+{trend.value}%</span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-xl p-3", iconVariants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function StatsCards({ stats, className }: StatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <StatCard
        title="Total Earnings"
        value={formatCurrency(stats.total_earnings)}
        icon={<DollarSign className="w-6 h-6" />}
        variant="success"
      />
      <StatCard
        title="Markets Resolved"
        value={stats.markets_resolved}
        subtitle="markets"
        icon={<CheckCircle2 className="w-6 h-6" />}
        variant="purple"
      />
      <StatCard
        title="Pending Resolution"
        value={stats.pending_markets}
        subtitle="awaiting"
        icon={<Clock className="w-6 h-6" />}
        variant="warning"
      />
      <StatCard
        title="Avg. Reward"
        value={formatCurrency(stats.average_reward)}
        subtitle="per market"
        icon={<Coins className="w-6 h-6" />}
        variant="default"
      />
    </div>
  )
}

export function EarningsBreakdown({ stats, className }: StatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const platformPercent = stats.total_earnings > 0
    ? (stats.platform_share_total / stats.total_earnings * 100).toFixed(0)
    : 0
  const winnerPercent = stats.total_earnings > 0
    ? (stats.winner_fee_total / stats.total_earnings * 100).toFixed(0)
    : 0

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-6", className)}>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Earnings Breakdown</h3>

      <div className="space-y-4">
        {/* Platform Share */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600">Platform Share (30%)</span>
            </div>
            <span className="font-semibold text-gray-900">{formatCurrency(stats.platform_share_total)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${platformPercent}%` }}
            />
          </div>
        </div>

        {/* Winner Fee */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Winner Fee (0.5%)</span>
            </div>
            <span className="font-semibold text-gray-900">{formatCurrency(stats.winner_fee_total)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${winnerPercent}%` }}
            />
          </div>
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Total Earnings</span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(stats.total_earnings)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
