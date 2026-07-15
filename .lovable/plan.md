## RLS-P1-04 — Isolamento por cluster no módulo Sistemas

Aplicar migration aditiva no padrão RLS-P1-01/02/03, adaptada ao M:N do módulo Sistemas.

### O que a migration faz

1. **`public.sistema_cluster_visivel(uuid)`** — SECURITY DEFINER, STABLE: admin OR sistema tem `cluster_id` primário do usuário OR existe linha em `sistema_clusters` para um cluster do usuário.
2. **Bloco defensivo** — remove qualquer policy remanescente com `USING(true)`/`WITH CHECK(true)` nas 3 tabelas.
3. **`sistemas_processo`** — DROP das `team_member_*` antigas + novas `rls_*`:
   - SELECT `team_member+`: primário OU compartilhado via `sistema_clusters` (M:N).
   - INSERT/UPDATE `team_member+`: apenas no cluster primário.
   - DELETE `lider+` no cluster primário. Admin bypassa.
4. **`sistema_clusters`** (M:N) — isola pelo próprio `cluster_id`: SELECT/INSERT/UPDATE `team_member+`; DELETE `lider+`.
5. **`sistema_responsaveis`** — deriva via `sistema_id → sistema_cluster_visivel(sistema_id)`: SELECT/INSERT/UPDATE `team_member+`; DELETE `lider+`.
6. **Sistemas com `cluster_id` primário NULL** (PSA PROJECTS, Google Chat) permanecem visíveis via `sistema_clusters` — não viram admin-only.

### Pós-migration

- Rodar validação `pg_policies` (deve retornar **0 linhas**).
- Listar policies das 3 tabelas e confirmar que só existem as `rls_*` (nenhuma `team_member_*` sobrando).
- `src/integrations/supabase/types.ts` é regenerado automaticamente (entra `sistema_cluster_visivel`).

### Fora de escopo
Nada além da migration. `useSistemas.ts` continua funcionando — o embed de `sistema_clusters` no SELECT já é lido pelas policies novas.

### Reversibilidade
Aditivo. Rollback = restaurar as `team_member_*` antigas + `DROP FUNCTION sistema_cluster_visivel`.

### Arquivo
`supabase/migrations/<timestamp>_rls_p1_04_sistemas_cluster.sql` com exatamente o SQL enviado.
