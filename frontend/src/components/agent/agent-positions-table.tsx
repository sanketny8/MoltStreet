"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Position } from "@/types"
import { Activity, ExternalLink } from "lucide-react"

interface AgentPositionsTableProps {
  positions: Position[]
  loading?: boolean
  onRefresh?: () => void
}

const POSITION_TYPE_OPTIONS = [
  { value: "yes", label: "YES Only" },
  { value: "no", label: "NO Only" },
]

const MARKET_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "resolved", label: "Resolved" },
]

export function AgentPositionsTable({ positions, loading, onRefresh }: AgentPositionsTableProps) {
  // Pagination state
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter state
  const [search, setSearch] = useState("")
  const [positionType, setPositionType] = useState<string | undefined>()
  const [marketStatus, setMarketStatus] = useState<string | undefined>()

  // Sort state
  const [sortColumn, setSortColumn] = useState<string>("market_id")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Reset page when filters change
  const resetPage = () => setPage(1)

  // Client-side filtering and sorting
  const filteredPositions = useMemo(() => {
    let result = [...positions]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(p =>
        p.question?.toLowerCase().includes(searchLower) ||
        p.market_id.toLowerCase().includes(searchLower)
      )
    }

    // Position type filter
    if (positionType === "yes") {
      result = result.filter(p => p.yes_shares > 0)
    } else if (positionType === "no") {
      result = result.filter(p => p.no_shares > 0)
    }

    // Market status filter
    if (marketStatus) {
      result = result.filter(p => p.market_status === marketStatus)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""

      switch (sortColumn) {
        case "question":
          aVal = a.question || a.market_id
          bVal = b.question || b.market_id
          break
        case "shares":
          aVal = Math.max(a.yes_shares, a.no_shares)
          bVal = Math.max(b.yes_shares, b.no_shares)
          break
        case "avg_price":
          aVal = a.yes_shares > 0 ? (a.avg_yes_price || 0) : (a.avg_no_price || 0)
          bVal = b.yes_shares > 0 ? (b.avg_yes_price || 0) : (b.avg_no_price || 0)
          break
        case "market_status":
          aVal = a.market_status || ""
          bVal = b.market_status || ""
          break
        default:
          aVal = a.market_id
          bVal = b.market_id
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
  }, [positions, search, positionType, marketStatus, sortColumn, sortDirection])

  // Paginate
  const paginatedPositions = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredPositions.slice(start, start + itemsPerPage)
  }, [filteredPositions, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  // Build active filters
  const activeFilters = []
  if (positionType) {
    const option = POSITION_TYPE_OPTIONS.find(o => o.value === positionType)
    activeFilters.push({
      key: "positionType",
      label: "Type",
      value: positionType,
      displayValue: option?.label || positionType,
      onRemove: () => { setPositionType(undefined); resetPage() },
    })
  }
  if (marketStatus) {
    const option = MARKET_STATUS_OPTIONS.find(o => o.value === marketStatus)
    activeFilters.push({
      key: "marketStatus",
      label: "Status",
      value: marketStatus,
      displayValue: option?.label || marketStatus,
      onRemove: () => { setMarketStatus(undefined); resetPage() },
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

  const columns: Column<Position>[] = [
    {
      key: "question",
      label: "Market",
      width: "40%",
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 truncate">
            {row.question || `Market ${row.market_id.slice(0, 8)}...`}
          </p>
          <p className="text-xs text-gray-400 font-mono">{row.market_id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: "position",
      label: "Position",
      width: "20%",
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.yes_shares > 0 && (
            <Badge variant="yes" className="w-fit">
              YES: {row.yes_shares}
            </Badge>
          )}
          {row.no_shares > 0 && (
            <Badge variant="no" className="w-fit">
              NO: {row.no_shares}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "avg_price",
      label: "Avg Price",
      width: "15%",
      sortable: true,
      render: (row) => (
        <div className="text-sm">
          {row.yes_shares > 0 && row.avg_yes_price && (
            <span className="text-green-600">{(row.avg_yes_price * 100).toFixed(0)}¢</span>
          )}
          {row.yes_shares > 0 && row.no_shares > 0 && " / "}
          {row.no_shares > 0 && row.avg_no_price && (
            <span className="text-red-600">{(row.avg_no_price * 100).toFixed(0)}¢</span>
          )}
          {!row.avg_yes_price && !row.avg_no_price && "-"}
        </div>
      ),
    },
    {
      key: "market_status",
      label: "Status",
      width: "12%",
      sortable: true,
      render: (row) => {
        const status = row.market_status || "open"
        const variants: Record<string, "secondary" | "purple" | "yes"> = {
          open: "secondary",
          closed: "purple",
          resolved: "yes",
        }
        return (
          <Badge variant={variants[status] || "secondary"} className="capitalize">
            {status}
          </Badge>
        )
      },
    },
    {
      key: "actions",
      label: "",
      width: "13%",
      render: (row) => (
        <Link href={`/markets/${row.market_id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ExternalLink className="w-3 h-3" />
            View
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); resetPage() }}
        searchPlaceholder="Search by market..."
        filters={[
          {
            key: "positionType",
            label: "All Types",
            options: POSITION_TYPE_OPTIONS,
            value: positionType,
            onChange: (v) => { setPositionType(v); resetPage() },
          },
          {
            key: "marketStatus",
            label: "All Statuses",
            options: MARKET_STATUS_OPTIONS,
            value: marketStatus,
            onChange: (v) => { setMarketStatus(v); resetPage() },
          },
        ]}
        activeFilters={activeFilters}
        onRefresh={onRefresh}
        loading={loading}
      />

      <DataTable
        data={paginatedPositions}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.market_id}
        emptyMessage="No positions found"
        emptyIcon={<Activity className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={filteredPositions.length}
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
