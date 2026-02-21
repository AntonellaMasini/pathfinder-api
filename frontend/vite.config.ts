import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // New auth + session routes
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sessions": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Legacy routes
      "/reflect_guarded": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/reflect": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/evaluate": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/tts": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/transcribe": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
