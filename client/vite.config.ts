import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev the Vite dev server proxies /api to the Express backend, so the
// client never needs a hardcoded backend URL. For a production deployment,
// set VITE_API_URL (e.g. https://your-api.example.com) at build time.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
