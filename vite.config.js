import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = process.env.VITE_BASE_PATH || (repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hyperactive Fit',
        short_name: 'Hyperactive',
        description: 'Aplicativo de monitoramento híbrido',
        start_url: basePath,
        scope: basePath,
        theme_color: '#0A0D14',
        background_color: '#0A0D14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'iconpwa.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'iconpwa.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'iconpwa.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
