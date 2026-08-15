import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    // Keep chunks reasonably small for faster parse time
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom'))   return 'vendor-react-dom'
            if (id.includes('react'))       return 'vendor-react'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('@supabase'))   return 'vendor-supabase'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three'
          }
        },
      },
    },
  },
  // Reduce Dev overhead
  server: {
    warmup: {
      clientFiles: ['./src/main.tsx', './src/index.css'],
    },
  },
})
