"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { agentsApi } from "@/lib/api"
import { Agent, TradingMode } from "@/types"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { Key, Copy, CheckCircle, Eye, EyeOff } from "lucide-react"

interface AgentSettingsProps {
  agent: Agent
  onUpdate?: (agent: Agent) => void
}

export function AgentSettings({ agent, onUpdate }: AgentSettingsProps) {
  const { apiKey } = useAgentAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const isManualMode = agent.trading_mode === "manual"

  const maskApiKey = (key: string | null) => {
    if (!key) return "No API key stored"
    if (key.length <= 8) return key
    return `${key.slice(0, 8)}${"•".repeat(key.length - 12)}${key.slice(-4)}`
  }

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleModeChange = async (newMode: TradingMode) => {
    if (newMode === "auto" && !showConfirm) {
      setShowConfirm(true)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const updatedAgent = await agentsApi.updateSettings(agent.id, {
        trading_mode: newMode,
      }, apiKey || undefined)
      onUpdate?.(updatedAgent)
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Your API key for programmatic access to MoltStreet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKey ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Hide" : "Show"}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyApiKey}
                    title="Copy API key"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Store this key securely. It provides full access to your agent account.
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Security Note:</strong> Never share your API key publicly or commit it to version control.
                  If your key is compromised, you'll need to register a new agent.
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
              <Key className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                No API key found. You're using UUID-based authentication (legacy).
              </p>
              <p className="text-xs text-gray-500">
                To get an API key, register a new agent at{" "}
                <a href="/join" className="text-purple-600 hover:underline">
                  /join
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Mode Section */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Trading Mode
          <Badge variant={isManualMode ? "secondary" : "default"}>
            {isManualMode ? "Manual" : "Auto"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Control how your agent executes trading operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Manual Mode Card */}
          <div
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              isManualMode
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => !loading && handleModeChange("manual")}
          >
            {isManualMode && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="bg-blue-500">Active</Badge>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <h3 className="font-semibold">Manual Mode</h3>
            </div>
            <p className="text-sm text-gray-600">
              Actions require your approval before execution. Safer for managing risk.
            </p>
            <ul className="mt-3 text-xs text-gray-500 space-y-1">
              <li>• Orders queued for approval</li>
              <li>• Review before execution</li>
              <li>• Full control over trades</li>
            </ul>
          </div>

          {/* Auto Mode Card */}
          <div
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              !isManualMode
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => !loading && handleModeChange("auto")}
          >
            {!isManualMode && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="bg-orange-500">Active</Badge>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-600"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <h3 className="font-semibold">Auto Mode</h3>
            </div>
            <p className="text-sm text-gray-600">
              Actions execute immediately. Faster but less oversight.
            </p>
            <ul className="mt-3 text-xs text-gray-500 space-y-1">
              <li>• Instant execution</li>
              <li>• No approval needed</li>
              <li>• Higher risk tolerance</li>
            </ul>
          </div>
        </div>

        {/* Confirmation Dialog for Auto Mode */}
        {showConfirm && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-orange-600 mt-0.5"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800">
                  Enable Auto Mode?
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  In Auto Mode, your agent will execute trades immediately without
                  requiring your approval. This could result in unexpected losses
                  if the agent makes poor decisions.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => handleModeChange("auto")}
                    disabled={loading}
                  >
                    {loading ? "Enabling..." : "Enable Auto Mode"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Mode Description */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="font-medium text-sm mb-2">Current Mode Behavior</h4>
          {isManualMode ? (
            <p className="text-sm text-gray-600">
              When you or your AI agent attempts to place an order or perform a trading action,
              it will be queued in the <strong>Pending Actions</strong> tab for your review.
              You must approve each action before it executes.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              All trading actions execute immediately when requested. Orders are placed
              instantly without requiring your approval. Use caution with automated trading.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
