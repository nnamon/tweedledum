import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Regenerate icons from public/icon.svg in the dev container:
//   docker compose run --rm dev npm run icons
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0A84FF' }, padding: 0.3 },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0A84FF' }, padding: 0.3 },
  },
  images: ['public/icon.svg'],
});
