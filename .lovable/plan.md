## Pré-checagens (Passo 1)

**(1) Policy atual de SELECT** — confirma regressão:
```
USING (has_role(auth.uid(),'admin')
       OR has_role_or_higher(auth.uid(),'team_member')
       OR assigned_to = auth.uid()
       OR created_by = auth.uid())
```
Contém `has_role_or_higher(..., 'team_member')` → **pré-condição satisfeita**, pode prosseguir.

**(2) Função `can_view_org_project`**: existe (`pronargs=2`). OK.

**(3) Inventário de policies em `org_tasks`**: 4 policies, uma por comando (DELETE/INSERT/SELECT/UPDATE). Só a de SELECT será tocada.

## Impacto (Passo 2)

Total: **345 tarefas**. Resumo do que cada perfil passará a enxergar:

- **Admins (6)**: Alexandre, Bernardo, Carlos Prado, Patricia Melo, Eduardo, Mariana → **345/345** (vê tudo). ✓
- **Líderes/Sublíderes com escopo amplo** (Geizi 342; Washington/Felipe/Ricardo/Diego/Gabriel/Mayara/Marcely/Monica 338; Maria Lizot 280) → continuam vendo as tarefas dos projetos das áreas/equipes que gerenciam via `can_view_org_project`. ✓
- **Membros sem escopo de liderança**: Anderson 24, Hercio 19, Leonardo 16, Maritsa/Anne/Luana/Fernando 8, João 7, Karlene 1 → veem só atribuídas/criadas por si. ✓
- **Sem tarefas atribuídas**: IAplicada, Thiago, Jakeline, James, Luciano, Automação PSA, Welber → 0. ✓ (esperado — não têm atribuições; vazamento cross-cluster eliminado)

Padrão coerente com o objetivo: admin tudo, líder/sublíder limitado por área, member só o seu. Nenhuma concessão nova — apenas restrição.

## Migration proposta (Passo 3)

Arquivo novo: `supabase/migrations/<timestamp>_restore_rls_org_tasks_select.sql`

```sql
BEGIN;

DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    project_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'lider'::app_role)
      OR public.has_role(auth.uid(), 'sublider'::app_role)
    )
    AND public.can_view_org_project(auth.uid(), project_id)
  )
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

COMMIT;
```

Características:
- Transação única e idempotente (`DROP POLICY IF EXISTS` + `CREATE POLICY`).
- Toca **apenas** `rls_org_tasks_select`. Demais policies (INSERT/UPDATE/DELETE), schema, RLS, funções e outras tabelas permanecem intactos.
- Apenas restringe leitura — não há risco de vazamento.

## Pós-validação (Passo 4)

Após executar, rodarei:
```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname='public' AND tablename='org_tasks' AND policyname='rls_org_tasks_select';

SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='org_tasks' ORDER BY cmd, policyname;
```
Esperado: novo `qual` aplicado, mesmas 4 policies do inventário inicial.

## Rollback (caso quebre algo crítico)
Recria a policy permissiva anterior (mesmo conteúdo do estado atual) — também idempotente em transação única.

Aguardando aprovação para executar a migration.