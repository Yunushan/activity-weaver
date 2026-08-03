import { resolve } from "node:path";
import { defineConfig } from "vite";

const appDirectory = import.meta.dirname;

export default defineConfig({
  root: resolve(appDirectory, "src"),
  publicDir: resolve(appDirectory, "public"),
  base: "./",
  resolve: {
    preserveSymlinks: true
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(appDirectory, "dist"),
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(appDirectory, "src/background.ts"),
        options: resolve(appDirectory, "src/options.html")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
