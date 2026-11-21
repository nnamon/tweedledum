import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// The commit a Pages build came from (Actions sets GITHUB_SHA); local builds say so.
const build = (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'local';

// GitHub Pages serves the app under /tweedledum/; local builds use /.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
  plugins: [
    svelte(),
    // Settings fetches version.json to tell you when a newer version is on the site.
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, build }) });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Tweedledum',
        short_name: 'Tweedledum',
        description: 'A typing tutor for the Twiddler one-handed chording keyboard.',
        theme_color: '#F2F2F7',
        background_color: '#F2F2F7',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest,mp3}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  server: { host: '0.0.0.0', port: 7375, strictPort: true },
  preview: { host: '0.0.0.0', port: 7375, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
});
