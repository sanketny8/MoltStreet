"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ArrowLeftRight } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useAdmin } from "@/components/admin/AdminProvider"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { AdminTrade } from "@/types/admin"

const columns: Column<AdminTrade>[] = [
  {
    key: "market_id",
    label: "Market",
    width: "140px",
    render: (row) => (
      <span className="font-mono text-xs text-gray-500">
        {row.market_id.slice(0, 8)}...
      </span>
    ),
  },
  {
    key: "side",
    label: "Side",
    width: "70px",
    render: (row) => (
      <Badge variant={row.side === "YES" ? "yes" : "no"}>{row.side}</Badge>
    ),
  },
  {
    key: "buyer_id",
    label: "Buyer",
    width: "120px",
    render: (row) => (
      <span className="font-mono text-xs text-gray-500">
        {row.buyer_id.slice(0, 8)}...
      </span>
    ),
  },
  {
    key: "seller_id",
    label: "Seller",
    width: "120px",
    render: (row) => (
      <span className="font-mono text-xs text-gray-500">
        {row.seller_id.slice(0, 8)}...
      </span>
    ),
  },
  {
    key: "price",
    label: "Price",
    width: "80px",
    sortable: true,
    render: (row) => (
      <span className="font-medium">{(row.price * 100).toFixed(0)}%</span>
    ),
  },
  {
    key: "size",
    label: "Size",
    width: "70px",
    sortable: true,
    render: (row) => <span className="font-medium">{row.size}</span>,
  },
  {
    key: "total_fee",
    label: "Fee",
    width: "90px",
    sortable: true,
    render: (row) => (
      <span className="text-green-600">{row.total_fee.toFixed(4)}</span>
    ),
  },
  {
    key: "created_at",
    label: "Time",
    width: "160px",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.created_at).toLocaleString()}
      </span>
    ),
  },
]

export default function AdminTradesPage() {
  const { adminKey } = useAdmin()
  const [trades, setTrades] = useState<AdminTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Filters
  const [marketId, setMarketId] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const loadData = useCallback(async () => {
    if (!adminKey) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminApi.getTrades(adminKey, {
        market_id: marketId,
        limit: 500,
      })
      setTrades(data as unknown as AdminTrade[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades")
    } finally {
      setLoading(false)
    }
  }, [adminKey, marketId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [marketId, search])

  // Client-side filtering and sorting
  const filteredTrades = useMemo(() => {
    let result = [...trades]

    // Filter by search (market ID)
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.market_id.toLowerCase().includes(searchLower) ||
          t.buyer_id.toLowerCase().includes(searchLower) ||
          t.seller_id.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof AdminTrade]
      const bVal = b[sortColumn as keyof AdminTrade]

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
  }, [trades, search, sortColumn, sortDirection])

  // Paginate
  const paginatedTrades = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredTrades.slice(start, start + itemsPerPage)
  }, [filteredTrades, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const activeFilters = []
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
        <p className="font-medium">Error loading trades</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="Trades"
        subtitle="All executed trades"
        onRefresh={loadData}
        loading={loading}
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID..."
        activeFilters={activeFilters}
        onRefresh={loadData}
        loading={loading}
      />

      <DataTable
        data={paginatedTrades}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyMessage="No trades yet"
        emptyIcon={<ArrowLeftRight className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={filteredTrades.length}
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
