"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminHeaderProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  loading?: boolean
  children?: React.ReactNode
}

export function AdminHeader({ title, subtitle, onRefresh, loading, children }: AdminHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  )
}
