import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Every page of the site needs its own entry so `vite build` emits it.
const pages = [
  'index',
  'partners',
  'categories',
  'products',
  'product',
  'routine',
  'about',
  'contact',
  'cart',
  'admin',
  'my-orders',
];

export default defineConfig({
  // Relative asset URLs so the build works from a GitHub Pages sub-path.
  base: './',
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((name) => [
          name,
          resolve(import.meta.dirname, `${name}.html`),
        ]),
      ),
    },
  },
});
