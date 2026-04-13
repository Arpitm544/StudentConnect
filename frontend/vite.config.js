import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allows Firebase popup (signInWithPopup) to communicate back to opener
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
      '/api': {
        target: 'http://43.204.25.225:8080',
        changeOrigin: true,
        secure: false,
      },
      '/tasks': {
        target: 'http://43.204.25.225:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
