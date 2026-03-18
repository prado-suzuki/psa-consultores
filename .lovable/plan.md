

# Corrigir auto-preenchimento de Cliente ao selecionar Projeto

## Diagnóstico

O `TaskModal.tsx` **já possui** o Effect B (linhas 258-269) que preenche `client_id` a partir do `external_client_id` do projeto selecionado. Porém, o dropdown de clientes (linhas 147-158) busca apenas da tabela do ambiente atual (`cliente` ou `cliente_dev`). Se o `external_client_id` do projeto referencia a tabela do outro ambiente, o ID é setado mas não aparece no dropdown — mostra "Nenhum".

## Alteração

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskModal.tsx`, linhas 147-158.

Adicionar fallback bidirecional na query de clientes — buscar de ambas as tabelas e deduplicar por nome (mesmo padrão já usado em `useExternalClients`):

```typescript
const { data: clients = [] } = useQuery({
  queryKey: ['clients-for-tasks'],
  queryFn: async () => {
    const [{ data: primary }, { data: fallback }] = await Promise.all([
      supabase.from(clienteTable).select('id, nome').eq('ativo', true).order('nome'),
      supabase.from(fallbackTable).select('id, nome').eq('ativo', true).order('nome'),
    ]);
    // Merge: preferir IDs do ambiente atual, adicionar do fallback se nome não existe
    const map = new Map<string, { id: string; nome: string }>();
    for (const c of (primary || [])) map.set(c.nome, c);
    for (const c of (fallback || [])) { if (!map.has(c.nome)) map.set(c.nome, c); }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  },
  enabled: open,
});
```

Adicionar `fallbackTable`:
```typescript
const fallbackTable = isProductionEnvironment ? 'cliente_dev' : 'cliente';
```

## Escopo

- 1 arquivo, ~15 linhas alteradas.
- Sem migração de banco.
- O Effect B existente já cuida do auto-fill; o fix é apenas garantir que o ID do projeto tenha match no dropdown.

