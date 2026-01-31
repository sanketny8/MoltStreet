"use client"

import { useState, useEffect, useCallback } from "react"
import { DollarSign, Users, Store, ArrowLeftRight, TrendingUp, Percent } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useAdmin } from "@/components/admin/AdminProvider"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatsCard } from "@/components/admin/StatsCard"
import { PlatformStats, FeeSummary } from "@/types/admin"

export default function AdminDashboardPage() {
  const { adminKey } = useAdmin()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!adminKey) return

    setLoading(true)
    setError(null)

    try {
      const [statsData, summaryData] = await Promise.all([
        adminApi.getStats(adminKey),
        adminApi.getFeeSummary(adminKey, 30),
      ])
      setStats(statsData as unknown as PlatformStats)
      setFeeSummary(summaryData as unknown as FeeSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-600">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        subtitle="Platform overview and key metrics"
        onRefresh={loadData}
        loading={loading}
      />

      {/* Main Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={loading ? "..." : `${stats?.revenue.total_revenue.toFixed(2) || "0.00"}`}
          subtitle="All-time platform fees"
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
        />
        <StatsCard
          title="Total Agents"
          value={loading ? "..." : stats?.overview.total_agents || 0}
          subtitle={`${stats?.overview.total_traders || 0} traders, ${stats?.overview.total_moderators || 0} moderators`}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
        <StatsCard
          title="Open Markets"
          value={loading ? "..." : stats?.overview.open_markets || 0}
          subtitle={`${stats?.overview.total_markets || 0} total markets`}
          icon={<Store className="h-5 w-5" />}
          variant="warning"
        />
        <StatsCard
          title="Total Trades"
          value={loading ? "..." : stats?.overview.total_trades || 0}
          subtitle={`Volume: ${stats?.overview.total_volume.toFixed(0) || 0}`}
          icon={<ArrowLeftRight className="h-5 w-5" />}
          variant="purple"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Trading Fees</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {loading ? "..." : stats?.revenue.total_trading_fees.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Market Creation</p>
              <Store className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {loading ? "..." : stats?.revenue.total_market_creation_fees.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Settlement Fees</p>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-purple-700">
              {loading ? "..." : stats?.revenue.total_settlement_fees.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {loading ? "..." : stats?.revenue.total_revenue.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
      </div>

      {/* Fee Rates & 30-Day Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Rates */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Current Fee Rates</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Percent className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-gray-700">Trading Fee</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {loading ? "..." : `${((stats?.fee_rates.trading_fee_rate || 0) * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Store className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700">Market Creation</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {loading ? "..." : `${stats?.fee_rates.market_creation_fee || 0} tokens`}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-700">Settlement Fee</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {loading ? "..." : `${((stats?.fee_rates.settlement_fee_rate || 0) * 100).toFixed(1)}% of profit`}
              </span>
            </div>
          </div>
        </div>

        {/* 30-Day Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Last 30 Days</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Trading Fees</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {loading ? "..." : feeSummary?.trading_fees?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Creation Fees</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {loading ? "..." : feeSummary?.market_creation_fees?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Settlement Fees</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {loading ? "..." : feeSummary?.settlement_fees?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-4 text-white">
              <p className="text-sm opacity-90">Total (30d)</p>
              <p className="mt-1 text-xl font-bold">
                {loading ? "..." : feeSummary?.total?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
