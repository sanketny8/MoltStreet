"use client"

import { AdminProvider, useAdmin } from "@/components/admin/AdminProvider"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminLoginForm } from "@/components/admin/AdminLoginForm"

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdmin()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLoginForm />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="ml-60 min-h-screen p-6 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  )
}
