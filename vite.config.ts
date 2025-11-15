import { defineConfig } from 'vite';
import { resolve } from 'path';

// Use relative asset URLs so the site works under /svs-index/ on GitHub Pages
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        detail: resolve(__dirname, 'detail.html'),
      },
    },
  },
});
