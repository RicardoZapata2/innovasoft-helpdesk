import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // El navegador habla siempre con el mismo origen y Vite reenvía a la API.
    // Así el frontend no necesita saber en qué puerto corre el backend ni
    // depende de la configuración de CORS durante el desarrollo.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
