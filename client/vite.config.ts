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

// Custom plugin to resolve extensions for aliased imports (fallback)
const resolveAliasExtensions = () => {
  const srcDir = path.resolve(__dirname, './src');
  
  return {
    name: 'resolve-alias-extensions',
    enforce: 'pre', // Run before other resolvers
    resolveId(source: string, _importer?: string) {
      // Only handle @/ aliases that weren't resolved by Vite's alias
      if (source.startsWith('@/')) {
        const srcPath = source.replace('@/', '');
        const basePath = path.resolve(srcDir, srcPath);
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
        
        // Check if both .tsx and .jsx exist, prefer .tsx
        const tsxPath = basePath + '.tsx';
        const jsxPath = basePath + '.jsx';
        if (existsSync(tsxPath) && existsSync(jsxPath)) {
          return path.normalize(tsxPath);
        }
        
        // Try each extension
        for (const ext of extensions) {
          const fullPath = basePath + ext;
          try {
            if (existsSync(fullPath)) {
              // Return normalized path for cross-platform compatibility
              return path.normalize(fullPath);
            }
          } catch (e) {
            // Continue to next extension
          }
        }
        
        // If no file found, try as directory with index
        try {
          if (existsSync(basePath)) {
            const indexFiles = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
            for (const indexFile of indexFiles) {
              const indexPath = path.join(basePath, indexFile);
              if (existsSync(indexPath)) {
                return path.normalize(indexPath);
              }
            }
          }
        } catch (e) {
          // Continue
        }
      }
      return null; // Let other resolvers handle it
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [resolveAliasExtensions(), react()], // Run our plugin first
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
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts']
  }
});
