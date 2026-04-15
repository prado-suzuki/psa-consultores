/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Configuração do Vitest para a base de testes.
 *
 * - Ambiente jsdom para testes de componentes/utilitários que tocam DOM.
 * - Setup file aplica matchers do testing-library (toBeInTheDocument etc).
 * - Aliases de path em sincronia com vite.config.ts e tsconfig.app.json.
 *
 * Rodar: `npm test` (single run) | `npm run test:watch` | `npm run test:ui`
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.lovable'],
  },
});
