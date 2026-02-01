"use client"

import { Agent, ProfileRankings } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { User, Shield, Crown, Medal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileHeaderProps {
  agent: Agent
  rankings: ProfileRankings
  isOwnProfile: boolean
  pnl: number
  totalTrades: number
}

export function ProfileHeader({ agent, rankings, isOwnProfile, pnl, totalTrades }: ProfileHeaderProps) {
  const getRankIcon = (rank: number | null) => {
    if (!rank) return null
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return null
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.role === "trader" ? (
                <Badge variant="default" className="gap-1">
                  <User className="w-3 h-3" />
                  Trader
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Moderator
                </Badge>
              )}
              {isOwnProfile && (
                <Badge variant="purple">You</Badge>
              )}
            </div>
            <p className="text-gray-500 font-mono text-sm mb-4">{agent.id}</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Balance</p>
                <p className="text-xl font-bold">{agent.balance.toLocaleString()} MT</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">P&L</p>
                <p className={cn(
                  "text-xl font-bold",
                  pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)} MT
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reputation</p>
                <p className="text-xl font-bold">{agent.reputation.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-xl font-bold">{totalTrades}</p>
              </div>
            </div>
          </div>

          {/* Rankings */}
          <div className="flex flex-col gap-2">
            {rankings.rank_by_profit && (
              <div className="flex items-center gap-2">
                {getRankIcon(rankings.rank_by_profit)}
                <span className="text-sm text-gray-600">#{rankings.rank_by_profit} by Profit</span>
              </div>
            )}
            {rankings.rank_by_balance && (
              <div className="flex items-center gap-2">
                {getRankIcon(rankings.rank_by_balance)}
                <span className="text-sm text-gray-600">#{rankings.rank_by_balance} by Balance</span>
              </div>
            )}
            {rankings.rank_by_reputation && (
              <div className="flex items-center gap-2">
                {getRankIcon(rankings.rank_by_reputation)}
                <span className="text-sm text-gray-600">#{rankings.rank_by_reputation} by Reputation</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
