

## Diagnóstico: Tarefa excluída reaparece para outros usuários

### Causa raiz

`EquipeSprintDetalhes.tsx` usa `useState` local para `deliverables`. Os dados são carregados **uma única vez** no `useEffect` inicial. Não há subscription Realtime — quando o usuário A exclui uma tarefa, o usuário B nunca recebe a atualização.

### Solução: Adicionar Realtime subscription na tabela `sprint_deliverables`

#### Passo 1 — Habilitar Realtime na tabela (migração SQL)
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_deliverables;
```

#### Passo 2 — Adicionar subscription em `EquipeSprintDetalhes.tsx`

Dentro do `useEffect` que já observa `[id]`, após o `fetchSprintData()`, criar um channel Supabase:

```typescript
const channel = supabase
  .channel(`sprint-deliverables-${id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'sprint_deliverables',
    filter: `sprint_id=eq.${id}`,
  }, (payload) => {
    if (payload.eventType === 'DELETE') {
      setDeliverables(prev => prev.filter(d => d.id !== payload.old.id));
    } else if (payload.eventType === 'INSERT') {
      setDeliverables(prev => {
        if (prev.some(d => d.id === payload.new.id)) return prev;
        return [...prev, payload.new as Deliverable];
      });
    } else if (payload.eventType === 'UPDATE') {
      setDeliverables(prev =>
        prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } as Deliverable : d)
      );
    }
  })
  .subscribe();
```

No cleanup do `useEffect`, fazer `supabase.removeChannel(channel)`.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Migração SQL | `ALTER PUBLICATION supabase_realtime ADD TABLE sprint_deliverables` |
| `src/pages/equipe/EquipeSprintDetalhes.tsx` | Adicionar channel Realtime no `useEffect` existente com cleanup |

### Resultado
- Quando qualquer usuário exclui, cria ou edita uma tarefa, todos os outros usuários vendo a mesma sprint recebem a atualização em tempo real
- Zero alteração visual ou de lógica de negócio existente

