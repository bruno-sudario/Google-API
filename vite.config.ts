import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Em build (GitHub Pages), os assets ficam sob /Google-API/; em dev, na raiz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Google-API/' : '/',
  plugins: [react()],
}));
