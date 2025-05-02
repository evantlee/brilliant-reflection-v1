import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths, works in any directory
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [],
  },
  server: {
    host: true, // Listen on all addresses
    port: 5173, // Default Vite port
    strictPort: false, // Try another port if this one is in use
    open: true, // Open browser automatically
  },
})
