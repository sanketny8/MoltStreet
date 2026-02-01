/**
 * Toast notification hook for displaying user feedback
 */

import { useState, useCallback, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastOptions {
  title: string
  message?: string
  duration?: number
}

let toastCount = 0
const listeners = new Set<(toasts: Toast[]) => void>()
let memoryState: Toast[] = []

function generateId(): string {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return `toast-${toastCount}-${Date.now()}`
}

function dispatch(toast: Toast) {
  memoryState = [...memoryState, toast]
  listeners.forEach((listener) => listener(memoryState))

  // Auto-remove after duration
  const duration = toast.duration || 5000
  if (duration > 0) {
    setTimeout(() => {
      dismiss(toast.id)
    }, duration)
  }
}

function dismiss(id: string) {
  memoryState = memoryState.filter((toast) => toast.id !== id)
  listeners.forEach((listener) => listener(memoryState))
}

function dismissAll() {
  memoryState = []
  listeners.forEach((listener) => listener(memoryState))
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState)

  useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  const toast = useCallback(
    (type: ToastType, options: ToastOptions) => {
      const id = generateId()
      dispatch({
        id,
        type,
        ...options,
      })
      return id
    },
    []
  )

  return {
    toasts,
    toast,
    success: (options: ToastOptions) => toast('success', options),
    error: (options: ToastOptions) => toast('error', options),
    warning: (options: ToastOptions) => toast('warning', options),
    info: (options: ToastOptions) => toast('info', options),
    dismiss,
    dismissAll,
  }
}

// Standalone API for use outside of React components
export const toast = {
  success: (options: ToastOptions) => {
    const id = generateId()
    dispatch({ id, type: 'success', ...options })
    return id
  },
  error: (options: ToastOptions) => {
    const id = generateId()
    dispatch({ id, type: 'error', ...options })
    return id
  },
  warning: (options: ToastOptions) => {
    const id = generateId()
    dispatch({ id, type: 'warning', ...options })
    return id
  },
  info: (options: ToastOptions) => {
    const id = generateId()
    dispatch({ id, type: 'info', ...options })
    return id
  },
  dismiss,
  dismissAll,
}
