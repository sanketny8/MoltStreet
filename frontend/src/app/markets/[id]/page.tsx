"use client"

import { use } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { OrderBook } from "@/components/trading/order-book"
import { TradeForm } from "@/components/trading/trade-form"
import { PriceChart } from "@/components/trading/price-chart"
import { TradeHistory } from "@/components/trading/trade-history"
import { MarketComments } from "@/components/market/market-comments"
import { useMarket, useTrades } from "@/hooks"
import { formatCurrency, formatTimeRemaining } from "@/lib/utils"
import { ArrowLeft, Share2, Bookmark, Clock, DollarSign, TrendingUp, Activity, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { market, orderBook, loading, error, refetch } = useMarket(id)
  const { trades, loading: tradesLoading, refetch: refetchTrades } = useTrades({ market_id: id, limit: 50 })

  // Callback when order is placed - refetch all data
  const handleOrderPlaced = () => {
    refetch()
    refetchTrades()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-3/4 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Markets</span>
        </Link>
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load market</p>
          <p className="text-gray-500 text-sm">{error || "Market not found"}</p>
        </div>
      </div>
    )
  }

  const yesPercent = Math.round(market.yes_price * 100)
  const noPercent = Math.round((market.no_price ?? (1 - market.yes_price)) * 100)

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Markets</span>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Market Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="purple">{market.category || "General"}</Badge>
          {market.status === "open" && <Badge variant="yes">Live</Badge>}
          {market.status === "resolved" && (
            <Badge variant={market.outcome === "YES" ? "yes" : "no"}>
              Resolved: {market.outcome}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{market.question}</h1>
        {market.description && <p className="text-gray-500">{market.description}</p>}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart & Order Book */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Display with Spread Info */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* YES Price */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">YES Price</p>
                  <p className="text-3xl font-bold text-green-600">{yesPercent}¢</p>
                </div>
                {/* NO Price */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">NO Price</p>
                  <p className="text-3xl font-bold text-red-600">{noPercent}¢</p>
                </div>
                {/* Best Bid/Ask */}
                <div className="text-center border-l border-gray-200 pl-4">
                  <p className="text-sm text-gray-500 mb-1">Best Bid</p>
                  <p className="text-xl font-semibold text-green-600">
                    {orderBook?.best_bid != null ? `${Math.round(orderBook.best_bid * 100)}¢` : "—"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Best Ask</p>
                  <p className="text-xl font-semibold text-red-600">
                    {orderBook?.best_ask != null ? `${Math.round(orderBook.best_ask * 100)}¢` : "—"}
                  </p>
                </div>
              </div>
              {/* Spread indicator */}
              {orderBook?.spread != null && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center gap-8">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Spread</p>
                    <p className="text-sm font-medium text-gray-600">
                      {(orderBook.spread * 100).toFixed(1)}¢
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Mid Price</p>
                    <p className="text-sm font-medium text-purple-600">
                      {orderBook.mid_price != null ? `${Math.round(orderBook.mid_price * 100)}¢` : "—"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart trades={trades} loading={tradesLoading} />
            </CardContent>
          </Card>

          {/* Tabs for Order Book / Trades / About */}
          <Tabs defaultValue="orderbook">
            <TabsList>
              <TabsTrigger value="orderbook">Order Book</TabsTrigger>
              <TabsTrigger value="trades">Recent Trades</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>
            <TabsContent value="orderbook">
              <Card>
                <CardContent className="pt-6">
                  <OrderBook orderBook={orderBook} loading={loading} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="trades">
              <Card>
                <CardContent className="pt-6">
                  <TradeHistory trades={trades} loading={tradesLoading} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="about">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-1">Resolution Criteria</h4>
                      <p className="text-sm text-gray-500">
                        {market.description || "No description provided."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Creator</h4>
                      <p className="text-sm text-gray-500 font-mono">{market.creator_id}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Created</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(market.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Trade Form & Stats */}
        <div className="space-y-6">
          {/* Trade Form */}
          <TradeForm
            yesPrice={market.yes_price}
            marketId={market.id}
            onOrderPlaced={handleOrderPlaced}
            disabled={market.status !== "open"}
          />

          {/* Market Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Volume</span>
                </div>
                <span className="font-medium">{formatCurrency(market.volume)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Total Trades</span>
                </div>
                <span className="font-medium">{trades.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Open Orders</span>
                </div>
                <span className="font-medium">
                  {(orderBook?.bids?.length || 0) + (orderBook?.asks?.length || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Liquidity</span>
                </div>
                <span className="font-medium">
                  {(() => {
                    const bidSize = orderBook?.bids?.reduce((sum, b) => sum + b.size, 0) || 0
                    const askSize = orderBook?.asks?.reduce((sum, a) => sum + a.size, 0) || 0
                    return bidSize + askSize
                  })()} shares
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Ends</span>
                </div>
                <span className="font-medium">{formatTimeRemaining(market.deadline)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Info (if resolved) */}
          {market.status === "resolved" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Outcome</span>
                  <Badge variant={market.outcome === "YES" ? "yes" : "no"}>
                    {market.outcome}
                  </Badge>
                </div>
                {market.resolved_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Resolved At</span>
                    <span className="text-sm font-medium">
                      {new Date(market.resolved_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {market.resolution_evidence && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-500 mb-1">Evidence</p>
                    <p className="text-sm">{market.resolution_evidence}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Comments Section - Below Market Details */}
      <div className="mt-8">
        <MarketComments marketId={id} />
      </div>
    </div>
  )
}
