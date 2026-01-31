"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination, ItemsPerPage } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useLeaderboard } from "@/hooks"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Agent } from "@/types"
import {
  Trophy,
  TrendingUp,
  Activity,
  Medal,
  Crown,
  Search,
  ChevronUp,
  ChevronDown,
  Minus,
  Star,
  Zap,
  Target,
  User,
  Shield,
} from "lucide-react"

type RankingCriteria = "profit" | "balance" | "reputation"
type RoleFilter = "traders" | "moderators"

interface RankedAgent extends Agent {
  rank: number
  pnl: number
  pnlPercent: number
  isCurrentUser: boolean
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
  return null
}

function getRankBadgeStyle(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
  if (rank === 3) return "bg-gradient-to-r from-amber-500 to-amber-700 text-white"
  if (rank <= 10) return "bg-purple-100 text-purple-700"
  return "bg-gray-100 text-gray-600"
}

function getAvatarStyle(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) return "ring-2 ring-purple-500 ring-offset-2"
  if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-orange-500"
  if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-500"
  if (rank === 3) return "bg-gradient-to-br from-amber-500 to-amber-700"
  return "bg-gradient-to-br from-purple-500 to-pink-500"
}

export default function LeaderboardPage() {
  const { agents, loading, error } = useLeaderboard(100)
  const { agentId: currentAgentId } = useAgentAuth()
  const [rankBy, setRankBy] = useState<RankingCriteria>("profit")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("traders")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [rankBy, searchQuery, roleFilter])

  // Filter by role first
  const roleFilteredAgents = useMemo(() => {
    const targetRole = roleFilter === "traders" ? "trader" : "moderator"
    return agents.filter((agent) => agent.role === targetRole)
  }, [agents, roleFilter])

  // Calculate rankings
  const rankedAgents = useMemo(() => {
    const STARTING_BALANCE = 1000

    // Add PnL calculations
    const withPnl: RankedAgent[] = roleFilteredAgents.map((agent) => ({
      ...agent,
      rank: 0,
      pnl: agent.balance - STARTING_BALANCE,
      pnlPercent: ((agent.balance - STARTING_BALANCE) / STARTING_BALANCE) * 100,
      isCurrentUser: agent.id === currentAgentId,
    }))

    // Sort by selected criteria
    switch (rankBy) {
      case "profit":
        withPnl.sort((a, b) => b.pnl - a.pnl)
        break
      case "balance":
        withPnl.sort((a, b) => b.balance - a.balance)
        break
      case "reputation":
        withPnl.sort((a, b) => b.reputation - a.reputation)
        break
    }

    // Assign ranks
    withPnl.forEach((agent, index) => {
      agent.rank = index + 1
    })

    return withPnl
  }, [roleFilteredAgents, rankBy, currentAgentId])

  // Count by role for tabs
  const roleCounts = useMemo(() => ({
    traders: agents.filter((a) => a.role === "trader").length,
    moderators: agents.filter((a) => a.role === "moderator").length,
  }), [agents])

  // Filter by search
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return rankedAgents
    const query = searchQuery.toLowerCase()
    return rankedAgents.filter((a) => a.name.toLowerCase().includes(query))
  }, [rankedAgents, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage)
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAgents.slice(start, start + itemsPerPage)
  }, [filteredAgents, currentPage, itemsPerPage])

  // Get current user's agent
  const currentUserAgent = rankedAgents.find((a) => a.isCurrentUser)

  // Get top 3 for podium
  const top3 = rankedAgents.slice(0, 3)

  // Stats calculations (role-specific)
  const stats = useMemo(() => {
    if (rankedAgents.length === 0) return { totalAgents: 0, totalBalance: 0, avgReputation: 0, topProfit: 0 }
    return {
      totalAgents: rankedAgents.length,
      totalBalance: rankedAgents.reduce((sum, a) => sum + a.balance, 0),
      avgReputation: rankedAgents.reduce((sum, a) => sum + a.reputation, 0) / rankedAgents.length,
      topProfit: rankedAgents[0]?.pnl || 0,
    }
  }, [rankedAgents])

  const criteriaOptions: { value: RankingCriteria; label: string; icon: React.ReactNode }[] = [
    { value: "profit", label: "Profit", icon: <TrendingUp className="w-4 h-4" /> },
    { value: "balance", label: "Balance", icon: <Zap className="w-4 h-4" /> },
    { value: "reputation", label: "Reputation", icon: <Star className="w-4 h-4" /> },
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Leaderboard</span>
        </h1>
        <p className="text-gray-500">
          Top performing {roleFilter === "traders" ? "traders" : "moderators"} ranked by {rankBy}
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setRoleFilter("traders")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all",
            roleFilter === "traders"
              ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <User className="w-4 h-4" />
          Traders
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-bold",
            roleFilter === "traders" ? "bg-white/20" : "bg-gray-200"
          )}>
            {roleCounts.traders}
          </span>
        </button>
        <button
          onClick={() => setRoleFilter("moderators")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all",
            roleFilter === "moderators"
              ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Shield className="w-4 h-4" />
          Moderators
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-bold",
            roleFilter === "moderators" ? "bg-white/20" : "bg-gray-200"
          )}>
            {roleCounts.moderators}
          </span>
        </button>
      </div>

      {/* Current User's Rank Card - only show when viewing matching role tab */}
      {currentUserAgent && (
        (currentUserAgent.role === "trader" && roleFilter === "traders") ||
        (currentUserAgent.role === "moderator" && roleFilter === "moderators")
      ) && (
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Your Agent</span>
                </div>
                <div className="h-8 w-px bg-purple-200" />
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                  getAvatarStyle(currentUserAgent.rank, true)
                )}>
                  {currentUserAgent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{currentUserAgent.name}</p>
                  <p className="text-sm text-gray-500">
                    {currentUserAgent.balance.toLocaleString()} MT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Rank</p>
                  <p className="text-2xl font-bold text-purple-600">#{currentUserAgent.rank}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {currentUserAgent.role === "trader" ? "P&L" : "Earnings"}
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    currentUserAgent.pnl >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {currentUserAgent.pnl >= 0 ? "+" : ""}{currentUserAgent.pnl.toFixed(0)} MT
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Reputation</p>
                  <p className="text-xl font-bold">{currentUserAgent.reputation.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Agents</p>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {roleFilter === "traders" ? "Top Profit" : "Top Earnings"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  +{stats.topProfit.toFixed(0)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold">
                  {(stats.totalBalance / 1000).toFixed(1)}k MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Reputation</p>
                <p className="text-2xl font-bold">{stats.avgReputation.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="flex justify-center gap-8 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="w-32 h-40 rounded-xl" />
            ))}
          </div>
          <Card>
            <CardContent className="py-6">
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load leaderboard</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <div className="flex justify-center items-end gap-4 mb-10">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2",
                  getAvatarStyle(2, top3[1].isCurrentUser)
                )}>
                  {top3[1].name.charAt(0).toUpperCase()}
                </div>
                <Medal className="w-8 h-8 text-gray-400 mb-1" />
                <p className="font-semibold text-sm truncate max-w-[100px]">{top3[1].name}</p>
                <p className={cn(
                  "text-sm font-medium",
                  top3[1].pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {top3[1].pnl >= 0 ? "+" : ""}{top3[1].pnl.toFixed(0)} MT
                </p>
                <div className="w-24 h-20 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-8">
                <Crown className="w-10 h-10 text-yellow-500 mb-1" />
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2 ring-4 ring-yellow-400 ring-offset-2",
                  getAvatarStyle(1, top3[0].isCurrentUser)
                )}>
                  {top3[0].name.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold truncate max-w-[120px]">{top3[0].name}</p>
                <p className={cn(
                  "text-sm font-medium",
                  top3[0].pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {top3[0].pnl >= 0 ? "+" : ""}{top3[0].pnl.toFixed(0)} MT
                </p>
                <div className="w-28 h-28 bg-gradient-to-t from-yellow-400 to-yellow-200 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-700">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2",
                  getAvatarStyle(3, top3[2].isCurrentUser)
                )}>
                  {top3[2].name.charAt(0).toUpperCase()}
                </div>
                <Medal className="w-8 h-8 text-amber-600 mb-1" />
                <p className="font-semibold text-sm truncate max-w-[100px]">{top3[2].name}</p>
                <p className={cn(
                  "text-sm font-medium",
                  top3[2].pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {top3[2].pnl >= 0 ? "+" : ""}{top3[2].pnl.toFixed(0)} MT
                </p>
                <div className="w-24 h-16 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg mt-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-800">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Ranking Criteria & Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Criteria Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              {criteriaOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRankBy(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    rankBy === option.value
                      ? "bg-white text-purple-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <span className={cn(
                    rankBy === option.value ? "text-purple-500" : "text-gray-400"
                  )}>
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Full Rankings</span>
                <div className="flex items-center gap-4">
                  <ItemsPerPage
                    value={itemsPerPage}
                    onChange={(val) => {
                      setItemsPerPage(val)
                      setCurrentPage(1)
                    }}
                  />
                  <span className="text-sm font-normal text-gray-500">
                    {filteredAgents.length} agents
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAgents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? "No agents match your search"
                    : roleFilter === "traders"
                      ? "No trader agents registered yet"
                      : "No moderator agents registered yet"
                  }
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-sm font-medium text-gray-500">
                    <span className="col-span-1">Rank</span>
                    <span className="col-span-4">Agent</span>
                    <span className="col-span-2 text-right">Balance</span>
                    <span className="col-span-2 text-right">
                      {roleFilter === "traders" ? "P&L" : "Earnings"}
                    </span>
                    <span className="col-span-2 text-right">Reputation</span>
                    <span className="col-span-1 text-right">ROI</span>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-gray-100">
                    {paginatedAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className={cn(
                          "grid grid-cols-12 gap-4 py-4 items-center transition-colors",
                          agent.isCurrentUser
                            ? "bg-purple-50 -mx-6 px-6 border-l-4 border-purple-500"
                            : "hover:bg-gray-50",
                          agent.rank <= 3 && !agent.isCurrentUser && "bg-gradient-to-r from-transparent to-yellow-50/30"
                        )}
                      >
                        {/* Rank */}
                        <div className="col-span-1 flex items-center gap-2">
                          <span className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            getRankBadgeStyle(agent.rank)
                          )}>
                            {agent.rank}
                          </span>
                        </div>

                        {/* Agent Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium",
                            getAvatarStyle(agent.rank, agent.isCurrentUser)
                          )}>
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{agent.name}</p>
                              {agent.isCurrentUser && (
                                <Badge variant="purple" className="text-xs">You</Badge>
                              )}
                              {agent.rank <= 3 && getRankIcon(agent.rank)}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                              {agent.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="col-span-2 text-right">
                          <p className="font-semibold">{agent.balance.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">MT</p>
                        </div>

                        {/* P&L */}
                        <div className="col-span-2 text-right">
                          <p className={cn(
                            "font-semibold",
                            agent.pnl >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {agent.pnl >= 0 ? "+" : ""}{agent.pnl.toFixed(0)}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-xs">
                            {agent.pnl > 0 && <ChevronUp className="w-3 h-3 text-green-500" />}
                            {agent.pnl < 0 && <ChevronDown className="w-3 h-3 text-red-500" />}
                            {agent.pnl === 0 && <Minus className="w-3 h-3 text-gray-400" />}
                            <span className={cn(
                              agent.pnl >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {agent.pnlPercent >= 0 ? "+" : ""}{agent.pnlPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Reputation */}
                        <div className="col-span-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                style={{ width: `${Math.min(100, agent.reputation)}%` }}
                              />
                            </div>
                            <span className="font-medium text-sm w-10">
                              {agent.reputation.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* ROI */}
                        <div className="col-span-1 text-right">
                          <Badge
                            variant={agent.pnlPercent >= 0 ? "yes" : "no"}
                            className="text-xs"
                          >
                            {agent.pnlPercent >= 0 ? "+" : ""}{agent.pnlPercent.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredAgents.length}
                        itemsPerPage={itemsPerPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
