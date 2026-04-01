

## Plan: Sync responsible_id com tax_project_members + Fix silent RLS failure

### Problema
A função `buildMembersList` em `src/hooks/useTaxProjects.ts` insere apenas `leader` e `member` em `tax_project_members`, ignorando o `responsible_id`. Isso faz com que o Responsável Executor não seja reconhecido pelo RLS como membro do projeto, bloqueando silenciosamente updates em `fiscal_tasks`.

---

### Alteração 1 — `src/hooks/useTaxProjects.ts` → `buildMembersList`

Adicionar o `responsible_id` à lista de membros com `role: 'responsible'`.

Na função `buildMembersList` (linha 370), receber também o `responsible_id` e incluí-lo:

```typescript
function buildMembersList(projectId: string, data: TaxProjectFormData) {
  const members: { project_id: string; user_id: string; role: string }[] = [];

  // Responsible executor
  if (data.responsible_id) {
    members.push({ project_id: projectId, user_id: data.responsible_id, role: 'responsible' });
  }

  // Leaders
  for (const uid of data.leader_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'leader' });
    }
  }

  // Members
  for (const uid of data.member_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'member' });
    }
  }

  return members;
}
```

Na mutação `useUpdateTaxProject`, ao calcular `removedMembers`, garantir que o antigo `responsible_id` (se trocado) seja removido **apenas se o role era `'responsible'`** — ou seja, só remover se o user não tem outro role no projeto. A lógica atual de `removedMembers` já faz isso corretamente porque compara sets de `user_id` completos (o novo `buildMembersList` já incluirá o novo responsible). Se o responsible antigo não estiver mais em nenhum role, será removido naturalmente.

---

### Alteração 2 — `src/hooks/useFiscalTasks.ts` → `useUpdateFiscalTask`

Após o `.maybeSingle()`, verificar se `data` é `null`. Se sim, lançar erro:

```typescript
if (!data) {
  throw new Error('Sem permissão para atualizar esta tarefa. Verifique se você é membro do projeto.');
}
```

Isso impede a escrita do audit log falso e mostra toast de erro.

---

### Alteração 3 — Migration SQL (backfill dados existentes)

Inserir em `tax_project_members` todos os `responsible_id` de projetos existentes que ainda não são membros:

```sql
INSERT INTO public.tax_project_members (project_id, user_id, role)
SELECT tp.id, tp.responsible_id, 'responsible'
FROM public.tax_projects tp
WHERE tp.responsible_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tax_project_members tpm
    WHERE tpm.project_id = tp.id
      AND tpm.user_id = tp.responsible_id
  );
```

---

### Resumo

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/hooks/useTaxProjects.ts` | `buildMembersList` inclui `responsible_id` com role `'responsible'` |
| 2 | `src/hooks/useFiscalTasks.ts` | Throw se `.maybeSingle()` retorna null (RLS bloqueou) |
| 3 | Migration SQL | Backfill de responsible_ids existentes em `tax_project_members` |

Nenhuma RLS policy alterada. Nenhuma tabela/coluna criada. Visual do modal inalterado.

