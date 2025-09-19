import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"

export default function DashboardApp() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const required =
    (import.meta.env.VITE_GM_PASSWORD as string) ||
    (import.meta.env.REACT_APP_GM_PASSWORD as string)

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(";").shift() ?? null
    return null
  }

  const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === "undefined") return
    const maxAge = Math.floor(days * 24 * 60 * 60)
    document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
  }

  const deleteCookie = (name: string) => {
    if (typeof document === "undefined") return
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
  }

  const hashString = (s: string): string => {
    let h = 5381
    for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i)
    return String(h >>> 0)
  }

  useEffect(() => {
    if (!required) {
      setAuthed(true)
      return
    }
    const sig = getCookie("gm_auth_sig")
    const expected = hashString(required)
    setAuthed(sig === expected)
  }, [required])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!required) {
      setAuthed(true)
      return
    }
    if (password === required) {
      setCookie("gm_auth_sig", hashString(required), 30)
      setAuthed(true)
      setError("")
    } else {
      setError("Incorrect password")
    }
  }

  const logout = () => {
    deleteCookie("gm_auth_sig")
    setAuthed(false)
    setPassword("")
  }

  return (
    <div className="min-h-screen bg-zinc-700 text-white">
      <main className="px-4 py-6">
        {!authed ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <form
              onSubmit={onSubmit}
              className="w-full max-w-sm card-surface p-6 space-y-4"
            >
              <div className="display-title text-lg">
                Entrez le mot de passe
              </div>
              <input
                type="password"
                className="w-full bg-white/10 border border-white/10 rounded px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
              />
              {error && <div className="text-sm text-red-400">{error}</div>}
              <button type="submit" className="w-full btn btn-primary">
                Déverrouiller
              </button>
              {!required && (
                <div className="text-xs text-gray-400">
                  Aucun mot de passe configuré. Ajoutez{" "}
                  <code>VITE_GM_PASSWORD</code> pour exiger un mot de passe.
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end fixed top-4 right-4">
              <button className="btn" onClick={logout}>
                Verrouiller
              </button>
            </div>
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
