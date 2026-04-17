import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      '/api/tts': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
})
