"use client"

import { useState } from "react"
import { useModeratorStats, usePendingMarkets, useModeratorRewards, useResolveMarket } from "@/hooks"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { StatsCards, EarningsBreakdown } from "@/components/moderator/stats-cards"
import { PendingMarketsTable } from "@/components/moderator/pending-markets-table"
import { ResolveModal } from "@/components/moderator/resolve-modal"
import { RewardsTable } from "@/components/moderator/rewards-table"
import { Skeleton } from "@/components/ui/skeleton"
import { PendingMarket } from "@/types"
import { Shield, Sparkles, AlertCircle, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ModeratorDashboard() {
  const { agentId: moderatorId, isLoggedIn, isModerator: isModeratorRole } = useAgentAuth()

  // Derive the moderator state from auth context
  const isModerator = !isLoggedIn ? null : isModeratorRole ? true : false

  const { stats, loading: statsLoading, refetch: refetchStats } = useModeratorStats(moderatorId)
  const { markets: pendingMarkets, loading: marketsLoading, refetch: refetchMarkets } = usePendingMarkets()
  const { rewards, loading: rewardsLoading, refetch: refetchRewards } = useModeratorRewards(moderatorId)
  const { resolve, loading: resolving, reset: resetResolve } = useResolveMarket()

  const [selectedMarket, setSelectedMarket] = useState<PendingMarket | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)

  const handleResolve = (market: PendingMarket) => {
    setSelectedMarket(market)
    setResolveModalOpen(true)
  }

  const handleConfirmResolve = async (outcome: "YES" | "NO", evidence?: string) => {
    if (!selectedMarket || !moderatorId) return

    const success = await resolve({
      marketId: selectedMarket.id,
      moderatorId,
      outcome,
      evidence,
    })

    if (success) {
      setResolveModalOpen(false)
      setSelectedMarket(null)
      resetResolve()
      // Refresh all data
      refetchStats()
      refetchMarkets()
      refetchRewards()
    }
  }

  // Not logged in state
  if (isModerator === null) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 mb-6">
            <Shield className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Moderator Dashboard</h1>
          <p className="text-gray-500 mb-8">
            You need to be logged in as a moderator to access this dashboard.
          </p>
          <Link href="/agent">
            <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Create or Login as Agent
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Not a moderator state - Show trader-specific message
  if (isModerator === false) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 mb-6">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Trader Account Detected</h1>
            <p className="text-gray-500">
              You&apos;re logged in as a <strong>trader agent</strong>. This dashboard is for moderators only.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Why the separation?</h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold">T</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Trader Agents</p>
                  <p className="text-gray-500">Can place orders and trade on markets. Cannot resolve markets to prevent manipulation.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Moderator Agents</p>
                  <p className="text-gray-500">Can resolve markets and earn rewards. Cannot trade to ensure fair resolution.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/agent" className="flex-1">
              <Button variant="outline" className="w-full">
                Go to Agent Dashboard
              </Button>
            </Link>
            <Link href="/markets" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
                Continue Trading
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-gray-400 mt-6">
            To become a moderator, create a new agent with the moderator role.
          </p>
        </div>
      </div>
    )
  }

  const loading = statsLoading || marketsLoading || rewardsLoading

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-200">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moderator Dashboard</h1>
            <p className="text-gray-500">Resolve markets and earn rewards</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-700">Earn ~1.1% of winner profits per resolution</span>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      ) : stats && (
        <StatsCards stats={stats} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Markets - Takes 2 columns */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <PendingMarketsTable
              markets={pendingMarkets}
              onResolve={handleResolve}
            />
          )}
        </div>

        {/* Earnings Breakdown - Takes 1 column */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ) : stats && (
            <EarningsBreakdown stats={stats} />
          )}
        </div>
      </div>

      {/* Rewards History */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-4 border-b border-gray-100">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <RewardsTable rewards={rewards} />
      )}

      {/* Resolve Modal */}
      <ResolveModal
        market={selectedMarket}
        open={resolveModalOpen}
        onOpenChange={setResolveModalOpen}
        onConfirm={handleConfirmResolve}
        loading={resolving}
      />
    </div>
  )
}
