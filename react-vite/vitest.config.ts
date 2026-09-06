import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 单测边界限定 src/——e2e/*.spec.ts 归 Playwright runner（npm run e2e），vitest 不拾取
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
