## Objetivo

Gerar **um arquivo único pra você baixar agora** com o retrato de RLS e policies do banco, e deixar a base pronta pra virar referência viva no app depois.

Tudo somente-leitura. Zero migration, zero edit em código, zero mexer em policy.

## Fase 1 — Arquivo pra baixar (agora)

**Entregável único:** `/mnt/documents/arquitetura/rls_e_policies.xlsx`

Planilhas dentro do arquivo:

1. **`Resumo`** — visão executiva em PT-BR:
   - Total de tabelas no `public`.
   - Quantas com RLS habilitado vs desabilitado.
   - Top riscos: tabelas com policy `USING (true)` sem checagem de role, tabelas sem nenhuma policy mas com RLS off, tabelas críticas (profiles, user_roles, dashboards, tickets, cliente, contribuinte) e o status delas.
   - Para cada risco, uma frase explicando o que isso significa na prática ("qualquer usuário autenticado consegue ler/deletar tudo nessa tabela").

2. **`Status_por_tabela`** — uma linha por tabela: nome, RLS on/off, nº de policies SELECT/INSERT/UPDATE/DELETE, flag de risco (OK / Atenção / Crítico).

3. **`Policies_detalhadas`** — uma linha por policy: tabela, nome da policy, comando, roles, expressão `USING`, expressão `WITH CHECK`, classificação automática (ex: "admin-only", "self-only", "team_member+", "aberto autenticado", "público").

Como vou montar:
- Queries somente-leitura em `pg_policies` e `pg_class` via `supabase--read_query`.
- Script Python lê os resultados e escreve o `.xlsx` (biblioteca `xlsxwriter` já disponível).
- No fim, emito o `<presentation-artifact>` pra você baixar direto do chat.

## Fase 2 — Referência viva no app (depois que você revisar a Fase 1)

Quando você confirmar que o formato do diagnóstico te serve, eu proponho um plano separado pra criar uma rota interna (ex: `/admin/arquitetura/rls`) restrita a admin que mostra essas mesmas 3 visões consultando o banco ao vivo, com botão de exportar pro mesmo xlsx. Isso vira código de verdade (componentes + hook + RLS na rota) e merece um plano dedicado depois — não vou misturar com o entregável de download.

## O que NÃO vou fazer nesta rodada

- Não vou criar a página `/admin/arquitetura` agora (fica pra Fase 2, com plano próprio).
- Não vou tocar em policies, funções, triggers ou migrations.
- Não vou incluir ER diagram, índices, lista de funções, nem sync com BigQuery — você pediu escopo menor.
- Não vou expor secrets nem service role key.

## Próximo passo

Aprove e eu rodo a Fase 1: gero o `.xlsx`, te entrego o link de download no chat e um resumo de 5 linhas com os principais riscos achados.