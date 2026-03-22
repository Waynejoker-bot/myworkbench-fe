import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5179,
    strictPort: true,
    host: true,
    proxy: {
      "/market": {
        target: "https://arm.hqdx.store",
        changeOrigin: true,
        secure: true,
      },
      "/api": {
        target: "https://arm.hqdx.store",
        changeOrigin: true,
        secure: true,
      },
      "/msapi": {
        target: "https://arm.hqdx.store",
        changeOrigin: true,
        secure: true,
        // 支持 SSE 长连接
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[MSAPI Proxy]', req.method, req.url, '->', options.target + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // 保持 SSE 连接活跃
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              console.log('[MSAPI Proxy] SSE connection established');
            }
          });
          proxy.on('error', (err, req, res) => {
            console.error('[MSAPI Proxy] Error:', err.message);
          });
        },
      },
    },
  },
  // 支持加载 examples 目录中的文件
  optimizeDeps: {
    exclude: ['examples/hello-world/index.ts'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
