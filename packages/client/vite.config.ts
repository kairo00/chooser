import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@chooser/shared": resolve(__dirname, "../shared/src/types.ts"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: true, // <-- C'est ici que ça se passe !
    proxy: {
      // Proxy /api/admin/* and /health to the Node backend
      "/api/admin": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});