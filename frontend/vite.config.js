import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// T2 build scaffold — Vite MPA + compiled Tailwind v4 (no runtime CDN).
// One HTML entry per page; add converted pages to `input` as they migrate.
// See docs/adr/0002-build-scaffold-and-shared-layout.md.
export default defineConfig({
  // Multi-page app: serve each .html directly, no SPA history fallback.
  appType: 'mpa',
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Mirror nginx.conf's `location /api/ { proxy_pass http://backend:5000/; }`:
      // the FastAPI routers mount at /auth, /recipes, /weekly-plan, /ingredients
      // (no /api prefix), so the /api prefix must be stripped here too.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        'recipe-hub': fileURLToPath(new URL('./recipe-hub.html', import.meta.url)),
        ingredients: fileURLToPath(new URL('./ingredients.html', import.meta.url)),
        welcome: fileURLToPath(new URL('./welcome.html', import.meta.url)),
        // T3 — the component catalog (design artifact; not part of the nav).
        catalog: fileURLToPath(new URL('./catalog.html', import.meta.url)),
      },
    },
  },
})