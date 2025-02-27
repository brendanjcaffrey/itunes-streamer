import { defineConfig } from "vite";
import type { InlineConfig } from 'vitest';
import type { UserConfig } from 'vite';
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
type ViteConfig = UserConfig & { test: InlineConfig };
const config: ViteConfig = {
  plugins: [react()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
  },
  server: {
    port: 5568,
    proxy: {
      "/api": "http://localhost:5567",
      "/tracks": "http://localhost:5567",
      "/download": "http://localhost:5567",
      "/artwork": "http://localhost:5567",
    },
  },
};

export default defineConfig(config);
