import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/woo': {
        target: 'https://megautamagroup.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/woo/, '/wp-json/wc/v3/products'),
        // Kita pindahkan Key ke params agar aman dan tidak merusak build
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.path += '?consumer_key=ck_1d3335c16b6b6f25bc030b41b681102f9feb055c&consumer_secret=cs_31c05b76e1aeab5ca672f73026df0a2167381b1f';
          });
        }
      },
    }
  }
})