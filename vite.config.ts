import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { marketPlugin } from "./src/vite-plugin-market";

export default defineConfig({
  plugins: [react(), marketPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5179,
    strictPort: true,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/msapi": {
        target: "http://localhost:8000",
        changeOrigin: true,
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
      output: {
        preserveEntrySignatures: 'allow-extension',
      },
    },
  },
});
