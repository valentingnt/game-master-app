import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        define: {
            "import.meta.env.REACT_APP_SUPABASE_URL": JSON.stringify((_b = env.REACT_APP_SUPABASE_URL) !== null && _b !== void 0 ? _b : ""),
            "import.meta.env.REACT_APP_SUPABASE_ANON_KEY": JSON.stringify((_c = env.REACT_APP_SUPABASE_ANON_KEY) !== null && _c !== void 0 ? _c : ""),
        },
        server: {
            port: 5173,
            host: true,
        },
        preview: {
            port: 5173,
        },
    };
});
