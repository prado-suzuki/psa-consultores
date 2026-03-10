

## Plano: Sugerir categorias no formulário com base nos serviços contratados da OS

### O que muda

Apenas `FiscalProjetosCadastro.tsx` — nenhuma alteração de banco, RLS ou outras tabelas.

### Nova query: buscar categorias sugeridas pela OS do cliente

Após a query `clienteOS` já existente, adicionar uma nova query que:

1. Extrai todos os UUIDs do campo JSONB `servicos_contratados` de todas as OS ativas (`situacao = 'em_andamento'`) do cliente selecionado
2. Com esses UUIDs, busca em `produto_servico` os `servico_prestado_id` correspondentes
3. Retorna o Set de IDs de `servicos_prestados` sugeridos

```typescript
const { data: suggestedCategoryIds = [] } = useQuery({
  queryKey: ['suggested-categories', formData.external_client_id, ordemServicoTable],
  queryFn: async () => {
    if (!formData.external_client_id) return [];
    
    // 1. Buscar OS ativas do cliente
    const { data: osData } = await supabase
      .from(ordemServicoTable)
      .select('servicos_contratados')
      .eq('id_cliente', formData.external_client_id)
      .eq('situacao', 'em_andamento');
    
    if (!osData?.length) return [];
    
    // 2. Extrair UUIDs de produto_segmento do JSONB
    const produtoIds = [...new Set(
      osData.flatMap((os: any) => {
        const sc = os.servicos_contratados;
        return Array.isArray(sc) ? sc : [];
      })
    )];
    
    if (!produtoIds.length) return [];
    
    // 3. Buscar mapeamento produto → serviço
    const { data: mappings } = await supabase
      .from('produto_servico')
      .select('servico_prestado_id')
      .in('produto_segmento_id', produtoIds);
    
    return [...new Set((mappings || []).map((m: any) => m.servico_prestado_id))];
  },
  enabled: !!formData.external_client_id,
});

// Converter para Set para lookup O(1)
const suggestedSet = useMemo(() => new Set(suggestedCategoryIds), [suggestedCategoryIds]);
```

**Nota sobre dev**: No ambiente de desenvolvimento (`contrato_dev`), o campo `servicos_contratados` pode não existir — nesse caso a query retorna array vazio e nenhum indicador aparece (comportamento normal).

### Alteração no dropdown de categorias

No `CommandItem` de cada categoria (linhas ~1482-1491), adicionar um badge "Contratado" quando `suggestedSet.has(category.id)` e a categoria estiver visível pelo filtro de área:

```tsx
<CommandItem
  key={category.id}
  value={category.nome}
  onSelect={() => handleCategoryToggle(category.id)}
>
  <Check className={`mr-2 h-4 w-4 ${formData.category_ids.includes(category.id) ? 'opacity-100' : 'opacity-0'}`} />
  {category.nome}
  {suggestedSet.has(category.id) && (
    <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
      Contratado
    </Badge>
  )}
</CommandItem>
```

### Regras respeitadas

- Nenhuma seleção automática de categorias
- Se o cliente não tiver OS ativa ou sem mapeamento → nenhum indicador
- Se a área selecionada não contiver as categorias sugeridas → indicadores não aparecem (já filtradas por `filteredCategories`)
- Nenhuma alteração de banco, RLS ou outras tabelas
- Nenhum delete + insert

