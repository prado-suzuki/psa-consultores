# CLAUDE.md

As convenções, regras inegociáveis e padrões de arquitetura deste repositório estão em @AGENTS.md.

OBRIGATORIAMENTE Leia-o antes de qualquer alteração e siga-o como fonte única de verdade.

## Antes de abrir qualquer plano em `docs/`

Leia `docs/INDICE-PLANOS.md` primeiro. Ele classifica cada documento de `docs/` em feito,
parcial, aberto, morto ou referência, e lista os que **mentem sobre o próprio status** — há
plano marcado "em execução" que foi concluído, e plano sem marca de conclusão que foi
entregue inteiro. Abrir um plano de centenas de linhas para descobrir que ele já foi
executado, ou reexecutar algo que foi revertido de propósito, é o desperdício que esse
índice existe para evitar.

Ao fechar uma frente, mude a linha dela no índice **no mesmo commit** do código.

## Qual banco esta na sua frente

Existem dois: o sandbox (desenvolvimento) e producao. A regra completa esta na secao
"Dois bancos" do AGENTS.md; o que muda a sua proxima acao:

- Fora da `main`, o `bun run dev` aponta para o sandbox. Em `main`, para producao. Confira
  com `git rev-parse --abbrev-ref HEAD` antes de concluir qualquer coisa sobre "o banco".
- Voce pode aplicar migration no sandbox (`supabase db push`). Em producao, **nunca**: por
  nenhum caminho, nem MCP. Aplicar em producao e passo humano pelo chat do Lovable.
- `src/integrations/supabase/types.ts` se **regenera** pelo CLI, nunca se edita nem se
  costura em conflito, e nunca vai para o `.gitignore` (a CI depende dele).
- Antes de afirmar que uma coluna existe em producao, confira o schema pelo MCP do Lovable
  (`query_database`, apenas SELECT). A tabela de migrations de la nao registra tudo.

## Validacoes locais mais rapidas

- Durante o desenvolvimento, execute o ESLint apenas nos arquivos alterados: `bunx eslint <arquivos>`.
- Em verificacoes completas, use cache: `bunx eslint . --cache --cache-location node_modules/.cache/eslint`.
- Para acompanhar erros TypeScript durante alteracoes extensas, prefira `bunx tsc --build --watch --noEmit`; execute `bun run typecheck` na validacao final.
- Nao execute o build completo a cada mudanca. Use `bun run dev` durante o desenvolvimento e reserve `bun run build` para a validacao final.
- Mantenha lint, typecheck e build completos na CI e antes da entrega; as verificacoes rapidas locais nao os substituem.
- Lazy-loading de rotas com `React.lazy()` pode reduzir o bundle e o tempo de build, mas deve ser tratado como uma refatoracao separada e testada. Nao reintroduza `manualChunks` sem investigar o historico documentado em `vite.config.ts`, pois a configuracao anterior causou erros de inicializacao circular/TDZ em producao.
