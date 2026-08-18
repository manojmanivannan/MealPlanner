import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// T2 build scaffold — Vite MPA + compiled Tailwind v4 (no runtime CDN).
// One HTML entry per page; add converted pages to `input` as they migrate.
// See docs/adr/0002-build-scaffold-and-shared-layout.md.
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Mirror nginx.conf: /api -> backend:5000. Lets `npm run dev` talk to a
      // local FastAPI backend without a separate proxy.
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
  },
})