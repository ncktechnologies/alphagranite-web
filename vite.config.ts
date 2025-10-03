import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'https://api.staging.trygather.today',
  //       changeOrigin: true,
  //       rewrite: (path) => path.replace(/^\/api/, '/api'),
  //     },
  //   },
  // },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
});
