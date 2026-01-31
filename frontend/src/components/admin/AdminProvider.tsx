"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { adminApi } from "@/lib/api"
import { AdminContextValue } from "@/types/admin"

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const storedKey = localStorage.getItem("adminKey")
    if (storedKey) {
      validateKey(storedKey)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateKey = async (key: string) => {
    try {
      setIsLoading(true)
      await adminApi.healthCheck(key)
      setAdminKey(key)
      setIsAuthenticated(true)
      localStorage.setItem("adminKey", key)
      return true
    } catch {
      setAdminKey(null)
      setIsAuthenticated(false)
      localStorage.removeItem("adminKey")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(async (key: string): Promise<boolean> => {
    return validateKey(key)
  }, [])

  const logout = useCallback(() => {
    setAdminKey(null)
    setIsAuthenticated(false)
    localStorage.removeItem("adminKey")
  }, [])

  return (
    <AdminContext.Provider value={{ adminKey, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider")
  }
  return context
}
