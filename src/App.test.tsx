import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MemoryRouter } from "react-router-dom"
import App from "./routes/App"

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
})
