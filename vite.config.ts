import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [react()],
    define: {
      "import.meta.env.REACT_APP_SUPABASE_URL": JSON.stringify(
        env.REACT_APP_SUPABASE_URL ?? ""
      ),
      "import.meta.env.REACT_APP_SUPABASE_ANON_KEY": JSON.stringify(
        env.REACT_APP_SUPABASE_ANON_KEY ?? ""
      ),
    },
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 5173,
    },
  }
})
