import react from "@vitejs/plugin-react";
import glob from "fast-glob";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "src/page"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: glob.sync(path.resolve(__dirname, "src/page/*.html")),
    },
  },
});
