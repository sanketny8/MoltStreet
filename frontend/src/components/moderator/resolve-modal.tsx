"use client"

import { useState } from "react"
import { PendingMarket } from "@/types"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles, TrendingUp } from "lucide-react"

interface ResolveModalProps {
  market: PendingMarket | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (outcome: "YES" | "NO", evidence?: string) => void
  loading?: boolean
}

export function ResolveModal({ market, open, onOpenChange, onConfirm, loading }: ResolveModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO" | null>(null)
  const [evidence, setEvidence] = useState("")
  const [step, setStep] = useState<"select" | "confirm">("select")

  const handleClose = () => {
    setSelectedOutcome(null)
    setEvidence("")
    setStep("select")
    onOpenChange(false)
  }

  const handleSelect = (outcome: "YES" | "NO") => {
    setSelectedOutcome(outcome)
    setStep("confirm")
  }

  const handleBack = () => {
    setStep("select")
  }

  const handleConfirm = () => {
    if (selectedOutcome) {
      onConfirm(selectedOutcome, evidence || undefined)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Estimated reward (rough calculation: ~1.1% of volume as estimate)
  const estimatedReward = market ? market.volume * 0.011 : 0

  if (!market) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {step === "select" ? (
          <>
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-b border-purple-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Resolve Market</DialogTitle>
              </DialogHeader>
              <p className="mt-4 text-gray-700 font-medium leading-relaxed">
                {market.question}
              </p>
              <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {formatCurrency(market.volume)} volume
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  {market.days_overdue} days overdue
                </span>
              </div>
            </div>

            {/* Outcome Selection */}
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-600">Select the winning outcome:</p>

              <div className="grid grid-cols-2 gap-4">
                {/* YES Button */}
                <button
                  onClick={() => handleSelect("YES")}
                  className={cn(
                    "relative group p-6 rounded-2xl border-2 transition-all duration-200",
                    "hover:border-green-400 hover:bg-green-50 hover:shadow-lg hover:shadow-green-100",
                    "border-gray-200 bg-white"
                  )}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-400/0 to-emerald-400/0 group-hover:from-green-400/5 group-hover:to-emerald-400/10 transition-all" />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 group-hover:text-green-700">YES</span>
                    <span className="text-xs text-gray-500 group-hover:text-green-600">Event occurred</span>
                  </div>
                </button>

                {/* NO Button */}
                <button
                  onClick={() => handleSelect("NO")}
                  className={cn(
                    "relative group p-6 rounded-2xl border-2 transition-all duration-200",
                    "hover:border-red-400 hover:bg-red-50 hover:shadow-lg hover:shadow-red-100",
                    "border-gray-200 bg-white"
                  )}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-400/0 to-rose-400/0 group-hover:from-red-400/5 group-hover:to-rose-400/10 transition-all" />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                      <XCircle className="w-7 h-7 text-red-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 group-hover:text-red-700">NO</span>
                    <span className="text-xs text-gray-500 group-hover:text-red-600">Event did not occur</span>
                  </div>
                </button>
              </div>

              {/* Estimated Reward */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Reward</p>
                    <p className="text-lg font-bold text-purple-700">~{formatCurrency(estimatedReward)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <div className={cn(
              "p-6 border-b",
              selectedOutcome === "YES"
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100"
                : "bg-gradient-to-br from-red-50 to-rose-50 border-red-100"
            )}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Confirm Resolution</DialogTitle>
              </DialogHeader>

              <div className="mt-4 flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  selectedOutcome === "YES" ? "bg-green-100" : "bg-red-100"
                )}>
                  {selectedOutcome === "YES" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resolving as</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedOutcome === "YES" ? "text-green-700" : "text-red-700"
                  )}>
                    {selectedOutcome}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-600 mb-1">Market Question</p>
                <p className="font-medium text-gray-900">{market.question}</p>
              </div>

              {/* Evidence textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence / Reasoning (optional)
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Provide links or reasoning for this resolution..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none text-sm"
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">This action cannot be undone</p>
                  <p className="text-amber-700 mt-1">
                    All positions will be settled and payouts will be processed immediately.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn(
                    "flex-1",
                    selectedOutcome === "YES"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      Confirm {selectedOutcome}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
