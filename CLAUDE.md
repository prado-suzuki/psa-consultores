# CLAUDE.md

As convenções, regras inegociáveis e padrões de arquitetura deste repositório estão em @AGENTS.md.

OBRIGATORIAMENTE Leia-o antes de qualquer alteração e siga-o como fonte única de verdade.

## Validacoes locais mais rapidas

- Durante o desenvolvimento, execute o ESLint apenas nos arquivos alterados: `bunx eslint <arquivos>`.
- Em verificacoes completas, use cache: `bunx eslint . --cache --cache-location node_modules/.cache/eslint`.
- Para acompanhar erros TypeScript durante alteracoes extensas, prefira `bunx tsc --build --watch --noEmit`; execute `bun run typecheck` na validacao final.
- Nao execute o build completo a cada mudanca. Use `bun run dev` durante o desenvolvimento e reserve `bun run build` para a validacao final.
- Mantenha lint, typecheck e build completos na CI e antes da entrega; as verificacoes rapidas locais nao os substituem.
- Lazy-loading de rotas com `React.lazy()` pode reduzir o bundle e o tempo de build, mas deve ser tratado como uma refatoracao separada e testada. Nao reintroduza `manualChunks` sem investigar o historico documentado em `vite.config.ts`, pois a configuracao anterior causou erros de inicializacao circular/TDZ em producao.
