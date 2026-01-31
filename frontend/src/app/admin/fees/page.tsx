"use client"

import { useState, useEffect, useCallback } from "react"
import { DollarSign } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useAdmin } from "@/components/admin/AdminProvider"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { DataTable, Column } from "@/components/admin/DataTable"
import { DataTableToolbar } from "@/components/admin/DataTableToolbar"
import { Badge } from "@/components/ui/badge"
import { AdminFee } from "@/types/admin"

const FEE_TYPE_OPTIONS = [
  { value: "trading", label: "Trading" },
  { value: "market_creation", label: "Market Creation" },
  { value: "settlement", label: "Settlement" },
]

const columns: Column<AdminFee>[] = [
  {
    key: "fee_type",
    label: "Type",
    width: "120px",
    render: (row) => {
      const variant =
        row.fee_type === "trading"
          ? "yes"
          : row.fee_type === "market_creation"
          ? "secondary"
          : "purple"
      return (
        <Badge variant={variant} className="capitalize">
          {row.fee_type.replace("_", " ")}
        </Badge>
      )
    },
  },
  {
    key: "amount",
    label: "Amount",
    width: "100px",
    sortable: true,
    render: (row) => <span className="font-medium">{row.amount.toFixed(4)}</span>,
  },
  {
    key: "agent_id",
    label: "Agent",
    width: "150px",
    render: (row) => (
      <span className="font-mono text-xs text-gray-500">
        {row.agent_id ? `${row.agent_id.slice(0, 8)}...` : "-"}
      </span>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (row) => (
      <span className="text-sm text-gray-600">{row.description || "-"}</span>
    ),
  },
  {
    key: "created_at",
    label: "Time",
    width: "180px",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.created_at).toLocaleString()}
      </span>
    ),
  },
]

export default function AdminFeesPage() {
  const { adminKey } = useAdmin()
  const [fees, setFees] = useState<AdminFee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [feeType, setFeeType] = useState<string | undefined>()

  const loadData = useCallback(async () => {
    if (!adminKey) return

    setLoading(true)
    setError(null)

    try {
      // Fetch with high limit to get total count (backend doesn't return count)
      const offset = (page - 1) * itemsPerPage
      const data = await adminApi.getFees(adminKey, {
        fee_type: feeType,
        limit: itemsPerPage,
        offset,
      })
      setFees(data as unknown as AdminFee[])

      // Estimate total (fetch one more page to check if there's more)
      if (page === 1 && data.length === itemsPerPage) {
        const nextPage = await adminApi.getFees(adminKey, {
          fee_type: feeType,
          limit: 1,
          offset: itemsPerPage,
        })
        setTotalItems(nextPage.length > 0 ? itemsPerPage * 10 : data.length)
      } else if (data.length < itemsPerPage) {
        setTotalItems((page - 1) * itemsPerPage + data.length)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fees")
    } finally {
      setLoading(false)
    }
  }, [adminKey, page, itemsPerPage, feeType])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [feeType])

  const activeFilters = []
  if (feeType) {
    const option = FEE_TYPE_OPTIONS.find((o) => o.value === feeType)
    activeFilters.push({
      key: "fee_type",
      label: "Type",
      value: feeType,
      displayValue: option?.label || feeType,
      onRemove: () => setFeeType(undefined),
    })
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-600">
        <p className="font-medium">Error loading fees</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <AdminHeader
        title="Fee History"
        subtitle="Platform fee transactions"
        onRefresh={loadData}
        loading={loading}
      />

      <DataTableToolbar
        filters={[
          {
            key: "fee_type",
            label: "All Types",
            options: FEE_TYPE_OPTIONS,
            value: feeType,
            onChange: setFeeType,
          },
        ]}
        activeFilters={activeFilters}
        onRefresh={loadData}
        loading={loading}
      />

      <DataTable
        data={fees}
        columns={columns}
        loading={loading}
        keyExtractor={(row) => row.id}
        emptyMessage="No fees collected yet"
        emptyIcon={<DollarSign className="h-8 w-8 text-gray-400" />}
        page={page}
        totalItems={totalItems || fees.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setPage}
        onItemsPerPageChange={(count) => {
          setItemsPerPage(count)
          setPage(1)
        }}
      />
    </div>
  )
}
