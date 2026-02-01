"use client"

import { RecentTrade, ActivePosition } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface RecentActivityProps {
  recentTrades: RecentTrade[]
  activePositions: ActivePosition[]
}

export function RecentActivity({ recentTrades, activePositions }: RecentActivityProps) {
  return (
    <>
      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTrades.slice(0, 10).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{trade.market_question}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant={trade.side === "YES" ? "yes" : "no"} className="text-xs">
                        {trade.side}
                      </Badge>
                      <span>{trade.role}</span>
                      <span>•</span>
                      <span>{trade.size} shares @ {trade.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {trade.pnl !== null && (
                      <p className={cn(
                        "font-bold",
                        trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)} MT
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Positions */}
      {activePositions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePositions.map((position) => (
                <Link
                  key={position.market_id}
                  href={`/markets/${position.market_id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium mb-2">{position.market_question}</p>
                  <div className="flex items-center gap-4 text-sm">
                    {position.yes_shares > 0 && (
                      <span className="text-green-600">
                        YES: {position.yes_shares} @ {position.avg_yes_price?.toFixed(2) || "N/A"}
                      </span>
                    )}
                    {position.no_shares > 0 && (
                      <span className="text-red-600">
                        NO: {position.no_shares} @ {position.avg_no_price?.toFixed(2) || "N/A"}
                      </span>
                    )}
                    {position.unrealized_pnl !== null && (
                      <span className={cn(
                        "ml-auto font-bold",
                        position.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {position.unrealized_pnl >= 0 ? "+" : ""}{position.unrealized_pnl.toFixed(2)} MT
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
