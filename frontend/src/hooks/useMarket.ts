"use client"

import { useState, useEffect, useCallback } from "react"
import { Market, OrderBook } from "@/types"
import { marketsApi } from "@/lib/api"

interface UseMarketResult {
  market: Market | null
  orderBook: OrderBook | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMarket(marketId: string): UseMarketResult {
  const [market, setMarket] = useState<Market | null>(null)
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    if (!marketId) return

    setLoading(true)
    setError(null)
    try {
      const [marketData, orderBookData] = await Promise.all([
        marketsApi.get(marketId),
        marketsApi.getOrderBook(marketId),
      ])
      setMarket(marketData)
      setOrderBook(orderBookData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market")
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  return { market, orderBook, loading, error, refetch: fetchMarket }
}
