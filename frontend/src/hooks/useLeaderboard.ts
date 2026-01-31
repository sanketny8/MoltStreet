"use client"

import { useState, useEffect, useCallback } from "react"
import { Agent } from "@/types"
import { agentsApi } from "@/lib/api"

interface UseLeaderboardResult {
  agents: Agent[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useLeaderboard(limit: number = 20): UseLeaderboardResult {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await agentsApi.list({ limit, order_by: "reputation" })
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard")
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return { agents, loading, error, refetch: fetchLeaderboard }
}
