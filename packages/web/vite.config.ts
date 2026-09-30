import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 本番で/api/*をWorkerが受けるのと同じ形にする。パスは書き換えない
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
