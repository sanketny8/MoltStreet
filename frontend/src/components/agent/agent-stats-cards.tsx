"use client"

import { Agent } from "@/types"
import { cn } from "@/lib/utils"
import { Wallet, TrendingUp, TrendingDown, Activity, ShoppingCart } from "lucide-react"

interface AgentStatsCardsProps {
  agent: Agent
  positionsCount: number
  ordersCount: number
  className?: string
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "success" | "danger" | "purple" | "blue" | "orange"
}

function StatCard({ title, value, subtitle, icon, trend, variant = "default" }: StatCardProps) {
  const variants = {
    default: "from-gray-50 to-white border-gray-200",
    success: "from-green-50 to-emerald-50 border-green-200",
    danger: "from-red-50 to-rose-50 border-red-200",
    purple: "from-purple-50 to-violet-50 border-purple-200",
    blue: "from-blue-50 to-indigo-50 border-blue-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
  }

  const iconVariants = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-600",
    danger: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
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
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">from start</span>
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

export function AgentStatsCards({ agent, positionsCount, ordersCount, className }: AgentStatsCardsProps) {
  const STARTING_BALANCE = 1000
  const pnl = agent.balance - STARTING_BALANCE
  const pnlPercent = (pnl / STARTING_BALANCE) * 100
  const isProfit = pnl >= 0

  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPnl = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value))
    return value >= 0 ? `+${formatted}` : `-${formatted}`
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", className)}>
      <StatCard
        title="Balance"
        value={formatBalance(agent.balance)}
        subtitle="MT"
        icon={<Wallet className="w-6 h-6" />}
        variant="purple"
      />
      <StatCard
        title="P&L"
        value={formatPnl(pnl)}
        subtitle="MT"
        icon={isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
        trend={{ value: pnlPercent, isPositive: isProfit }}
        variant={isProfit ? "success" : "danger"}
      />
      <StatCard
        title="Positions"
        value={positionsCount}
        subtitle="open"
        icon={<Activity className="w-6 h-6" />}
        variant="blue"
      />
      <StatCard
        title="Orders"
        value={ordersCount}
        subtitle="active"
        icon={<ShoppingCart className="w-6 h-6" />}
        variant="orange"
      />
    </div>
  )
}
