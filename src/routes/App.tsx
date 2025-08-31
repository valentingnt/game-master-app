import { Link, NavLink, Outlet } from "react-router-dom"

export default function App() {
  return (
    <div className="min-h-screen app-surface">
      <header className="border-b border-white/15 bg-ink-900/60 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/player/shop1" className="display-title tracking-wider">
            Game Master
          </Link>
          <nav className="flex gap-2">
            <NavLink
              to="/player/shop1"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded border ${
                  isActive
                    ? "bg-gray-100 text-ink-900 border-white"
                    : "bg-white/10 text-gray-200 border-white/10 hover:bg-white/20"
                }`
              }
            >
              Boutique 1
            </NavLink>
            <NavLink
              to="/player/shop2"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded border ${
                  isActive
                    ? "bg-gray-100 text-ink-900 border-white"
                    : "bg-white/10 text-gray-200 border-white/10 hover:bg-white/20"
                }`
              }
            >
              Boutique 2
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
