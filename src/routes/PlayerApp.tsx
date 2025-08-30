import { Outlet } from "react-router-dom"

export default function PlayerApp() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <main className="px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
