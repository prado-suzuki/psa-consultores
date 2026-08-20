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
    // `eslint-rules/` entra porque a regra de lint tem teste próprio, e o teste é
    // o que confere o mapa dela contra `src/components/ui/` — sem ele a regra
    // descreveria um estado que pode ter mudado, que é o defeito que ela pega.
    // Não é código de aplicação e por isso não mora em `src/`.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'eslint-rules/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.lovable'],
  },
});
