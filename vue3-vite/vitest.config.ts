import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// 单测边界限定 src/——e2e/*.spec.ts 归 Playwright runner（npm run e2e），vitest 不拾取
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
  },
});
