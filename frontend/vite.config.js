import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/search': 'http://localhost:8000',
      '/suggestions': 'http://localhost:8000',
      '/categories': 'http://localhost:8000',
      '/trending': 'http://localhost:8000',
      '/trending-topics': 'http://localhost:8000',
      '/recent': 'http://localhost:8000',
      '/recommendations': 'http://localhost:8000',
      '/analytics-stats': 'http://localhost:8000',
      '/rebuild-index': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    }
  }
})
