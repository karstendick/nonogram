import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Get base path from environment or use default
const basePath = process.env['VITE_BASE_PATH'] || '/nonogram/';

// Preview deploys build with a base path under /nonogram/preview/<branch>/
const isPreviewBuild = basePath.includes('/preview/');

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      // Previews live inside the production service worker's scope, so a second
      // service worker there just fights with it. Previews ship a self-destroying
      // one instead of none at all: deleting the file does not reliably unregister
      // a worker a device already has, but a self-destroying worker does.
      selfDestroying: isPreviewBuild,
      registerType: 'autoUpdate',
      workbox: {
        // The production scope (/nonogram/) covers /nonogram/preview/*. Without
        // this, the production service worker answers preview navigations with
        // the production index.html, serving a stale app under a preview URL.
        navigateFallbackDenylist: [/\/preview\//],
      },
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nonogram Puzzle Game',
        short_name: 'Nonogram',
        description: 'A web-based nonogram puzzle game',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
