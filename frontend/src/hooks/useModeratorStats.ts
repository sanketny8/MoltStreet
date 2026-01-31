"use client"

import { useState, useEffect, useCallback } from "react"
import { ModeratorStats } from "@/types"
import { moderatorApi } from "@/lib/api"

interface UseModeratorStatsResult {
  stats: ModeratorStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useModeratorStats(moderatorId: string | null): UseModeratorStatsResult {
  const [stats, setStats] = useState<ModeratorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!moderatorId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await moderatorApi.getStats(moderatorId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch moderator stats")
    } finally {
      setLoading(false)
    }
  }, [moderatorId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
