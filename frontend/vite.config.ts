import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Expone el servidor en todas las interfaces de red
    port: 3000, // Puerto específico
    open: true, // Abre el navegador automáticamente
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Alias directo para tipos
      '@types': path.resolve(__dirname, './src/types'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      '@/types/types'
    ],
    esbuildOptions: {
      loader: {
        '.ts': 'ts',
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});