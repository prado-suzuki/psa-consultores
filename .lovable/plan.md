# Plano — DELETE de org_tasks para sublíder criador

## Contexto
Hoje `rls_org_tasks_delete` só libera DELETE para `lider+`. Sublíderes que criaram a própria tarefa (ex.: Geizi, "Revisão Livro Caixa", `cc37fe25-b7a2-430f-8724-26e0be5a8366`) recebem "Você não tem permissão para excluir esta tarefa". Coordenação (Patricia) aprovou: criador `sublider+` pode excluir a própria tarefa.

## Fora de escopo
- Não mexer em SELECT/INSERT/UPDATE de `org_tasks`.
- Não mexer no trigger `trg_org_tasks_team_member_status_only` nem na função `org_tasks_team_member_status_only()`.
- Sem alterações de frontend.
- `team_member` puro continua sem poder excluir.

## Passo 1 — Pré-voo (somente leitura)
Confirmar antes de aplicar:
- Existe exatamente **uma** policy de DELETE em `public.org_tasks`, com nome `rls_org_tasks_delete`.
- Nenhuma policy `RESTRICTIVE` na tabela.
```sql
SELECT policyname, cmd, permissive, roles, qual
FROM pg_policies
WHERE schemaname='public' AND tablename='org_tasks';
```

## Passo 2 — Migration (uma só)
```sql
DROP POLICY IF EXISTS rls_org_tasks_delete ON public.org_tasks;

CREATE POLICY rls_org_tasks_delete ON public.org_tasks
FOR DELETE TO authenticated
USING (
  public.has_role_or_higher(auth.uid(),'lider'::app_role)
  OR (
    public.has_role_or_higher(auth.uid(),'sublider'::app_role)
    AND created_by = auth.uid()
  )
);
```

## Passo 3 — GATE (subtransação com rollback)

### Ordem de execução (importante)
Selecionar **primeiro** os ids/user_ids dos casos 2 e 3 com o papel privilegiado (antes de qualquer `SET LOCAL role authenticated`). Depois de trocar para `authenticated`, RLS em `org_tasks` e `user_roles` esconde linhas e as queries voltariam vazias. Só então abrir a subtransação por caso, impersonar via `SET LOCAL request.jwt.claims` + `SET LOCAL role authenticated`, chamar `can_perform('org_tasks','delete', <id>)` e `ROLLBACK`.

### Casos

**Caso 1 — Geizi (sublíder, criadora)**
- `sub` do JWT = `7d082ece-6710-4148-9bcb-e76287380319`
- task = `cc37fe25-b7a2-430f-8724-26e0be5a8366`
- Esperado: `allowed = true`.

**Caso 2 — Sublíder apenas delegado (não criador)**
Selecionar com papel privilegiado, restringindo o responsável a **sublider puro** (evita cair em líder/admin, que poderiam excluir e falsear o GATE):
```sql
SELECT id, created_by, assigned_to
FROM public.org_tasks
WHERE assigned_to <> created_by
  AND public.has_role_or_higher(assigned_to,'sublider'::app_role)
  AND NOT public.has_role_or_higher(assigned_to,'lider'::app_role)
LIMIT 1;
```
- `sub` do JWT = `assigned_to` (o sublíder delegado), **nunca** o `created_by`.
- Esperado: `allowed = false`.
- Se não houver linha, reportar e pular com justificativa.

**Caso 3 — team_member puro**
Selecionar com papel privilegiado um `user_id` com role exatamente `team_member` (e sem role superior) e uma task qualquer.
- Esperado: `allowed = false`.

Só marcar como concluído se os três resultados baterem.

## Riscos
Baixo: mudança escopada a uma policy DELETE, aditiva (amplia acesso para o próprio criador sublíder). Não afeta leitura nem escrita de outras operações.
