import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Спеціальний proxy для профілю з rewrite, щоб уникнути конфлікту з роутингом сторінки /profile
      '/api/profile': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/profile/, '/profile'),
      },
      '/courses': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/teacher': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    }
  }
})
