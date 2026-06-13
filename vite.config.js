import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // ← Usar rutas relativas
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/vendor.js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})