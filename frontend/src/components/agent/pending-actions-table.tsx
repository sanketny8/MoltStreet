"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { usePendingActions } from "@/hooks/usePendingActions"
import { PendingAction, ActionType, ActionStatus } from "@/types"
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PendingActionsTableProps {
  agentId: string | null
  onActionApproved?: () => void
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
]

const ACTION_TYPE_OPTIONS = [
  { value: "place_order", label: "Place Order" },
  { value: "cancel_order", label: "Cancel Order" },
  { value: "transfer", label: "Transfer" },
  { value: "create_market", label: "Create Market" },
]

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
  const payload = action.action_payload || {}
  switch (action.action_type) {
    case "place_order":
      const price = payload.price != null ? payload.price : 0
      const size = payload.size != null ? payload.size : 0
      const side = payload.side || "YES"
      return `${side} ${size} shares @ $${price}`
    case "cancel_order":
      return `Order ${String(payload.order_id || "").slice(0, 8)}...`
    case "transfer":
      const amount = payload.amount != null ? payload.amount : 0
      return `${amount} MT to ${String(payload.to_agent_id || "").slice(0, 8)}...`
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

export function PendingActionsTable({ agentId, onActionApproved }: PendingActionsTableProps) {
  // Pagination state
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter state
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [actionTypeFilter, setActionTypeFilter] = useState<string | undefined>()

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Processing state
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Reset page when filters change
  const resetPage = () => setPage(1)

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
    status: statusFilter as ActionStatus | undefined,
    actionType: actionTypeFilter as ActionType | undefined,
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

  // Client-side filtering and sorting
  const filteredActions = useMemo(() => {
    let result = [...actions]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(a =>
        a.id.toLowerCase().includes(searchLower) ||
        getActionTypeLabel(a.action_type).toLowerCase().includes(searchLower) ||
        formatPayload(a).toLowerCase().includes(searchLower)
      )
    }

    // Status and action type are already filtered by API, but we keep the filters
    // here for consistency and in case we want to do additional client-side filtering

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number | Date = ""
      let bVal: string | number | Date = ""

      switch (sortColumn) {
        case "action_type":
          aVal = getActionTypeLabel(a.action_type)
          bVal = getActionTypeLabel(b.action_type)
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "created_at":
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case "expires_at":
          aVal = new Date(a.expires_at).getTime()
          bVal = new Date(b.expires_at).getTime()
          break
        default:
          aVal = a.id
          bVal = b.id
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [actions, search, statusFilter, actionTypeFilter, sortColumn, sortDirection])

  // Paginate
  const paginatedActions = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredActions.slice(start, start + itemsPerPage)
  }, [filteredActions, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  // Build active filters
  const activeFilters = []
  if (statusFilter) {
    const option = STATUS_OPTIONS.find(o => o.value === statusFilter)
    activeFilters.push({
      key: "status",
      label: "Status",
      value: statusFilter,
      displayValue: option?.label || statusFilter,
      onRemove: () => { setStatusFilter(undefined); resetPage() },
    })
  }
  if (actionTypeFilter) {
    const option = ACTION_TYPE_OPTIONS.find(o => o.value === actionTypeFilter)
    activeFilters.push({
      key: "actionType",
      label: "Type",
      value: actionTypeFilter,
      displayValue: option?.label || actionTypeFilter,
      onRemove: () => { setActionTypeFilter(undefined); resetPage() },
    })
  }
  if (search) {
    activeFilters.push({
      key: "search",
      label: "Search",
      value: search,
      displayValue: search,
      onRemove: () => { setSearch(""); resetPage() },
    })
  }

  const columns: Column<PendingAction>[] = [
    {
      key: "action_type",
      label: "Type",
      width: "15%",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-sm">
          {getActionTypeLabel(row.action_type)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: "payload",
      label: "Details",
      width: "30%",
      render: (row) => (
        <p className="text-sm text-gray-600 truncate">
          {formatPayload(row)}
        </p>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      width: "15%",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "expires_at",
      label: "Expires",
      width: "15%",
      sortable: true,
      render: (row) => {
        const isExpired = new Date(row.expires_at) < new Date()
        const isPending = row.status === "pending"
        return (
          <span className={cn(
            "text-xs",
            isExpired ? "text-red-600" : isPending ? "text-amber-600" : "text-gray-500"
          )}>
            {isPending && !isExpired
              ? `In ${formatTimeRemaining(row.expires_at)}`
              : new Date(row.expires_at).toLocaleDateString()}
          </span>
        )
      },
    },
    {
      key: "actions",
      label: "",
      width: "13%",
      render: (row) => {
        const isPending = row.status === "pending"
        const isExpired = new Date(row.expires_at) < new Date()
        const isLoading = processingId === row.id

        if (!isPending || isExpired) {
          if (row.status === "approved" && row.result_data) {
            return (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Executed
              </div>
            )
          }
          if (row.status === "rejected" && row.rejection_reason) {
            return (
              <div className="text-xs text-red-600 max-w-[150px] truncate flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {row.rejection_reason}
              </div>
            )
          }
          return null
        }

        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                handleReject(row.id)
              }}
              disabled={isLoading}
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleApprove(row.id)
              }}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "..." : "Approve"}
            </Button>
          </div>
        )
      },
    },
  ]

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
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        <DataTableToolbar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); resetPage() }}
          searchPlaceholder="Search by ID, type, or details..."
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: (v) => { setStatusFilter(v); resetPage() },
            },
            {
              key: "actionType",
              label: "All Types",
              options: ACTION_TYPE_OPTIONS,
              value: actionTypeFilter,
              onChange: (v) => { setActionTypeFilter(v); resetPage() },
            },
          ]}
          activeFilters={activeFilters}
          onRefresh={refetch}
          loading={loading}
        />

        <DataTable
          data={paginatedActions}
          columns={columns}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="No pending actions"
          emptyIcon={<Clock className="h-8 w-8 text-gray-400" />}
          page={page}
          totalItems={filteredActions.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
          onItemsPerPageChange={(count) => {
            setItemsPerPage(count)
            setPage(1)
          }}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </CardContent>
    </Card>
  )
}
