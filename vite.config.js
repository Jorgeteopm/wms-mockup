import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// PRESENTATION MOCKUP BUILD.
// base './' + singlefile inline everything into one index.html so it opens by
// double-click from the filesystem (file://) with no server and no Node.
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
        credentials:  true
      }
    }
  }
})
