## Correção de 2 bugs de front (RLS-06 e RLS-03)

Sem migrations. Apenas React/TS.

### BUG 1 — `useUpdateOrgTask` envia payload inteiro e trigger `org_tasks_team_member_status_only` bloqueia
Arquivo: `src/hooks/useOrgTasks.ts` (função `useUpdateOrgTask`, linhas ~211-221).

Depois do fetch de `current` e antes do `.update()`, montar `changedOnly` comparando `current` × `updates` (mesma lógica já usada abaixo para `changedFields`). Se nada mudou, retornar `current` sem chamar `update`. Caso contrário, chamar `.update(changedOnly)`.

```ts
const changedOnly: Record<string, unknown> = {};
if (current) {
  for (const key of Object.keys(updates)) {
    if (key === 'id') continue;
    const oldVal = (current as any)[key] ?? null;
    const newVal = (updates as any)[key] ?? null;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedOnly[key] = (updates as any)[key];
    }
  }
}

if (Object.keys(changedOnly).length === 0) {
  return current;
}

await assertCanPerform('org_tasks', 'update', id);
const { data, error } = await supabase
  .from('org_tasks')
  .update(changedOnly)
  .eq('id', id)
  .select()
  .maybeSingle();
```

O bloco de `changedFields`/`logAction` abaixo permanece igual (pode reutilizar `changedOnly` como base, mas manter o formato `{old,new}` já existente para o audit — sem mudar contrato do log).

Efeito: um team_member que só troca status envia `{status}` → trigger permite. Se tentar mexer em responsável/horas, o payload contém esses campos e a RLS bloqueia como esperado.

### BUG 2 — `EquipeDetalhesChamado` redireciona por `assigned_to !== user.id`
Arquivo: `src/pages/equipe/EquipeDetalhesChamado.tsx` (linhas ~77-86).

Substituir o `useEffect` que valida `ticket.assigned_to !== user.id` por um que apenas redireciona quando o carregamento terminou e a RLS não devolveu o chamado:

```tsx
useEffect(() => {
  if (!loading && id && !ticket) {
    toast({
      title: 'Chamado indisponível',
      description: 'Você não tem acesso a este chamado ou ele não existe.',
      variant: 'destructive',
    });
    navigate('/equipe/chamados');
  }
}, [loading, ticket, id, navigate]);
```

Remover a dependência `user` que ficava só para a checagem antiga.

### Verificação
- `tsgo` para garantir tipagem.
- Fluxo manual: team_member arrasta card no kanban → status atualiza; líder de cluster abre chamado sem `assigned_to` = self → página carrega.

### Fora de escopo
Nada de SQL, nada de mudar policies/triggers, nada em outros hooks/páginas.