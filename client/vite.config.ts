/// <reference types="vitest" />
import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import {existsSync} from 'fs';

// Custom plugin to resolve extensions for aliased imports
const resolveAliasExtensions = () => {
  return {
    name: 'resolve-alias-extensions',
    resolveId(source, importer) {
      if (source.startsWith('@/')) {
        const srcPath = source.replace('@/', '');
        const basePath = path.resolve(__dirname, './src', srcPath);
        const extensions = ['.tsx', '.ts', '.jsx', '.js'];
        
        for (const ext of extensions) {
          const fullPath = basePath + ext;
          if (existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
      return null;
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), resolveAliasExtensions()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true
      }
    }
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts']
  }
});
