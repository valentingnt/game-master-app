import { Link, NavLink, Outlet } from "react-router-dom"

export default function PlayerApp() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <main className="px-4 py-6">
        <div className="flex justify-end mb-4">
          <nav className="flex gap-4 items-center">
            <Link
              to={`/player/${
                (typeof window !== "undefined" &&
                  localStorage.getItem("last_player_id")) ||
                ""
              }`}
              className="px-2 py-1 rounded text-gray-300 hover:text-white"
            >
              ← Back to Player
            </Link>
            <NavLink
              to="/player/shop1"
              className={({ isActive }) =>
                `px-2 py-1 rounded ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white"
                }`
              }
            >
              Shop 1
            </NavLink>
            <NavLink
              to="/player/shop2"
              className={({ isActive }) =>
                `px-2 py-1 rounded ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white"
                }`
              }
            >
              Shop 2
            </NavLink>
          </nav>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
