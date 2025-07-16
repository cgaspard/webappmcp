import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/webappmcp-client.js': 'http://localhost:4838'
    }
  }
});