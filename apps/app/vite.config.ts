import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      routeRules: {
        // The landing page embeds a server-rendered QR SVG whose target only
        // changes when APP_URL changes at build/deploy time — safe to cache
        // with a short revalidation window.
        "/": { swr: 300 },
        "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        "/logo.png": { headers: { "cache-control": "public, max-age=604800" } },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
