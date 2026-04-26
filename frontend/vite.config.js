/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    port: 3000,
    https: true,
    proxy: {
      // Redirige les appels /api/* vers le backend Spring Boot
      '/api': {
        target: 'https://localhost:8443',
        secure: false, // certificat auto-signé accepté
      },
    },
  },
  build: {
    // En prod, le build est intégré au JAR Spring Boot
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
