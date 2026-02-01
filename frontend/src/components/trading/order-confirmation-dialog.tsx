"use client"

import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  orderType: "buy" | "sell"
  side: "YES" | "NO"
  price: number
  size: number
  amount: number
  loading?: boolean
  error?: string | null
}

export function OrderConfirmationDialog({
  open,
  onClose,
  onConfirm,
  orderType,
  side,
  price,
  size,
  amount,
  loading = false,
  error = null,
}: OrderConfirmationDialogProps) {
  const pricePercent = Math.round(price * 100)
  const isBuy = orderType === "buy"
  const sideColor = side === "YES" ? "green" : "red"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {isBuy ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          Confirm {isBuy ? "Buy" : "Sell"} Order
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        {error ? (
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Order Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Order Type</span>
                <Badge variant={isBuy ? "yes" : "no"} className="capitalize">
                  {orderType}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Side</span>
                <Badge variant={side === "YES" ? "yes" : "no"}>
                  {side}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Price</span>
                <span className="font-mono font-semibold text-gray-900">
                  {pricePercent}¢ per share
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Shares</span>
                <span className="font-mono font-semibold text-gray-900">
                  {size.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {isBuy ? "Total Cost" : "Total Proceeds"}
                  </span>
                  <span className={cn(
                    "font-mono font-bold text-lg",
                    isBuy ? "text-gray-900" : "text-green-600"
                  )}>
                    {amount.toFixed(2)} MT
                  </span>
                </div>
              </div>
            </div>

            {/* Potential Outcome (for BUY orders) */}
            {isBuy && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900 font-medium mb-1">
                  If {side} wins:
                </p>
                <p className="text-sm text-blue-700">
                  You'll receive <span className="font-semibold">{size.toLocaleString()} MoltTokens</span> (1 MT per share)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Potential profit: <span className="font-medium">+{(size - amount).toFixed(2)} MT</span>
                </p>
              </div>
            )}

            {/* Warning for SELL orders */}
            {!isBuy && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900 font-medium mb-1">
                  Selling {side} shares
                </p>
                <p className="text-sm text-amber-700">
                  You'll receive <span className="font-semibold">{amount.toFixed(2)} MT</span> for {size.toLocaleString()} shares
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 text-center pt-2">
              By confirming, you agree to execute this order at the specified price.
            </p>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant={side === "YES" ? "yes" : "no"}
          onClick={onConfirm}
          disabled={loading || !!error}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {isBuy ? "Buy" : "Sell"} {side}
            </>
          )}
        </Button>
      </DialogFooter>

      <DialogClose onClose={onClose} />
    </Dialog>
  )
}
