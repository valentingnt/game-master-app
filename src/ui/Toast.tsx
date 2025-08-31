import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type Toast = {
  id: string
  title?: string
  message: string
  type?: "success" | "error" | "info"
}

type ToastContextType = {
  show: (t: Omit<Toast, "id">) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, ...t }])
      setTimeout(() => remove(id), 3000)
    },
    [remove]
  )

  const value = useMemo(() => ({ show, remove }), [show, remove])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-3 bottom-3 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded border p-3 shadow text-sm ${
              t.type === "error"
                ? "bg-red-900/30 border-red-700 text-red-200"
                : t.type === "success"
                ? "bg-green-900/30 border-green-700 text-green-200"
                : "bg-ink-900/80 border-white/15 text-gray-100"
            }`}
          >
            {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
