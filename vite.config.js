import { defineConfig } from 'vite';
import { dirname, resolve as join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const resolve = (...p) => join(root, ...p);

export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        feed: resolve('index.html'),
        map: resolve('map.html'),
        business: resolve('business.html'),
        category: resolve('category.html'),
        search: resolve('search.html'),
        saved: resolve('saved.html'),
        profile: resolve('profile.html'),
        promos: resolve('promos.html'),
        dashboard: resolve('dashboard.html'),
        admin: resolve('admin.html'),
        login: resolve('login.html'),
        notifications: resolve('notifications.html'),
        createPage: resolve('create-page.html'),
        notfound: resolve('404.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/pmtiles')) return 'pmtiles';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
