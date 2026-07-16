## RLS-P1-06 (correção) — fechar SELECT/INSERT em `projeto_justificativas`

### O que faz
Remove as duas policies legadas permissivas (`team_member_select_projeto_justificativas` e `team_member_insert_projeto_justificativas`) que conviviam em OR com as isoladas e neutralizavam o isolamento por cluster. Recria SELECT e INSERT com checagem real via `projects.cluster_id` + `resolve_user_cluster_ids(auth.uid())`. UPDATE/DELETE (P1-05) intocados.

### Passos
1. Criar `supabase/migrations/rls_p1_06_fix_projeto_justificativas_select_insert.sql` com o SQL exato enviado (para trilha versionada).
2. Aplicar via tool de migration (mesmo SQL, sem o bloco opcional de `gargalo_melhorias`).
3. Rodar validações (a) e (b) via `psql` e devolver o resultado.

### SQL da migration (idêntico ao enviado)
```sql
-- SELECT
DROP POLICY IF EXISTS team_member_select_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_select ON public.projeto_justificativas;
CREATE POLICY projeto_justificativas_select ON public.projeto_justificativas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
             AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid()))))
);

-- INSERT
DROP POLICY IF EXISTS team_member_insert_projeto_justificativas ON public.projeto_justificativas;
DROP POLICY IF EXISTS projeto_justificativas_insert ON public.projeto_justificativas;
CREATE POLICY projeto_justificativas_insert ON public.projeto_justificativas FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = projeto_id
                  AND (p.cluster_id IS NULL OR p.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))))
);
```

### Fora de escopo
- Bloco `gargalo_melhorias` DELETE (fica comentado, não aplica).
- UPDATE/DELETE de `projeto_justificativas` (já corretos, P1-05).
- Qualquer outra tabela ou código do app.

### Validação pós-migration
- (a) `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='projeto_justificativas' AND (qual='true' OR with_check='true');` → esperado 0 linhas.
- (b) `SELECT cmd, count(*) FROM pg_policies WHERE ... GROUP BY cmd ORDER BY cmd;` → esperado SELECT=1, INSERT=1, UPDATE=1, DELETE=1.
