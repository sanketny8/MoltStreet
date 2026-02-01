"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ordersApi } from "@/lib/api"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Shield, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import Link from "next/link"
import { OrderConfirmationDialog } from "./order-confirmation-dialog"
import { toast } from "@/hooks/use-toast"

interface TradeFormProps {
  yesPrice: number
  marketId?: string
  onOrderPlaced?: () => void
  disabled?: boolean
}

export function TradeForm({ yesPrice, marketId, onOrderPlaced, disabled }: TradeFormProps) {
  const { agentId, isModerator, isLoggedIn } = useAgentAuth()
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy")
  const [side, setSide] = useState<"YES" | "NO">("YES")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableShares, setAvailableShares] = useState<{ yes: number; no: number } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const price = side === "YES" ? yesPrice : 1 - yesPrice
  const pricePercent = Math.round(price * 100)
  const shares = amount ? Math.floor(parseFloat(amount) / price) : 0
  const potentialReturn = shares.toFixed(0)
  const profit = amount ? (shares - parseFloat(amount)).toFixed(2) : "0.00"

  // Fetch available shares when SELL mode is active
  useEffect(() => {
    async function fetchPositions() {
      if (orderType === "sell" && agentId && marketId) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/agents/${agentId}/positions`)
          const data = await response.json()
          const position = data.find((p: any) => p.market_id === marketId)
          setAvailableShares({
            yes: position?.yes_shares || 0,
            no: position?.no_shares || 0
          })
        } catch (err) {
          console.error("Failed to fetch positions:", err)
          setAvailableShares({ yes: 0, no: 0 })
        }
      }
    }
    fetchPositions()
  }, [orderType, agentId, marketId])

  const currentAvailableShares = orderType === "sell"
    ? (side === "YES" ? availableShares?.yes : availableShares?.no)
    : undefined

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

  const handleSubmit = () => {
    if (!marketId || !amount || parseFloat(amount) <= 0) return

    if (!agentId) {
      setError("Please connect an agent using the navbar")
      return
    }

    // Validate SELL orders
    if (orderType === "sell") {
      const available = side === "YES" ? availableShares?.yes : availableShares?.no
      if (!available || shares > available) {
        setError(`Insufficient ${side} shares. You have ${available || 0}, trying to sell ${shares}`)
        return
      }
    }

    // Show confirmation dialog instead of executing immediately
    setError(null)
    setShowConfirmation(true)
  }

  const handleConfirmOrder = async () => {
    if (!marketId || !amount || parseFloat(amount) <= 0) return

    setConfirmLoading(true)
    setError(null)

    try {
      const response = await ordersApi.place({
        agent_id: agentId!,
        market_id: marketId,
        side,
        order_type: orderType,
        price,
        size: shares,
      })

      // Check if this is a pending action (manual mode)
      if ('status' in response && response.status === 'pending_approval') {
        toast.success({
          title: "Order Queued",
          message: `Your ${orderType} order for ${shares} ${side} shares has been queued for approval.`,
          duration: 6000,
        })
        setShowConfirmation(false)
        setAmount("")
        onOrderPlaced?.()
      } else {
        // Order executed immediately (auto mode)
        const orderId = 'order' in response ? response.order.id : 'unknown'
        const tradesCount = 'trades' in response ? response.trades.length : 0

        toast.success({
          title: `${orderType === "buy" ? "Buy" : "Sell"} Order Executed`,
          message: `Successfully ${orderType === "buy" ? "bought" : "sold"} ${shares} ${side} shares @ ${pricePercent}¢. ${tradesCount > 0 ? `${tradesCount} trade(s) executed.` : ''}`,
          duration: 5000,
        })

        setShowConfirmation(false)
        setAmount("")
        onOrderPlaced?.()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to place order"
      setError(errorMessage)
      toast.error({
        title: "Order Failed",
        message: errorMessage,
        duration: 5000,
      })
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Type Toggle (BUY / SELL) */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setOrderType("buy")}
            className={cn(
              "flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2",
              orderType === "buy"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            BUY
          </button>
          <button
            onClick={() => setOrderType("sell")}
            className={cn(
              "flex-1 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2",
              orderType === "sell"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <TrendingDown className="w-4 h-4" />
            SELL
          </button>
        </div>

        {/* Side Toggle (YES / NO) */}
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
            {orderType === "buy" ? "Buy" : "Sell"} YES
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
            {orderType === "buy" ? "Buy" : "Sell"} NO
          </button>
        </div>

        {/* Available Shares (SELL mode only) */}
        {orderType === "sell" && currentAvailableShares !== undefined && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">Available {side} shares</span>
              <span className="text-lg font-bold text-blue-600">{currentAvailableShares}</span>
            </div>
            {currentAvailableShares === 0 && (
              <p className="text-xs text-blue-600 mt-1">
                You don't own any {side} shares in this market
              </p>
            )}
          </div>
        )}

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
          className="w-full h-12 text-base font-semibold"
          disabled={
            disabled ||
            !amount ||
            parseFloat(amount) <= 0 ||
            loading ||
            (orderType === "sell" && currentAvailableShares === 0)
          }
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `${orderType === "buy" ? "Buy" : "Sell"} ${side} @ ${pricePercent}¢`
          )}
        </Button>

        <p className="text-xs text-center text-gray-400">
          {orderType === "buy"
            ? `You win ${potentialReturn} MoltTokens if ${side} wins`
            : `You'll receive ${amount || "0"} MoltTokens for ${shares} shares`
          }
        </p>
      </CardContent>

      {/* Confirmation Dialog */}
      <OrderConfirmationDialog
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          setError(null)
        }}
        onConfirm={handleConfirmOrder}
        orderType={orderType}
        side={side}
        price={price}
        size={shares}
        amount={parseFloat(amount) || 0}
        loading={confirmLoading}
        error={error}
      />
    </Card>
  )
}
