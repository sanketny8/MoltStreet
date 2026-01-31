"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination, ItemsPerPage } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  // Pagination
  page?: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange?: (page: number) => void
  onItemsPerPageChange?: (count: number) => void
  itemsPerPageOptions?: number[]
  // Sorting
  sortColumn?: string
  sortDirection?: "asc" | "desc"
  onSort?: (column: string, direction: "asc" | "desc") => void
}

export function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data found",
  emptyIcon,
  page = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50],
  sortColumn,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return

    const newDirection =
      sortColumn === column.key && sortDirection === "asc" ? "desc" : "asc"
    onSort(column.key, newDirection)
  }

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null

    if (sortColumn === column.key) {
      return sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    }
    return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
  }

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row)
    }
    const value = (row as Record<string, unknown>)[column.key]
    if (value === null || value === undefined) return "-"
    return String(value)
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <tr key={i}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            {emptyIcon || <Inbox className="h-8 w-8 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500",
                    column.sortable && "cursor-pointer select-none hover:text-gray-700"
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && onPageChange && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-4">
            {onItemsPerPageChange && (
              <ItemsPerPage
                value={itemsPerPage}
                onChange={onItemsPerPageChange}
                options={itemsPerPageOptions}
              />
            )}
            <span className="text-sm text-gray-500">
              Showing {Math.min((page - 1) * itemsPerPage + 1, totalItems)} to{" "}
              {Math.min(page * itemsPerPage, totalItems)} of {totalItems}
            </span>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
