"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Store } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useAdmin } from "@/components/admin/AdminProvider"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { AdminMarket } from "@/types/admin"

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "resolved", label: "Resolved" },
]

const columns: Column<AdminMarket>[] = [
  {
    key: "question",
    label: "Question",
    render: (row) => (
      <span className="line-clamp-1 max-w-[300px]" title={row.question}>
        {row.question}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "100px",
    sortable: true,
    render: (row) => {
      const variant =
        row.status === "open"
          ? "yes"
          : row.status === "resolved"
          ? "secondary"
          : "outline"
      return (
        <Badge variant={variant} className="capitalize">
          {row.status}
        </Badge>
      )
    },
  },
  {
    key: "outcome",
    label: "Outcome",
    width: "80px",
    render: (row) =>
      row.outcome ? (
        <Badge variant={row.outcome === "YES" ? "yes" : "no"}>
          {row.outcome}
        </Badge>
      ) : (
        <span className="text-gray-400">-</span>
      ),
  },
  {
    key: "yes_price",
    label: "Yes Price",
    width: "90px",
    render: (row) => (
      <span className="font-medium text-green-600">
        {(row.yes_price * 100).toFixed(0)}%
      </span>
    ),
  },
  {
    key: "volume",
    label: "Volume",
    width: "100px",
    sortable: true,
    render: (row) => (
      <span className="font-medium">{row.volume.toFixed(0)}</span>
    ),
  },
  {
    key: "deadline",
    label: "Deadline",
    width: "120px",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.deadline).toLocaleDateString()}
      </span>
    ),
  },
]

export default function AdminMarketsPage() {
  const { adminKey } = useAdmin()
  const [markets, setMarkets] = useState<AdminMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Filters
  const [status, setStatus] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("deadline")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const loadData = useCallback(async () => {
    if (!adminKey) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminApi.getMarkets(adminKey, {
        status,
        limit: 500, // Fetch more for client-side filtering
      })
      setMarkets(data as unknown as AdminMarket[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets")
    } finally {
      setLoading(false)
    }
  }, [adminKey, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [status, search])

  // Client-side filtering and sorting
  const filteredMarkets = useMemo(() => {
    let result = [...markets]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((m) =>
        m.question.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof AdminMarket]
      const bVal = b[sortColumn as keyof AdminMarket]

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
  }, [markets, search, sortColumn, sortDirection])

  // Paginate
  const paginatedMarkets = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredMarkets.slice(start, start + itemsPerPage)
  }, [filteredMarkets, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const activeFilters = []
  if (status) {
    const option = STATUS_OPTIONS.find((o) => o.value === status)
    activeFilters.push({
      key: "status",
      label: "Status",
      value: status,
      displayValue: option?.label || status,
      onRemove: () => setStatus(undefined),
    })
  }
  if (search) {
    activeFilters.push({
      key: "search",
      label: "Search",
      value: search,
      displayValue: search,
      onRemove: () => setSearch(""),
    })
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-600">
        <p className="font-medium">Error loading markets</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="Markets"
        subtitle="All prediction markets"
        onRefresh={loadData}
        loading={loading}
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by question..."
        filters={[
          {
            key: "status",
            label: "All Status",
            options: STATUS_OPTIONS,
            value: status,
            onChange: setStatus,
          },
        ]}
        activeFilters={activeFilters}
        onRefresh={loadData}
        loading={loading}
      />

      <DataTable
        data={paginatedMarkets}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyMessage="No markets found"
        emptyIcon={<Store className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={filteredMarkets.length}
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
