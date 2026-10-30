import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    open: false,
    cors: true
  },
  preview: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html')
      }
    }
  },
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'copy-pwa-assets',
      closeBundle() {
        const root = import.meta.dirname;
        const dist = resolve(root, 'dist');
        const filesToCopy = ['sw.js', 'manifest.json'];
        for (const file of filesToCopy) {
          const src = resolve(root, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, resolve(dist, file));
          }
        }
        const dirsToCopy = ['icons'];
        for (const dir of dirsToCopy) {
          const src = resolve(root, dir);
          const dest = resolve(dist, dir);
          if (fs.existsSync(src)) {
            fs.cpSync(src, dest, { recursive: true });
          }
        }
      }
    }
  ]
});
