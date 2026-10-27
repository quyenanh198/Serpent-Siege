import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    host: true,
    // PocketBase runs on 8090 during development (see backend/README.md).
    proxy: { '/api': 'http://127.0.0.1:8090' },
  },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
});
