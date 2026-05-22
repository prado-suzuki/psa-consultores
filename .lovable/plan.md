# Correção: sublíder não consegue excluir tarefa (e "volta" depois)

## Diagnóstico

Dois problemas independentes, ambos confirmados:

### 1. RLS bloqueia DELETE para sublíder
Política atual em `public.org_tasks`:

```text
rls_org_tasks_delete (DELETE):
  has_role_or_higher(auth.uid(), 'lider') OR created_by = auth.uid()
```

Ou seja, só **líder/admin** ou **o criador** da tarefa podem excluir. Sublíder que não criou a tarefa é silenciosamente barrado pelo RLS. Isso é inconsistente com `INSERT` e `UPDATE` da mesma tabela, que já liberam sublíder:

```text
rls_org_tasks_update:
  has_role_or_higher(auth.uid(), 'sublider') OR (team_member AND project member)
```

A tarefa "teste" não foi criada pelo sublíder → DELETE negado pelo Postgres com 0 linhas afetadas.

### 2. Hook reporta sucesso mesmo quando RLS bloqueia
`useDeleteOrgTask` em `src/hooks/useOrgTasks.ts` (linhas 263–292):

```ts
const { error } = await supabase.from('org_tasks').delete().eq('id', id);
if (error) throw error;
// → mostra toast "Tarefa excluída"
```

Quando o RLS bloqueia um DELETE, o PostgREST **não retorna erro** — retorna 0 linhas afetadas. Resultado: o usuário vê toast de sucesso, a lista é invalidada, e a tarefa "volta a aparecer" no refetch. Foi exatamente o sintoma relatado.

## Correções

### A. Migração de RLS — sublíder pra cima pode excluir

Recriar a policy `rls_org_tasks_delete` permitindo **sublíder, líder e admin** (via `has_role_or_higher('sublider')`). Team_member e client não excluem tarefas.

```sql
DROP POLICY rls_org_tasks_delete ON public.org_tasks;

CREATE POLICY rls_org_tasks_delete ON public.org_tasks
FOR DELETE TO authenticated
USING (has_role_or_higher(auth.uid(), 'sublider'::app_role));
```

### B. Detectar DELETE silencioso no hook

Em `src/hooks/useOrgTasks.ts`, ajustar `useDeleteOrgTask` para usar `.select()` e validar a contagem retornada. Se vier vazio, lançar erro explícito ("Sem permissão para excluir esta tarefa") — assim o usuário recebe toast de erro real em vez de falso sucesso, mesmo que no futuro outra policy volte a bloquear.

```ts
const { data, error } = await supabase
  .from('org_tasks')
  .delete()
  .eq('id', id)
  .select('id');

if (error) throw error;
if (!data || data.length === 0) {
  throw new Error('Você não tem permissão para excluir esta tarefa.');
}
```

## Escopo

- 1 migração SQL (substituição da policy de DELETE de `org_tasks`).
- 1 edição em `src/hooks/useOrgTasks.ts` (função `useDeleteOrgTask`).

Sem mudanças de UI, sem mexer em outras tabelas/hooks.
