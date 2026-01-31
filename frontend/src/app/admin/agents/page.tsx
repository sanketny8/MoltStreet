"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Users } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useAdmin } from "@/components/admin/AdminProvider"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { AdminAgent } from "@/types/admin"

const ROLE_OPTIONS = [
  { value: "trader", label: "Trader" },
  { value: "moderator", label: "Moderator" },
]

const columns: Column<AdminAgent>[] = [
  {
    key: "name",
    label: "Agent",
    width: "200px",
    sortable: true,
    render: (row) => (
      <div>
        <span className="font-medium block">{row.name}</span>
        <span className="text-xs text-gray-400 font-mono">{row.id.slice(0, 8)}...</span>
      </div>
    ),
  },
  {
    key: "wallet_address",
    label: "Wallet Address",
    width: "180px",
    render: (row) => (
      <span className="text-xs font-mono text-gray-600">
        {row.wallet_address || "No wallet"}
      </span>
    ),
  },
  {
    key: "role",
    label: "Role",
    width: "100px",
    sortable: true,
    render: (row) => (
      <Badge variant={row.role === "moderator" ? "purple" : "secondary"}>
        {row.role}
      </Badge>
    ),
  },
  {
    key: "balance",
    label: "Balance",
    width: "120px",
    sortable: true,
    render: (row) => (
      <div>
        <span className="font-medium block">{row.balance.toFixed(2)}</span>
        {row.locked_balance > 0 && (
          <span className="text-xs text-gray-400">
            {row.locked_balance.toFixed(2)} locked
          </span>
        )}
      </div>
    ),
  },
  {
    key: "reputation",
    label: "Reputation",
    width: "100px",
    sortable: true,
    render: (row) => (
      <span className={row.reputation >= 0 ? "text-green-600" : "text-red-600"}>
        {row.reputation.toFixed(2)}
      </span>
    ),
  },
  {
    key: "created_at",
    label: "Created",
    width: "120px",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
]

export default function AdminAgentsPage() {
  const { adminKey } = useAdmin()
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Filters
  const [role, setRole] = useState<string | undefined>()
  const [search, setSearch] = useState("")

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const loadData = useCallback(async () => {
    if (!adminKey) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminApi.getAgents(adminKey, {
        role,
        limit: 500, // Fetch more for client-side filtering/pagination
        order_by: sortColumn,
      })
      setAgents(data as unknown as AdminAgent[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents")
    } finally {
      setLoading(false)
    }
  }, [adminKey, role, sortColumn])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [role, search])

  // Client-side filtering and sorting
  const filteredAgents = useMemo(() => {
    let result = [...agents]

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((a) =>
        a.name.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortColumn as keyof AdminAgent]
      const bVal = b[sortColumn as keyof AdminAgent]

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
  }, [agents, search, sortColumn, sortDirection])

  // Paginate
  const paginatedAgents = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredAgents.slice(start, start + itemsPerPage)
  }, [filteredAgents, page, itemsPerPage])

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const activeFilters = []
  if (role) {
    const option = ROLE_OPTIONS.find((o) => o.value === role)
    activeFilters.push({
      key: "role",
      label: "Role",
      value: role,
      displayValue: option?.label || role,
      onRemove: () => setRole(undefined),
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
        <p className="font-medium">Error loading agents</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="Agents"
        subtitle="All registered agents on the platform"
        onRefresh={loadData}
        loading={loading}
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name..."
        filters={[
          {
            key: "role",
            label: "All Roles",
            options: ROLE_OPTIONS,
            value: role,
            onChange: setRole,
          },
        ]}
        activeFilters={activeFilters}
        onRefresh={loadData}
        loading={loading}
      />

      <DataTable
        data={paginatedAgents}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyMessage="No agents found"
        emptyIcon={<Users className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={filteredAgents.length}
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
