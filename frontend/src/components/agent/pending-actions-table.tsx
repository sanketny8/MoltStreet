"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePendingActions } from "@/hooks/usePendingActions"
import { PendingAction, ActionType, ActionStatus } from "@/types"

interface PendingActionsTableProps {
  agentId: string | null
  onActionApproved?: () => void
}

function getActionTypeLabel(type: ActionType): string {
  switch (type) {
    case "place_order":
      return "Place Order"
    case "cancel_order":
      return "Cancel Order"
    case "transfer":
      return "Transfer"
    case "create_market":
      return "Create Market"
    default:
      return type
  }
}

function getStatusBadge(status: ActionStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
    case "expired":
      return <Badge variant="outline">Expired</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function formatPayload(action: PendingAction): string {
  const payload = action.action_payload
  switch (action.action_type) {
    case "place_order":
      return `${payload.side} ${payload.size} shares @ $${payload.price}`
    case "cancel_order":
      return `Order ${String(payload.order_id).slice(0, 8)}...`
    case "transfer":
      return `${payload.amount} MT to ${String(payload.to_agent_id).slice(0, 8)}...`
    default:
      return JSON.stringify(payload).slice(0, 50)
  }
}

function formatTimeRemaining(expiresAt: string): string {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) return "Expired"

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function ActionRow({
  action,
  onApprove,
  onReject,
  loading,
}: {
  action: PendingAction
  onApprove: () => void
  onReject: () => void
  loading: boolean
}) {
  const isPending = action.status === "pending"
  const isExpired = new Date(action.expires_at) < new Date()

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {getActionTypeLabel(action.action_type)}
          </span>
          {getStatusBadge(action.status)}
        </div>
        <p className="text-sm text-gray-600 truncate">
          {formatPayload(action)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {isPending && !isExpired ? (
            <>Expires in {formatTimeRemaining(action.expires_at)}</>
          ) : (
            <>Created {new Date(action.created_at).toLocaleString()}</>
          )}
        </p>
      </div>

      {isPending && !isExpired && (
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={loading}
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "..." : "Approve"}
          </Button>
        </div>
      )}

      {action.status === "approved" && action.result_data && (
        <div className="ml-4 text-xs text-green-600">
          Executed
        </div>
      )}

      {action.status === "rejected" && action.rejection_reason && (
        <div className="ml-4 text-xs text-red-600 max-w-[150px] truncate">
          {action.rejection_reason}
        </div>
      )}
    </div>
  )
}

export function PendingActionsTable({ agentId, onActionApproved }: PendingActionsTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActionStatus | undefined>(undefined)

  const {
    actions,
    pendingCount,
    loading,
    error,
    refetch,
    approve,
    reject,
  } = usePendingActions({
    agentId,
    status: filter,
    autoRefresh: true,
    refreshInterval: 15000,
  })

  const handleApprove = async (actionId: string) => {
    setProcessingId(actionId)
    try {
      await approve(actionId)
      onActionApproved?.()
    } catch (err) {
      console.error("Failed to approve:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (actionId: string) => {
    setProcessingId(actionId)
    try {
      await reject(actionId)
    } catch (err) {
      console.error("Failed to reject:", err)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading && actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Pending Actions
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Review and approve trading actions from your agent
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(undefined)}
            >
              All
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3 text-gray-300"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p className="font-medium">No pending actions</p>
            <p className="text-sm mt-1">
              Actions will appear here when your agent is in Manual Mode
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onApprove={() => handleApprove(action.id)}
                onReject={() => handleReject(action.id)}
                loading={processingId === action.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
