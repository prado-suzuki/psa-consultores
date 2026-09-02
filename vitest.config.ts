/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Configuração do Vitest.
 *
 * Rodar: `bun run test` (single run) | `bun run test:watch` | `bun run test:ui`
 *
 * ── POR QUE DOIS PROJETOS ────────────────────────────────────────────────────
 *
 * Montar o jsdom custa POR ARQUIVO, não por teste, e é o maior item da conta:
 * medido em 02/09/2026, a suíte inteira gasta 290s montando ambiente contra 220s
 * rodando teste. Nos 222 arquivos que não tocam DOM nenhum a distorção fica
 * grotesca: 5,3s de teste contra 155,5s de jsdom.
 *
 * Então `src/lib`, `src/utils`, `src/config` e `eslint-rules` rodam em `node`, sem
 * jsdom e sem o setup do testing-library. O resto (componentes, páginas, hooks)
 * continua em `jsdom`.
 *
 * A divisão é por diretório porque medi a homogeneidade antes: `src/lib` tem 188
 * arquivos e só 3 tocam DOM, e os outros três diretórios são 100% puros. Os 3 estão
 * listados em `EXCECOES_COM_DOM`.
 *
 * SE VOCÊ ESCREVER TESTE COM DOM EM `src/lib`: ele vai falhar na hora, com
 * `ReferenceError: document is not defined`, e o conserto é acrescentar o arquivo em
 * `EXCECOES_COM_DOM`. Falhar alto é de propósito: o inverso, um teste de DOM rodando
 * calado num ambiente sem DOM, não existe.
 */

/** Arquivos de `src/lib` que tocam DOM e por isso ficam no projeto jsdom. */
const EXCECOES_COM_DOM = [
  'src/lib/analiseInteligente.test.ts',
  'src/lib/safeBoldMarkdown.test.tsx',
  'src/lib/osg/validacaoFormulario.test.ts',
];

/**
 * `eslint-rules/` entra porque a regra de lint tem teste próprio, e o teste é o que
 * confere o mapa dela contra `src/components/ui/`. Sem ele a regra descreveria um
 * estado que pode ter mudado, que é o defeito que ela pega. Não é código de
 * aplicação e por isso não mora em `src/`.
 */
const SEM_DOM = [
  'src/lib/**/*.{test,spec}.{ts,tsx}',
  'src/utils/**/*.{test,spec}.{ts,tsx}',
  'src/config/**/*.{test,spec}.{ts,tsx}',
  'eslint-rules/**/*.{test,spec}.{ts,tsx}',
];

const TUDO = ['src/**/*.{test,spec}.{ts,tsx}', 'eslint-rules/**/*.{test,spec}.{ts,tsx}'];

const comum = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};

export default defineConfig({
  ...comum,
  test: {
    projects: [
      {
        ...comum,
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          css: false,
          include: SEM_DOM,
          exclude: ['node_modules', 'dist', '.lovable', ...EXCECOES_COM_DOM],
        },
      },
      {
        ...comum,
        test: {
          name: 'dom',
          globals: true,
          environment: 'jsdom',
          // O setup aplica os matchers do testing-library (toBeInTheDocument etc.) e
          // remenda o que o jsdom não implementa. Ele SÓ vale aqui e no projeto
          // `dom-lib`: no projeto `node` quebraria na primeira linha, que chama
          // `Element`.
          setupFiles: ['./src/test/setup.ts'],
          css: false,
          include: TUDO,
          exclude: ['node_modules', 'dist', '.lovable', ...SEM_DOM],
        },
      },
      {
        // As 3 exceções precisam de projeto PRÓPRIO, e não de um `include` a mais no
        // projeto `dom`: no vitest o `exclude` vence o `include`, então elas cairiam
        // no `exclude: SEM_DOM` dele e sumiriam da suíte inteira, sem erro. Foi o que
        // aconteceu na primeira versão desta config, e o sintoma foi a contagem cair
        // de 4559 para 4537 testes calada.
        ...comum,
        test: {
          name: 'dom-lib',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          css: false,
          include: EXCECOES_COM_DOM,
        },
      },
    ],
  },
});
