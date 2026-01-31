"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Order } from "@/types"
import { ordersApi } from "@/lib/api"
import { ShoppingCart, X, ExternalLink } from "lucide-react"

interface AgentOrdersTableProps {
  orders: Order[]
  loading?: boolean
  onOrderCancelled?: () => void
  onRefresh?: () => void
}

const SIDE_OPTIONS = [
  { value: "YES", label: "YES" },
  { value: "NO", label: "NO" },
]

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "partial", label: "Partial" },
  { value: "filled", label: "Filled" },
  { value: "cancelled", label: "Cancelled" },
]

export function AgentOrdersTable({ orders, loading, onOrderCancelled, onRefresh }: AgentOrdersTableProps) {
  // Pagination state
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter state
  const [search, setSearch] = useState("")
  const [sideFilter, setSideFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Reset page when filters change
  const resetPage = () => setPage(1)

  // Handle cancel
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

  // Client-side filtering and sorting
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(o =>
        o.market_id.toLowerCase().includes(searchLower) ||
        o.id.toLowerCase().includes(searchLower)
      )
    }

    // Side filter
    if (sideFilter) {
      result = result.filter(o => o.side === sideFilter)
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""

      switch (sortColumn) {
        case "side":
          aVal = a.side
          bVal = b.side
          break
        case "price":
          aVal = a.price
          bVal = b.price
          break
        case "size":
          aVal = a.size
          bVal = b.size
          break
        case "filled":
          aVal = a.size > 0 ? a.filled / a.size : 0
          bVal = b.size > 0 ? b.filled / b.size : 0
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "created_at":
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return 0
    })

    return result
  }, [orders, search, sideFilter, statusFilter, sortColumn, sortDirection])

  // Paginate
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredOrders.slice(start, start + itemsPerPage)
  }, [filteredOrders, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  // Build active filters
  const activeFilters = []
  if (sideFilter) {
    activeFilters.push({
      key: "side",
      label: "Side",
      value: sideFilter,
      displayValue: sideFilter,
      onRemove: () => { setSideFilter(undefined); resetPage() },
    })
  }
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
  if (search) {
    activeFilters.push({
      key: "search",
      label: "Search",
      value: search,
      displayValue: search,
      onRemove: () => { setSearch(""); resetPage() },
    })
  }

  const columns: Column<Order>[] = [
    {
      key: "market_id",
      label: "Market",
      width: "25%",
      render: (row) => (
        <Link href={`/markets/${row.market_id}`} className="group">
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-gray-600 group-hover:text-purple-600">
              {row.market_id.slice(0, 8)}...
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
          </div>
        </Link>
      ),
    },
    {
      key: "side",
      label: "Side",
      width: "10%",
      sortable: true,
      render: (row) => (
        <Badge variant={row.side === "YES" ? "yes" : "no"}>
          {row.side}
        </Badge>
      ),
    },
    {
      key: "price",
      label: "Price",
      width: "12%",
      sortable: true,
      render: (row) => (
        <span className="font-medium">{(row.price * 100).toFixed(0)}¢</span>
      ),
    },
    {
      key: "size",
      label: "Size",
      width: "10%",
      sortable: true,
      render: (row) => (
        <span>{row.size}</span>
      ),
    },
    {
      key: "filled",
      label: "Filled",
      width: "12%",
      sortable: true,
      render: (row) => {
        const percent = row.size > 0 ? (row.filled / row.size) * 100 : 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{percent.toFixed(0)}%</span>
          </div>
        )
      },
    },
    {
      key: "status",
      label: "Status",
      width: "12%",
      sortable: true,
      render: (row) => {
        const variants: Record<string, "secondary" | "purple" | "yes" | "destructive"> = {
          open: "secondary",
          partial: "purple",
          filled: "yes",
          cancelled: "destructive",
        }
        return (
          <Badge variant={variants[row.status] || "secondary"} className="capitalize">
            {row.status}
          </Badge>
        )
      },
    },
    {
      key: "total",
      label: "Total",
      width: "10%",
      render: (row) => (
        <span className="font-medium text-gray-900">
          {(row.price * row.size).toFixed(2)} MT
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "9%",
      render: (row) => {
        const canCancel = row.status === "open" || row.status === "partial"
        if (!canCancel) return null

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCancel(row)
            }}
            disabled={cancellingId === row.id}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {cancellingId === row.id ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </>
            )}
          </Button>
        )
      },
    },
  ]

  return (
    <div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); resetPage() }}
        searchPlaceholder="Search by market ID..."
        filters={[
          {
            key: "side",
            label: "All Sides",
            options: SIDE_OPTIONS,
            value: sideFilter,
            onChange: (v) => { setSideFilter(v); resetPage() },
          },
          {
            key: "status",
            label: "All Statuses",
            options: STATUS_OPTIONS,
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); resetPage() },
          },
        ]}
        activeFilters={activeFilters}
        onRefresh={onRefresh}
        loading={loading}
      />

      <DataTable
        data={paginatedOrders}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyMessage="No orders found"
        emptyIcon={<ShoppingCart className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={filteredOrders.length}
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
    </div>
  )
}
