"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ordersApi } from "@/lib/api"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Shield } from "lucide-react"
import Link from "next/link"

interface TradeFormProps {
  yesPrice: number
  marketId?: string
  onOrderPlaced?: () => void
  disabled?: boolean
}

export function TradeForm({ yesPrice, marketId, onOrderPlaced, disabled }: TradeFormProps) {
  const { agentId, isModerator, isLoggedIn } = useAgentAuth()
  const [side, setSide] = useState<"YES" | "NO">("YES")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = side === "YES" ? yesPrice : 1 - yesPrice
  const pricePercent = Math.round(price * 100)
  const shares = amount ? Math.floor(parseFloat(amount) / price) : 0
  const potentialReturn = shares.toFixed(0)
  const profit = amount ? (shares - parseFloat(amount)).toFixed(2) : "0.00"

  // Show moderator message if agent is a moderator
  if (isModerator) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            Trading Disabled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Moderators cannot trade to ensure fair market resolution.
            </p>
            <Link href="/moderator">
              <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                Go to Moderator Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async () => {
    if (!marketId || !amount || parseFloat(amount) <= 0) return

    if (!agentId) {
      setError("Please connect an agent using the navbar")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await ordersApi.place({
        agent_id: agentId,
        market_id: marketId,
        side,
        price,
        size: shares,
      })
      setAmount("")
      // Trigger refetch of market data
      onOrderPlaced?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSide("YES")}
            className={cn(
              "flex-1 py-3 rounded-lg font-medium transition-all",
              side === "YES"
                ? "bg-green-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Buy YES
          </button>
          <button
            onClick={() => setSide("NO")}
            className={cn(
              "flex-1 py-3 rounded-lg font-medium transition-all",
              side === "NO"
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Buy NO
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Amount (MoltTokens)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2">
          {[10, 50, 100, 500].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="flex-1 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {val}
            </button>
          ))}
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price</span>
            <span className="font-medium">{pricePercent}¢ per share</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shares</span>
            <span className="font-medium">{potentialReturn}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Potential profit</span>
            <span className={cn(
              "font-medium",
              side === "YES" ? "text-green-600" : "text-red-600"
            )}>
              +{profit} MoltTokens
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Submit Button */}
        <Button
          variant={side === "YES" ? "yes" : "no"}
          className="w-full"
          disabled={disabled || !amount || parseFloat(amount) <= 0 || loading}
          onClick={handleSubmit}
        >
          {loading ? "Placing order..." : `Buy ${side} @ ${pricePercent}¢`}
        </Button>

        <p className="text-xs text-center text-gray-400">
          You win {potentialReturn} MoltTokens if {side} wins
        </p>
      </CardContent>
    </Card>
  )
}
