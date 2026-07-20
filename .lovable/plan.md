## Objetivo
Adicionar coluna "Acesso" (arquétipos de RLS) ao gerador do mapa do banco, sem editar o `.md` à mão.

## Pré-voo (confirmado no contexto)
- `scripts/gen-mapa-banco.mjs` existe (visível no codebase-context).
- `docs/rls/mapa-do-banco.md` é gerado por esse script.

## Passos
1. **Substituir integralmente** `scripts/gen-mapa-banco.mjs` pelo conteúdo fornecido na mensagem — inclui:
   - Tabela `ACESSO` (arquétipo por tabela, curado do `pg_policies` vivo).
   - Constante `ARQ_LEGENDA` renderizada como seção "## Acesso (RLS) — legenda dos arquetipos".
   - Coluna "Acesso" no índice de tabelas.
   - Linha "**Acesso:** <arquetipo>" em cada bloco de "Detalhe por tabela".
   - Layout mais compacto (cols + FK na mesma linha) para caber em <800 linhas.
2. **Executar** `node scripts/gen-mapa-banco.mjs` a partir da raiz para regenerar `docs/rls/mapa-do-banco.md`. Se `node` não estiver disponível no sandbox, reportar o erro em vez de editar o `.md` manualmente.
3. **Não tocar** em: `types.ts`, migrations, schema/RLS, `AGENTS.md`, `CLAUDE.md`, `docs/AI_CONTEXT.md`, código do app.

## GATE (verificação após rodar)
- `wc -l docs/rls/mapa-do-banco.md` → < 800 (esperado ~747).
- `grep -c "^| \[" docs/rls/mapa-do-banco.md` bate com nº de tabelas do índice; header da tabela tem 5 colunas incluindo "Acesso".
- Existe seção `## Acesso (RLS) — legenda dos arquetipos`.
- Spot-check via grep: `cliente` → `cluster-cliente`; `tickets` → `chamados`; `contatos` → `publico`; `metas` → `desempenho`; `processes` → `cluster-mapa`; `profiles` → `proprio-usuario`.

## Entrega
Dois arquivos alterados: `scripts/gen-mapa-banco.mjs` (novo conteúdo) e `docs/rls/mapa-do-banco.md` (regenerado). Reporto os números do GATE no retorno.
