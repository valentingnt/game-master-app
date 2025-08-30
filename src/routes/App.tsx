import { Link, NavLink, Outlet } from "react-router-dom"

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to="/shop1" className="font-semibold">
            Game Master
          </Link>
          <nav className="flex gap-4">
            <NavLink
              to="/shop1"
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
              to="/shop2"
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
      </header>
      <main className="px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
