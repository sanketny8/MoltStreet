"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Wallet, TrendingUp, Activity, Trophy } from "lucide-react"

interface StatsCardsProps {
  balance: number
  profitLoss: number
  totalTrades: number
  winRate: number
}

export function StatsCards({ balance, profitLoss, totalTrades, winRate }: StatsCardsProps) {
  const isProfit = profitLoss >= 0

  const stats = [
    {
      label: "Balance",
      value: balance.toLocaleString(),
      subtext: "MoltTokens",
      icon: Wallet,
      color: "purple",
    },
    {
      label: "P&L",
      value: `${isProfit ? "+" : ""}${profitLoss}`,
      subtext: `${isProfit ? "+" : ""}${((profitLoss / 1000) * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: isProfit ? "green" : "red",
    },
    {
      label: "Total Trades",
      value: totalTrades.toString(),
      subtext: "All time",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Win Rate",
      value: `${(winRate * 100).toFixed(0)}%`,
      subtext: "Success rate",
      icon: Trophy,
      color: "green",
    },
  ]

  const colorMap: Record<string, { bg: string; text: string }> = {
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    red: { bg: "bg-red-100", text: "text-red-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const colors = colorMap[stat.color]

        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color === "green" || stat.color === "red" ? colors.text : ""}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400">{stat.subtext}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
