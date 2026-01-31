import { useState, useEffect, useCallback } from "react"
import { pendingActionsApi } from "@/lib/api"
import { PendingAction, PendingActionListResponse, ActionStatus, ActionType } from "@/types"

interface UsePendingActionsOptions {
  agentId: string | null
  status?: ActionStatus
  actionType?: ActionType
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UsePendingActionsResult {
  actions: PendingAction[]
  total: number
  pendingCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  approve: (actionId: string) => Promise<PendingAction>
  reject: (actionId: string, reason?: string) => Promise<PendingAction>
  deleteAction: (actionId: string) => Promise<void>
}

export function usePendingActions(options: UsePendingActionsOptions): UsePendingActionsResult {
  const {
    agentId,
    status,
    actionType,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 30000,
  } = options

  const [actions, setActions] = useState<PendingAction[]>([])
  const [total, setTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActions = useCallback(async () => {
    if (!agentId) {
      setActions([])
      setTotal(0)
      setPendingCount(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await pendingActionsApi.list(agentId, {
        status,
        action_type: actionType,
        limit,
      })
      setActions(response.actions)
      setTotal(response.total)
      setPendingCount(response.pending_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pending actions")
    } finally {
      setLoading(false)
    }
  }, [agentId, status, actionType, limit])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  useEffect(() => {
    if (!autoRefresh || !agentId) return

    const interval = setInterval(fetchActions, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchActions, agentId])

  const approve = useCallback(async (actionId: string): Promise<PendingAction> => {
    if (!agentId) throw new Error("No agent ID")
    const result = await pendingActionsApi.approve(actionId, agentId)
    await fetchActions()
    return result
  }, [agentId, fetchActions])

  const reject = useCallback(async (actionId: string, reason?: string): Promise<PendingAction> => {
    if (!agentId) throw new Error("No agent ID")
    const result = await pendingActionsApi.reject(actionId, agentId, reason)
    await fetchActions()
    return result
  }, [agentId, fetchActions])

  const deleteAction = useCallback(async (actionId: string): Promise<void> => {
    if (!agentId) throw new Error("No agent ID")
    await pendingActionsApi.delete(actionId, agentId)
    await fetchActions()
  }, [agentId, fetchActions])

  return {
    actions,
    total,
    pendingCount,
    loading,
    error,
    refetch: fetchActions,
    approve,
    reject,
    deleteAction,
  }
}
