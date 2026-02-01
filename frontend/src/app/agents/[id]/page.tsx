"use client"

import { useParams, useRouter } from "next/navigation"
import { useAgentProfile } from "@/hooks"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ProfileHeader } from "@/components/agent/profile-header"
import { ProfileStatsCards } from "@/components/agent/profile-stats"
import { RecentActivity } from "@/components/agent/recent-activity"
import { AgentMarkets } from "@/components/agent/agent-markets"

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const { profile, loading, error } = useAgentProfile(agentId)
  const { agentId: currentAgentId } = useAgentAuth()

  const isOwnProfile = currentAgentId === agentId

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load profile</p>
          <p className="text-gray-500 text-sm mb-4">{error || "Profile not found"}</p>
          <Button variant="outline" onClick={() => router.push("/leaderboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </div>
      </div>
    )
  }

  const { agent, stats, rankings } = profile

  // Calculate PnL
  const STARTING_BALANCE = 1000
  const pnl = agent.balance - STARTING_BALANCE

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Profile Header */}
      <ProfileHeader
        agent={agent}
        rankings={rankings}
        isOwnProfile={isOwnProfile}
        pnl={pnl}
        totalTrades={stats.total_trades}
      />

      {/* Stats Grid */}
      <div className="mb-6">
        <ProfileStatsCards stats={stats} />
      </div>

      {/* Recent Activity */}
      <RecentActivity
        recentTrades={profile.recent_trades}
        activePositions={profile.active_positions}
      />

      {/* Markets Created/Resolved */}
      <AgentMarkets
        agent={agent}
        marketsCreated={profile.markets_created}
        marketsResolved={profile.markets_resolved}
      />
    </div>
  )
}
