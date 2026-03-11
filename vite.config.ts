import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          sobre: path.resolve(__dirname, 'sobre.html'),
          noticias: path.resolve(__dirname, 'noticias.html'),
          contato: path.resolve(__dirname, 'contato.html'),
          privacidade: path.resolve(__dirname, 'privacidade.html'),
          termos: path.resolve(__dirname, 'termos.html'),
        }
      }
    }
  };
});
