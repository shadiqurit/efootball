import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [vue()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': env.DEV_API_TARGET || 'http://127.0.0.1:3005' },
    },
    build: { target: 'es2022' },
  };
});
