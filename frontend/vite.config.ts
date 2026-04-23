import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || "https://onlinegrowly.onrender.com";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": backendTarget,
        "/login": backendTarget,
        "/logout": backendTarget,
        "/register": backendTarget,
      },
    },
    build: {
      outDir: "dist",
    },
  };
});
