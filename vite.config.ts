import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    // Ensure proper resolution of TypeScript files
    fullySpecified: false,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  test: {
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['text', 'json-summary', 'json'],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
    }
    // Two projects rather than one jsdom environment for everything: the logic suites
    // (codecs, parsers, aggregation) need no DOM and run in well under a second, and
    // paying jsdom startup per file would give that up for nothing.
    //
    // The `.tsx` glob is what makes component tests run at all — the include used to
    // be `.ts` only, so a `Foo.test.tsx` was silently skipped rather than reported.
    projects: [
      {
        test: {
          name: "logic",
          include: [
            "src/test/logic/*.test.ts",
            "src/analysis/**/*.test.ts",
          ],
          environment: "node",
        },
      },
      {
        test: {
          name: "ui",
          include: [
            "src/test/ui/*.test.tsx",
            "src/test/smoke.test.tsx",
          ],
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
