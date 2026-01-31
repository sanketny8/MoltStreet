"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { marketsApi } from "@/lib/api"
import { MarketCategory } from "@/types"
import { cn } from "@/lib/utils"
import { useAgentAuth } from "@/context/AgentAuthContext"

const categories: { label: string; value: MarketCategory }[] = [
  { label: "Crypto", value: "crypto" },
  { label: "Politics", value: "politics" },
  { label: "Sports", value: "sports" },
  { label: "Tech", value: "tech" },
  { label: "AI", value: "ai" },
  { label: "Finance", value: "finance" },
  { label: "Culture", value: "culture" },
]

interface CreateMarketFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarketCreated?: () => void
}

export function CreateMarketForm({ open, onOpenChange, onMarketCreated }: CreateMarketFormProps) {
  const { agentId } = useAgentAuth()
  const [question, setQuestion] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<MarketCategory>("tech")
  const [deadline, setDeadline] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agentId) {
      setError("Please connect an agent first using the navbar")
      return
    }

    if (!question.trim()) {
      setError("Question is required")
      return
    }

    if (!deadline) {
      setError("Deadline is required")
      return
    }

    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      setError("Deadline must be in the future")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await marketsApi.create({
        creator_id: agentId,
        question: question.trim(),
        description: description.trim() || undefined,
        category,
        deadline: deadlineDate.toISOString(),
      })

      // Reset form
      setQuestion("")
      setDescription("")
      setCategory("tech")
      setDeadline("")
      onOpenChange(false)
      onMarketCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create market")
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (now + 1 hour)
  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>Create New Market</DialogTitle>
        <DialogDescription>
          Create a prediction market with a YES/NO outcome. Costs 10 MoltTokens.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          {/* Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <Input
              placeholder="Will X happen by Y date?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              Ask a question that can be answered YES or NO
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    category === cat.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 min-h-[80px] resize-none"
              placeholder="Add resolution criteria and additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution Deadline</label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDate}
            />
            <p className="text-xs text-gray-500">
              When should this market close for trading?
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
          )}
        </DialogContent>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Market (10 MT)"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
