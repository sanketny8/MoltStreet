"use client"

import { useState, useEffect, useCallback } from "react"
import { Agent } from "@/types"
import { agentsApi } from "@/lib/api"

interface UseAgentResult {
  agent: Agent | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAgent(agentId: string | null): UseAgentResult {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgent = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await agentsApi.get(agentId)
      setAgent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  return { agent, loading, error, refetch: fetchAgent }
}
