# CLAUDE.md

As convenções, regras inegociáveis e padrões de arquitetura deste repositório estão em @AGENTS.md.

OBRIGATORIAMENTE Leia-o antes de qualquer alteração e siga-o como fonte única de verdade.

## Convencao de comentarios no codigo

- Comente apenas restricoes, riscos ou comportamentos inesperados que o codigo nao consegue
  expressar sozinho. Explique o motivo da decisao atual, nao narre a implementacao.
- Um comentario comum deve ter no maximo duas linhas. Se a explicacao exigir um paragrafo,
  mova-a para `docs/` e deixe no codigo apenas uma frase ou referencia.
- Nao registre alternativas rejeitadas, tentativas anteriores, datas de reuniao, nomes de
  pessoas, historico de bugs ou justificativas defensivas. Isso pertence a issues, commits ou
  documentacao.
- So mencione uma alternativa rejeitada quando ela parecer obviamente correta e puder causar
  um erro real. Mesmo nesse caso, explique a restricao concreta em uma unica frase.
- Nao deixe codigo desativado em comentarios. Apague-o; o Git preserva o historico.
- Nao repita nomes de funcoes, tipos ou variaveis em linguagem natural. JSDoc descreve apenas
  contratos, entradas, saidas, erros e efeitos que nao sejam evidentes pela assinatura.
- Use comentarios para invariantes concretas, efeitos colaterais, limitacoes externas e regras
  de negocio dificeis de perceber. `TODO` deve indicar uma acao objetiva e, quando houver, a
  issue correspondente.
- Ao alterar um trecho, revise os comentarios proximos. Comentario desatualizado e pior que
  comentario ausente.

Antes de comentar, confirme que a informacao evita um bug, nao esta clara no codigo, continuara
verdadeira apos uma refatoracao e nao pode ser dita em uma frase. Se algum criterio falhar, nao
escreva o comentario.

Regra curta: comentarios explicam restricoes atuais e nao obvias. Nao contam historia, nao
defendem decisoes e nao descrevem caminhos que o codigo nao tomou.

## Antes de abrir qualquer plano em `docs/`

Leia `docs/INDICE-PLANOS.md` primeiro. Ele classifica cada documento de `docs/` em feito,
parcial, aberto, morto ou referência, e lista os que **mentem sobre o próprio status** — há
plano marcado "em execução" que foi concluído, e plano sem marca de conclusão que foi
entregue inteiro. Abrir um plano de centenas de linhas para descobrir que ele já foi
executado, ou reexecutar algo que foi revertido de propósito, é o desperdício que esse
índice existe para evitar.

Ao fechar uma frente, mude a linha dela no índice **no mesmo commit** do código.

## Onde cada arquivo de `docs/` mora

O manual é `docs/README.md`, e ele responde num quadro só. A regra mais fácil de conferir:
**a raiz de `docs/` tem exatamente quatro arquivos** — `README.md`, `INDICE-PLANOS.md`,
`AI_CONTEXT.md` e `ambiente-de-desenvolvimento.md`. Qualquer outro `.md` solto ali está errado.

## Onde nasce e onde morre uma tarefa

Tarefa nova vai em `docs/tarefas-a-executar/<yyyy_mm_dd>_<slug>.md` — data de **criação** no nome — e ganha
linha em `docs/tarefas-a-executar/README.md`. Essa pasta contém **só trabalho que falta fazer**: ao
entregar, mova o arquivo para `docs/tarefas-executadas/` e atualize os dois índices no mesmo
commit do código. `docs/sprints/` não guarda tarefa nenhuma. Quem abre `docs/tarefas-a-executar/` está procurando o que fazer, e precisa poder confiar em tudo
que vê lá. O detalhe está no `AGENTS.md`, §"ORGANIZAÇÃO DE DOCUMENTAÇÃO".

Antes de dar uma tarefa por pendente em produção, **confira no banco** (MCP do Lovable, só
SELECT). Na triagem de 23/09/2026 seis linhas de índice estavam erradas nesse ponto: cinco
tarefas de banco já tinham sido aplicadas em produção pelo chat do Lovable, que não deixa rastro
no repositório.

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
- As rotas do `App.tsx` **sao** `lazy`. O commit `ba0c461b` registra a regressao anterior. As duas pecas que evitam lentidao no preview sao `server.warmup` (no `vite.config.ts`, so dev) e `src/components/PrefetchDeRotas.tsx` (traz os chunks depois do primeiro paint). Nao altere o lazy sem considerar as duas.
- **Nao reintroduza `manualChunks`.** O agrupamento forcado de vendor causou erro de inicializacao circular/TDZ em producao. A divisao atual vem dos `import()` das rotas; ajuste o `import()` especifico se um chunk precisar mudar.
