"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Order } from "@/types"
import { ordersApi } from "@/lib/api"
import Link from "next/link"
import { X } from "lucide-react"

interface OrdersTableProps {
  orders: Order[]
  loading?: boolean
  onOrderCancelled?: () => void
}

export function OrdersTable({ orders, loading, onOrderCancelled }: OrdersTableProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (order: Order) => {
    setCancellingId(order.id)
    try {
      await ordersApi.cancel(order.id, order.agent_id)
      onOrderCancelled?.()
    } catch (err) {
      console.error("Failed to cancel order:", err)
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No active orders</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const fillPercent = (order.filled / order.size) * 100

        return (
          <div
            key={order.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <Link href={`/markets/${order.market_id}`}>
                <p className="font-medium text-sm truncate hover:text-purple-600 font-mono">
                  {order.market_id.slice(0, 8)}...
                </p>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={order.side === "YES" ? "yes" : "no"}>
                  {order.side}
                </Badge>
                <span className="text-xs text-gray-500">
                  {order.size} @ {(order.price * 100).toFixed(0)}¢
                </span>
                {order.filled > 0 && (
                  <span className="text-xs text-purple-600">
                    ({fillPercent.toFixed(0)}% filled)
                  </span>
                )}
                <Badge variant="secondary" className="text-xs">
                  {order.status}
                </Badge>
              </div>
            </div>

            <div className="text-right ml-4">
              <p className="font-medium text-sm">
                {(order.price * order.size).toFixed(2)} MT
              </p>
              <p className="text-xs text-gray-500">
                Total cost
              </p>
            </div>

            {(order.status === "open" || order.status === "partial") && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 text-gray-400 hover:text-red-500"
                onClick={() => handleCancel(order)}
                disabled={cancellingId === order.id}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
