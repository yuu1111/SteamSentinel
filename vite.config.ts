import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Info from 'unplugin-info/vite'

export default defineConfig({
  plugins: [
    react(),
    Info({
      meta: {
        buildDate: new Date().toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Tokyo'
        })
      }
    })
  ],
  root: 'src/web',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          icons: ['@ant-design/icons']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: 'esnext'
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      }
    }
  }
})