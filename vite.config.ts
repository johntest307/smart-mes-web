import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api/analyze': { target: 'http://localhost:9766', changeOrigin: true },
      '/api/metrics': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/metrics/stream': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/saved_views': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/actions': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/comments': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/snapshot': { target: 'http://localhost:5001', changeOrigin: true },
      '/api/data': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/stats': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/history': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/yoy': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/predict': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/llm_analysis': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/chart_analysis': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/alarms': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/alerts': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/positions': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/config': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/logs': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/quizzes': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/questions': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/employees': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/employee': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/heatmap': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'vendor-react', test: /\/react(?:-dom)?\// },
            { name: 'vendor-charts', test: /\/recharts\// },
            { name: 'vendor-framer', test: /\/framer-motion\// },
            { name: 'vendor-i18n', test: /\/(?:i18next|i18next-browser-languagedetector|react-i18next)\// },
            { name: 'vendor-router', test: /\/react-router-dom\// },
            { name: 'vendor-supabase', test: /\/@supabase\// },
            { name: 'vendor-icons', test: /\/lucide-react\// },
          ],
        },
      },
    },
  },
})
