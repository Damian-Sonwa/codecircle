// @ts-ignore - Types are available at runtime
import {defineConfig} from 'vitest/config';
// @ts-ignore - Types are available at runtime
import react from '@vitejs/plugin-react';
// @ts-ignore - Node types are available
import path from 'path';
// @ts-ignore - Node types are available
import {existsSync} from 'fs';
// @ts-ignore - Node types are available
import {fileURLToPath} from 'url';
// @ts-ignore - Node types are available
import {dirname} from 'path';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta.url is available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Custom plugin to resolve extensions for aliased imports
const resolveAliasExtensions = () => {
  return {
    name: 'resolve-alias-extensions',
    resolveId(source: string) {
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
