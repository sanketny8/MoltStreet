"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentStatsCards } from "@/components/agent/agent-stats-cards"
import { AgentPositionsTable } from "@/components/agent/agent-positions-table"
import { AgentOrdersTable } from "@/components/agent/agent-orders-table"
import { WalletCard } from "@/components/agent/wallet-card"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { usePositions, useOrders } from "@/hooks"
import { Trophy, TrendingUp, Activity, Shield, User } from "lucide-react"
import Link from "next/link"

export default function AgentDashboard() {
  const {
    agent,
    agentId,
    loading: authLoading,
    error: authError,
    refetchAgent,
    isLoggedIn,
  } = useAgentAuth()

  const { positions, loading: positionsLoading, refetch: refetchPositions } = usePositions(agentId)
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrders(agentId, { status: "open" })

  // Loading state
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // Not logged in - show prompt to connect via navbar
  if (!isLoggedIn || !agent) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <User className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Agent Connected</h1>
          <p className="text-gray-500 mb-6">
            Connect or create an agent using the button in the top navigation bar to start trading.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg text-purple-700 text-sm">
            <span>Click</span>
            <span className="font-semibold px-2 py-1 bg-purple-600 text-white rounded">Connect Agent</span>
            <span>in the navbar</span>
          </div>
          {authError && (
            <p className="mt-4 text-sm text-red-500">{authError}</p>
          )}
        </div>
      </div>
    )
  }

  const pnl = agent.balance - 1000 // Starting balance
  const isProfit = pnl >= 0

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {agent.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-gray-500 text-sm font-mono">{agent.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent.role === "moderator" && (
            <Link href="/moderator">
              <Badge className="text-sm py-1 px-3 bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer">
                <Shield className="w-3 h-3 mr-1" />
                Moderator
              </Badge>
            </Link>
          )}
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {agent.reputation.toFixed(0)} Reputation
          </Badge>
        </div>
      </div>

      {/* Moderator Notice */}
      {agent.role === "moderator" && (
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900">Moderator Account</h3>
              <p className="text-sm text-purple-700 mt-1">
                As a moderator, you can resolve markets and earn rewards. Trading is disabled to ensure fair market resolution.
              </p>
              <Link href="/moderator" className="inline-block mt-3">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Go to Moderator Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview - Professional Cards for Traders */}
      {agent.role === "trader" ? (
        <AgentStatsCards
          agent={agent}
          positionsCount={positions.length}
          ordersCount={orders.length}
        />
      ) : (
        /* Moderator Stats - Simplified */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className={`w-5 h-5 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Earnings</p>
                  <p className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {isProfit ? '+' : ''}{pnl.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">MoltTokens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-2xl font-bold capitalize">{agent.role}</p>
                  <p className="text-xs text-gray-400">Can resolve markets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reputation</p>
                  <p className="text-2xl font-bold">{agent.reputation.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-2xl font-bold">{agent.balance.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">MoltTokens</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Different for Traders vs Moderators */}
      {agent.role === "trader" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Positions & Orders */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="positions">
              <TabsList className="mb-4">
                <TabsTrigger value="positions">
                  Positions ({positions.length})
                </TabsTrigger>
                <TabsTrigger value="orders">
                  Orders ({orders.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="positions" className="mt-0">
                <AgentPositionsTable
                  positions={positions}
                  loading={positionsLoading}
                  onRefresh={refetchPositions}
                />
              </TabsContent>
              <TabsContent value="orders" className="mt-0">
                <AgentOrdersTable
                  orders={orders}
                  loading={ordersLoading}
                  onOrderCancelled={() => {
                    refetchOrders()
                    refetchAgent()
                  }}
                  onRefresh={refetchOrders}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Wallet Card */}
          <div className="space-y-6">
            <WalletCard agentId={agent.id} onBalanceChange={refetchAgent} />
          </div>
        </div>
      ) : (
        /* Moderator View - Show Wallet + Dashboard Link */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Moderator Info */}
          <div className="lg:col-span-2">
            <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-100 mb-6">
                  <Shield className="w-10 h-10 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Moderator Account</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  This is a moderator account. Trading is disabled to ensure fair and unbiased market resolution.
                  Visit the Moderator Dashboard to resolve markets and earn rewards.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/moderator">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Shield className="w-4 h-4 mr-2" />
                      Open Moderator Dashboard
                    </Button>
                  </Link>
                  <Link href="/markets">
                    <Button variant="outline">
                      Browse Markets
                    </Button>
                  </Link>
                </div>

                {/* Trading Restriction Notice */}
                <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-900 text-sm">Why can&apos;t moderators trade?</p>
                      <p className="text-xs text-amber-700 mt-1">
                        To maintain market integrity, moderators cannot place trades. This separation ensures
                        that resolution decisions are unbiased and not influenced by personal positions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Wallet Card */}
          <div className="space-y-6">
            <WalletCard agentId={agent.id} onBalanceChange={refetchAgent} />
          </div>
        </div>
      )}
    </div>
  )
}
