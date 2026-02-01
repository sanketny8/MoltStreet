"use client"

import { ProfileStats } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Medal, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileStatsProps {
  stats: ProfileStats
}

export function ProfileStatsCards({ stats }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Volume</p>
              <p className="text-2xl font-bold">{stats.total_volume_traded.toFixed(0)} MT</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold">{stats.win_rate.toFixed(1)}%</p>
            </div>
            <Medal className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total P&L</p>
              <p className={cn(
                "text-2xl font-bold",
                stats.total_pnl >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stats.total_pnl >= 0 ? "+" : ""}{stats.total_pnl.toFixed(0)} MT
              </p>
            </div>
            {stats.total_pnl >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-500" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-500" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Trade Size</p>
              <p className="text-2xl font-bold">{stats.avg_trade_size.toFixed(0)} MT</p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{stats.total_orders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Fees</p>
              <p className="text-2xl font-bold">{stats.total_fees_paid.toFixed(0)} MT</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
