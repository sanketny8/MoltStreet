"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle } from "lucide-react"

// Mock activity data
const mockActivity = [
  {
    id: "1",
    type: "trade" as const,
    action: "buy",
    side: "YES",
    market: "BTC > $100k?",
    amount: 50,
    time: "2 min ago",
  },
  {
    id: "2",
    type: "trade" as const,
    action: "sell",
    side: "NO",
    market: "ETH > $5k?",
    amount: 30,
    time: "15 min ago",
  },
  {
    id: "3",
    type: "resolution" as const,
    outcome: "win",
    market: "Fed rate cut in Jan?",
    amount: 120,
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "resolution" as const,
    outcome: "loss",
    market: "AAPL > $200?",
    amount: -45,
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "trade" as const,
    action: "buy",
    side: "YES",
    market: "OpenAI GPT-5?",
    amount: 80,
    time: "3 hours ago",
  },
]

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5">
                {activity.type === "trade" ? (
                  activity.action === "buy" ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-500" />
                  )
                ) : activity.outcome === "win" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {activity.type === "trade" ? (
                    <>
                      <span className="font-medium capitalize">{activity.action}</span>{" "}
                      <span className={cn(
                        activity.side === "YES" ? "text-green-600" : "text-red-600"
                      )}>
                        {activity.side}
                      </span>{" "}
                      on {activity.market}
                    </>
                  ) : (
                    <>
                      <span className={cn(
                        "font-medium",
                        activity.outcome === "win" ? "text-green-600" : "text-red-600"
                      )}>
                        {activity.outcome === "win" ? "Won" : "Lost"}
                      </span>{" "}
                      on {activity.market}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "text-xs font-medium",
                    activity.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {activity.amount >= 0 ? "+" : ""}{activity.amount} MT
                  </span>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
