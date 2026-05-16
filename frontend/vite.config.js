import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server proxies /api to the FastAPI backend on :8000.
// When tunneling via ngrok / cloudflared, expose ONLY this port (default 5173).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Allow tunnel hosts. Add specific hosts here if you set ngrok/cloudflared custom domains.
    allowedHosts: [".ngrok-free.app", ".ngrok.io", ".trycloudflare.com", ".loca.lt"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
