import { Link, NavLink, Outlet } from "react-router-dom"

export default function PlayerApp() {
  return (
    <div className="min-h-screen app-surface bg-grid">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse-soft" />
            <span className="display-title text-sm uppercase tracking-widest text-gray-300">
              Terminal
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink
              to={`/player/${
                (typeof window !== "undefined" &&
                  localStorage.getItem("last_player_id")) ||
                ""
              }`}
              className={({ isActive }) =>
                `btn btn-ghost ${isActive ? "text-white" : "text-gray-300"}`
              }
            >
              Joueur
            </NavLink>
            <NavLink
              to="/player/shop1"
              className={({ isActive }) =>
                `btn btn-shine ${
                  isActive ? "btn-primary" : "btn-ghost text-gray-300"
                }`
              }
            >
              Boutique 1
            </NavLink>
            <NavLink
              to="/player/shop2"
              className={({ isActive }) =>
                `btn btn-shine ${
                  isActive ? "btn-primary" : "btn-ghost text-gray-300"
                }`
              }
            >
              Boutique 2
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
    </div>
  )
}
