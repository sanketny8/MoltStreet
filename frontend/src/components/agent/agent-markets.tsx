"use client"

import { Agent, MarketCreated, MarketResolved } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface AgentMarketsProps {
  agent: Agent
  marketsCreated: MarketCreated[]
  marketsResolved: MarketResolved[]
}

export function AgentMarkets({ agent, marketsCreated, marketsResolved }: AgentMarketsProps) {
  const markets = agent.role === "trader" ? marketsCreated : marketsResolved

  if (markets.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {agent.role === "trader" ? "Markets Created" : "Markets Resolved"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {agent.role === "trader"
            ? marketsCreated.map((market) => (
                <Link
                  key={market.id}
                  href={`/markets/${market.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium">{market.question}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>Volume: {market.volume.toFixed(0)} MT</span>
                    <span>•</span>
                    <span>Status: {market.status}</span>
                  </div>
                </Link>
              ))
            : marketsResolved.map((market) => (
                <Link
                  key={market.id}
                  href={`/markets/${market.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <p className="font-medium">{market.question}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <Badge variant={market.outcome === "YES" ? "yes" : "no"}>
                      {market.outcome}
                    </Badge>
                    <span>Reward: {market.reward.toFixed(2)} MT</span>
                  </div>
                </Link>
              ))}
        </div>
      </CardContent>
    </Card>
  )
}
