import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

type Props = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  maxWClass?: string
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  maxWClass,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const firstFocusable = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab") {
        // Simple focus trap: keep focus inside
        const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) setTimeout(() => firstFocusable.current?.focus(), 0)
    return () => {
      if (!open && openerRef.current) openerRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${
          maxWClass ?? "max-w-xl"
        } card-surface p-4 shadow-xl`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="display-title text-base text-gray-100">{title}</div>
          <button
            ref={firstFocusable}
            className="btn btn-ghost"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
