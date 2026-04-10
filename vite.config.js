import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/hibridclub/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hyperactive Fit',
        short_name: 'Hyperactive',
        description: 'Aplicativo de monitoramento híbrido',
        theme_color: '#0D0D0D',
        background_color: '#0D0D0D',
        display: 'standalone',
        icons: [
          {
            src: '/iconpwa.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/iconpwa.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/iconpwa.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
