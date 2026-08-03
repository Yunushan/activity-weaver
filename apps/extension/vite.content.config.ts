import { resolve } from "node:path";
import { defineConfig } from "vite";

const appDirectory = import.meta.dirname;

export default defineConfig({
  root: resolve(appDirectory, "src"),
  publicDir: false,
  base: "./",
  resolve: {
    preserveSymlinks: true
  },
  build: {
    emptyOutDir: false,
    outDir: resolve(appDirectory, "dist"),
    sourcemap: false,
    rollupOptions: {
      input: resolve(appDirectory, "src/content.ts"),
      output: {
        format: "iife",
        entryFileNames: "content.js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
