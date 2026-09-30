import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// 产物部署到 ThinkPHP:
//   JS/CSS -> public/static/app/(base 前缀 /static/app/)
//   index.html -> view/index/index.html(ThinkPHP 壳视图,见 scripts/sync-shell.mjs)
export default defineConfig({
  base: "/static/app/",
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    proxy: {
      // 本地开发:vite(:3000) -> php think run(:8000)
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "../public/static/app",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
