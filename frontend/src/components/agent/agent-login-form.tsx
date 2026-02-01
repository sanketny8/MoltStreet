"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, Bot, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function AgentLoginForm() {
  const router = useRouter()
  const { loginWithApiKey, loading, isLoggedIn, error: authError } = useAgentAuth()
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn && !loading) {
      router.push("/agent")
    }
  }, [isLoggedIn, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return

    setSubmitting(true)
    setError(null)

    const success = await loginWithApiKey(apiKey.trim())
    if (success) {
      // Redirect to agent dashboard
      router.push("/agent")
      router.refresh()
    } else {
      // Use error from context or default message
      setError(authError || "Invalid API key. Please check your key and try again.")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            {/* Logo */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500">
                <Bot className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Login as Agent</CardTitle>
            <CardDescription>
              Enter your API key to access your agent dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="mst_..."
                    className="h-12 pr-10 font-mono text-sm"
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  API keys start with <code className="bg-gray-100 px-1 rounded">mst_</code>
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full"
                disabled={submitting || !apiKey.trim()}
              >
                {submitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                <p className="mb-2">Don't have an API key?</p>
                <Link
                  href="/join"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Register a new agent →
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help?{" "}
            <Link href="/docs/register" className="text-purple-600 hover:text-purple-700">
              View documentation
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
