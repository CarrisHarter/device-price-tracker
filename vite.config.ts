import { defineConfig } from "vite";

/** Set VITE_BASE_PATH=/repo-name/ when deploying to GitHub Pages project sites. */
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  server: { port: 5174, open: true },
});
