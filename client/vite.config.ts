// @ts-ignore - Types are available at runtime
import {defineConfig} from 'vitest/config';
// @ts-ignore - Types are available at runtime
import react from '@vitejs/plugin-react';
// @ts-ignore - Node types are available
import path from 'path';
// @ts-ignore - Node types are available
import {existsSync, readdirSync} from 'fs';
// @ts-ignore - Node types are available
import {fileURLToPath} from 'url';
// @ts-ignore - Node types are available
import {dirname} from 'path';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta.url is available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to find files case-insensitively (for Linux compatibility)
const findFileCaseInsensitive = (basePath: string, extensions: string[]): string | null => {
  const dir = path.dirname(basePath);
  const baseName = path.basename(basePath, path.extname(basePath));
  
  try {
    // Try exact case first
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (existsSync(fullPath)) {
        return path.normalize(fullPath);
      }
    }
    
    // If exact case fails, try case-insensitive search
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      const lowerBaseName = baseName.toLowerCase();
      
      for (const file of files) {
        const fileLower = path.basename(file, path.extname(file)).toLowerCase();
        if (fileLower === lowerBaseName) {
          const fullPath = path.join(dir, file);
          if (existsSync(fullPath)) {
            return path.normalize(fullPath);
          }
        }
      }
    }
  } catch (e) {
    // Continue
  }
  
  return null;
};

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
        
        // Try to find file with case-insensitive matching
        const foundPath = findFileCaseInsensitive(basePath, extensions);
        if (foundPath) {
          return foundPath;
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
    // Proxy disabled - using explicit baseURL in api.ts instead
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:4000',
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   '/socket.io': {
    //     target: 'http://localhost:4000',
    //     changeOrigin: true,
    //     ws: true,
    //   },
    // },
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts']
  }
});
