## Objetivo

Executar `supabase/migrations/20260803170000_osg_solicitacao.sql` (commit 2568bb6b) exatamente como está, e regenerar `src/integrations/supabase/types.ts`.

## O que o arquivo faz (lido, não alterado)

`BEGIN` → cria o enum `public.osg_solicitacao_status` (`rascunho`, `enviada`, `encerrada`) com guard em `pg_type` → cria `public.solicitacao` com 10 colunas (`id`, `cliente_id` NOT NULL FK cascade, `ordem_servico_id` FK set null, `status` NOT NULL default `rascunho`, `enviada_em`, `encerrada_em`, `observacao`, `created_at`, `created_by` default `auth.uid()`, `updated_at`, `updated_by` default `auth.uid()`) → comments → índice `idx_solicitacao_cliente` e índice único parcial `uq_solicitacao_ativa_por_cliente` com `where status <> 'encerrada'` → trigger `trg_solicitacao_updated_at` reaproveitando `checklist_touch_updated_at` → habilita RLS e cria 5 policies (4 de equipe por `cliente_visivel_para` + `has_role_or_higher('team_member')`, 1 aditiva do cliente por `resolve_user_cliente_id` restrita a `status = 'enviada'`) → grants para `authenticated` e `service_role`, revoke de `anon` → `COMMIT`.

Sem DML, sem alterar tabela existente, sem coluna `ambiente` (decisão registrada no próprio arquivo).

## Execução

1. Rodar a migration pela ferramenta de migration, com o SQL do arquivo exatamente como está.
2. Deixar o `types.ts` ser regenerado após a migration aprovada.

Nada de front. Nada fora de EDU-21 (itens EDU-22, `solicitacao_id` EDU-23 e botões ALE-30 ficam de fora).

## GATE (devolvo os cinco resultados, sem resumir)

1. `enum_range` do `osg_solicitacao_status` — esperado `rascunho, enviada, encerrada` nessa ordem.
2. `information_schema.columns` de `solicitacao` — esperado 10 colunas, sem `ambiente`, com os NOT NULL e defaults acima.
3. `pg_indexes` — esperado 3, incluindo o único parcial com o `WHERE`.
4. `pg_policies` — esperado 5, com a do cliente citando `resolve_user_cliente_id` e `status = 'enviada'`.
5. `pg_constraint` contype='f' — esperado 2 FKs, `cliente_id` com `c` e `ordem_servico_id` com `n`.

Mais a confirmação, lendo o arquivo, de que `types.ts` traz a tabela `solicitacao`.

## Se algo falhar

Devolvo a mensagem completa e o diagnóstico da causa, sem alterar a migration e sem contornar.
