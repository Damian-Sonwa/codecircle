import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync } from 'fs'

// Custom plugin to resolve extensions for aliased imports
const resolveAliasExtensions = () => {
  return {
    name: 'resolve-alias-extensions',
    resolveId(source, importer) {
      if (source.startsWith('@/')) {
        const srcPath = source.replace('@/', '')
        const basePath = path.resolve(__dirname, './src', srcPath)
        const extensions = ['.tsx', '.ts', '.jsx', '.js']
        
        for (const ext of extensions) {
          const fullPath = basePath + ext
          if (existsSync(fullPath)) {
            return fullPath
          }
        }
      }
      return null
    }
  }
}

export default defineConfig({
  plugins: [react(), resolveAliasExtensions()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
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

