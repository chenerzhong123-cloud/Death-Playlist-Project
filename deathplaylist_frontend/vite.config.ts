import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {browserslistToTargets, Features} from 'lightningcss';

export default defineConfig(({mode}) => {
  return {
    base: '/deathplaylist/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        targets: browserslistToTargets(['chrome 60']),
        exclude: Features.LabColors | Features.OklabColors | Features.ColorFunction,
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
