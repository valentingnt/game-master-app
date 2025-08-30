import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  subscribeAppState,
  subscribeInventory,
  subscribePlayers,
  subscribeShops,
} from "./lib/realtime"
import "./index.css"
import App from "./routes/App"
import Dashboard from "./routes/Dashboard"
import Shop from "./routes/Shop"
import { ToastProvider } from "./ui/Toast"
import { setOnlineState } from "./lib/offlineQueue"

const queryClient = new QueryClient()

// Wire realtime on client start
subscribeAppState(queryClient)
subscribeInventory(queryClient)
subscribePlayers(queryClient)
subscribeShops(queryClient)

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/shop1", element: <Shop shopId="shop1" /> },
      { path: "/shop2", element: <Shop shopId="shop2" /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
)

// Track connectivity for offline queue
window.addEventListener("online", () => setOnlineState(true))
window.addEventListener("offline", () => setOnlineState(false))
