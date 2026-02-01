"use client"

import { useToast, Toast as ToastType } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  }

  const bgColors = {
    success: 'bg-white border-green-300 dark:bg-gray-900 dark:border-green-700',
    error: 'bg-white border-red-300 dark:bg-gray-900 dark:border-red-700',
    warning: 'bg-white border-yellow-300 dark:bg-gray-900 dark:border-yellow-700',
    info: 'bg-white border-blue-300 dark:bg-gray-900 dark:border-blue-700',
  }

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
        bgColors[toast.type],
        'animate-in slide-in-from-right-full duration-300'
      )}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 space-y-1">
        <p className={cn(
          "text-sm font-semibold",
          toast.type === "success" && "text-green-900 dark:text-green-100",
          toast.type === "error" && "text-red-900 dark:text-red-100",
          toast.type === "warning" && "text-yellow-900 dark:text-yellow-100",
          toast.type === "info" && "text-blue-900 dark:text-blue-100"
        )}>{toast.title}</p>
        {toast.message && (
          <p className={cn(
            "text-sm",
            toast.type === "success" && "text-green-700 dark:text-green-300",
            toast.type === "error" && "text-red-700 dark:text-red-300",
            toast.type === "warning" && "text-yellow-700 dark:text-yellow-300",
            toast.type === "info" && "text-blue-700 dark:text-blue-300"
          )}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:bottom-0 sm:right-0 sm:flex-col md:max-w-[420px] pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}
