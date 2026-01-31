"use client"

import { useState, useEffect, useCallback } from "react"
import { Order } from "@/types"
import { ordersApi } from "@/lib/api"

interface UseOrdersOptions {
  status?: string
  market_id?: string
  limit?: number
}

interface UseOrdersResult {
  orders: Order[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useOrders(agentId: string | null, options?: UseOrdersOptions): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await ordersApi.list({
        agent_id: agentId,
        ...options,
      })
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }, [agentId, options?.status, options?.market_id, options?.limit])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return { orders, loading, error, refetch: fetchOrders }
}
