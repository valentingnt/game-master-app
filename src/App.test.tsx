import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import App from "./routes/App"
import DayController from "./ui/DayController"
import TokenCounter from "./ui/TokenCounter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as hooks from "./lib/hooks"
import { ToastProvider } from "./ui/Toast"

describe("App", () => {
  it("renders nav links", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument()
    expect(screen.getByText(/Shop 1/)).toBeInTheDocument()
    expect(screen.getByText(/Shop 2/)).toBeInTheDocument()
  })

  it("renders DayController current day", () => {
    vi.spyOn(hooks, "useAppState").mockReturnValue({ data: { day: 5 } } as any)
    vi.spyOn(hooks, "useAdvanceDay").mockReturnValue({ mutate: vi.fn() } as any)
    vi.spyOn(hooks, "useUpdateDay").mockReturnValue({ mutate: vi.fn() } as any)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <DayController />
        </ToastProvider>
      </QueryClientProvider>
    )
    expect(screen.getByText(/Day 5/)).toBeInTheDocument()
  })

  it("renders TokenCounter tokens", () => {
    vi.spyOn(hooks, "useAppState").mockReturnValue({
      data: { tokens: 7 },
    } as any)
    vi.spyOn(hooks, "useUpdateTokens").mockReturnValue({
      mutate: vi.fn(),
    } as any)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <TokenCounter />
        </ToastProvider>
      </QueryClientProvider>
    )
    expect(screen.getByText(/^7$/)).toBeInTheDocument()
  })
})
