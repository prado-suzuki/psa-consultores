## RLS-P1-05 — `projeto_justificativas`: UPDATE/DELETE por cluster

SQL recebido íntegro (sem truncamento). Criar `supabase/migrations/<timestamp>_rls_p1_05_projeto_justificativas.sql` com exatamente o conteúdo enviado. Nenhuma outra alteração no repo.

### O que a migration faz

1. **Limpeza defensiva** — DO block dropa qualquer policy remanescente com `qual='true'` ou `with_check='true'` em `projeto_justificativas`.
2. **Drops explícitos** de `team_member_update_projeto_justificativas`, `team_member_delete_projeto_justificativas`, `projeto_justificativas_update`, `projeto_justificativas_delete` (todos com `ON public.projeto_justificativas`).
3. **`projeto_justificativas_update`** — `FOR UPDATE TO authenticated`, `USING` = `WITH CHECK`: `admin` OU (`team_member+` E existe `projects p` com `p.id = projeto_id` e `p.cluster_id IS NULL OR p.cluster_id = ANY(resolve_user_cluster_ids(auth.uid()))`).
4. **`projeto_justificativas_delete`** — `FOR DELETE TO authenticated`, mesma checagem com piso `lider+`.
5. **SELECT preservado** (`projeto_justificativas_select`, 09/07) — não é tocado.
6. **INSERT preservado** — bloco opcional permanece **comentado**, conforme instrução.

### Pós-migration

- Rodar `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='projeto_justificativas' AND (qual='true' OR with_check='true')` → deve retornar **0 linhas**.
- Listar policies da tabela e confirmar: SELECT/INSERT intactas, UPDATE/DELETE novas com checagem real (sem `USING(true)`).
- `types.ts` não muda (nenhuma função nova).

### Fora de escopo

Nenhuma outra tabela, coluna, seed, hook, componente ou doc. Front (`useProjetos.ts → syncJustificativas`) continua funcionando para projetos do próprio cluster; escrita em projetos de outro cluster (que o usuário nem enxerga) fica bloqueada.

### Reversibilidade

Aditivo. Rollback = dropar as 2 policies novas e recriar as `team_member_*` antigas com `USING(true)`.
