"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Position } from "@/types"
import Link from "next/link"

interface PositionsTableProps {
  positions: Position[]
  loading?: boolean
}

export function PositionsTable({ positions, loading }: PositionsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No open positions</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">
            Browse Markets
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {positions.map((position) => {
        const hasYes = position.yes_shares > 0
        const hasNo = position.no_shares > 0

        return (
          <div
            key={position.market_id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <Link href={`/markets/${position.market_id}`}>
                <p className="font-medium text-sm truncate hover:text-purple-600">
                  {position.question || position.market_id}
                </p>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {hasYes && (
                  <>
                    <Badge variant="yes">YES</Badge>
                    <span className="text-xs text-gray-500">
                      {position.yes_shares} shares
                      {position.avg_yes_price && ` @ ${(position.avg_yes_price * 100).toFixed(0)}¢`}
                    </span>
                  </>
                )}
                {hasNo && (
                  <>
                    <Badge variant="no">NO</Badge>
                    <span className="text-xs text-gray-500">
                      {position.no_shares} shares
                      {position.avg_no_price && ` @ ${(position.avg_no_price * 100).toFixed(0)}¢`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right ml-4">
              <p className="text-xs text-gray-500">
                Status: {position.market_status || "open"}
              </p>
            </div>

            <Button variant="outline" size="sm" className="ml-4">
              View
            </Button>
          </div>
        )
      })}
    </div>
  )
}
