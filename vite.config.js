import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    port: 3000,
    host: true, // Listen on all network addresses (0.0.0.0) so phone can connect via WiFi
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
        main: resolve(import.meta.dirname, 'index.html'),
        panduan: resolve(import.meta.dirname, 'panduan-api.html')
      }
    }
  },
  plugins: [
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
        const dirsToCopy = ['icons', 'css', 'js'];
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
