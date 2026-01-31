import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// If deploying to a subfolder, set base to '/subfolder/', otherwise '/'.
const BASE_PATH = '/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      base: BASE_PATH,
      includeAssets: ['assets/favicon.png', 'assets/icon.svg'],
      manifest: {
        name: 'Sidenotes - Notes App',
        short_name: 'Sidenotes',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        description: 'A web app built to write, organise, and keep notes.',
        screenshots: [
          {
            src: '/asset/screenshot_mobile.png',
            type: 'image/png',
            sizes: '430x932',
            form_factor: 'narrow',
            label: 'Home screen on mobile',
          },
          {
            src: 'assets/screenshot.png',
            type: 'image/png',
            sizes: '1920x1080',
            form_factor: 'wide',
            label: 'Home screen on desktop',
          },
        ],
        theme_color: '#4d4845',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'assets/icon-192-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'assets/icon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'assets/icon-1024-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
