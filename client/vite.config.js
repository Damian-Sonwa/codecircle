import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync } from 'fs'

// Custom plugin to resolve extensions for aliased imports
const resolveAliasExtensions = () => {
  return {
    name: 'resolve-alias-extensions',
    enforce: 'pre', // Run before other resolvers
    resolveId(source, importer) {
      // Only handle @/ aliases
      if (source.startsWith('@/')) {
        const srcPath = source.replace('@/', '')
        const basePath = path.resolve(__dirname, './src', srcPath)
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '.json']
        
        // Try each extension
        for (const ext of extensions) {
          const fullPath = basePath + ext
          if (existsSync(fullPath)) {
            return fullPath
          }
        }
        
        // If no file found, try as directory with index
        if (existsSync(basePath)) {
          const indexFiles = ['index.tsx', 'index.ts', 'index.jsx', 'index.js']
          for (const indexFile of indexFiles) {
            const indexPath = path.join(basePath, indexFile)
            if (existsSync(indexPath)) {
              return indexPath
            }
          }
        }
      }
      return null // Let other resolvers handle it
    }
  }
}

export default defineConfig({
  plugins: [resolveAliasExtensions(), react()], // Run our plugin first
  resolve: {
    // Don't use alias here - let the plugin handle it completely
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // your backend URL
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
})

