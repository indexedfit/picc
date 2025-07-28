import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config tuned for a browser-only Helia/Libp2p app.
// If you encounter polyfill issues with a specific dependency, you can add aliases here.

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
  },
  // Uncomment if you need to force-optimize or exclude specific packages:
  // optimizeDeps: {
  //   include: [],
  //   exclude: []
  // },
  // resolve: {
  //   alias: {
  //     // Example: 'stream': 'stream-browserify'
  //   }
  // }
});
