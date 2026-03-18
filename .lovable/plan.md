

# Plano: RPC `get_ordens_by_client_name` + ajuste no hook

## Etapa 1 — Migração: criar function SQL

```sql
CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
RETURNS SETOF ordem_servico
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH client_name AS (
    SELECT nome FROM cliente WHERE id = p_client_id
    UNION
    SELECT nome FROM cliente_dev WHERE id = p_client_id
    LIMIT 1
  ),
  all_ids AS (
    SELECT id FROM cliente WHERE nome = (SELECT nome FROM client_name) AND excluido = false
    UNION
    SELECT id FROM cliente_dev WHERE nome = (SELECT nome FROM client_name) AND excluido = false
  )
  SELECT os.* FROM ordem_servico os
  WHERE os.id_cliente IN (SELECT id FROM all_ids)
    AND os.excluido = false
  ORDER BY os.created_at DESC;
$$;
```

## Etapa 2 — Ajustar `useClienteOrdens` em `src/hooks/useTaxReferenceData.ts`

Substituir a implementação atual (que usa `supabase.from('ordem_servico')...eq('id_cliente', clientId)`) por:

```typescript
export function useClienteOrdens(clientId: string | null) {
  return useQuery({
    queryKey: ['cliente-os', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.rpc('get_ordens_by_client_name', {
        p_client_id: clientId,
      });
      if (error) throw error;
      return (data || []) as OrdemServico[];
    },
    enabled: !!clientId,
  });
}
```

Remover a importação de `isProductionEnvironment` se não for mais usada por nenhum outro hook neste arquivo (verificar antes).

## Resultado

- 1 round-trip ao banco para resolver cliente + OS
- Funciona independente de o `clientId` vir de `cliente` ou `cliente_dev`

