import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fastgpt/global': path.resolve(__dirname, '../../packages/global')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/embed/index.tsx'),
      name: 'FastGPTCustomerService',
      fileName: () => 'embed.js',
      formats: ['iife']
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
        extend: true
      }
    }
  }
});
