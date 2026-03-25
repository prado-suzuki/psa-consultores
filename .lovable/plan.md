

## Alterar campo Serviço no TaskModal para buscar via OS → Produto → Serviços

### Resumo
Substituir a query de `project_servicos` por uma cadeia: projeto → `ordem_servico_id` → `id_produto_segmento` → `produto_servico` → `servicos_prestados`. Campo fica desabilitado se projeto não tem OS ou OS não tem produto.

### Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Substituir o bloco da query (linhas 209-222)** por:

```typescript
// Local interfaces for type safety
interface OrdemServicoRow { id: string; id_produto_segmento: string | null }
interface ProdutoServicoRow { servico_prestado_id: string; servico: { id: string; nome: string } | null }

// Step 1: fetch projeto → ordem_servico_id → id_produto_segmento
const { data: produtoSegmentoId } = useQuery({
  queryKey: ['project-os-produto', watchedProjectId],
  queryFn: async () => {
    const { data: proj } = await supabase
      .from('tax_projects')
      .select('ordem_servico_id')
      .eq('id', watchedProjectId!)
      .single();
    if (!proj?.ordem_servico_id) return null;

    const { data: os } = await supabase
      .from('ordem_servico')
      .select('id, id_produto_segmento')
      .eq('id', proj.ordem_servico_id)
      .single() as { data: OrdemServicoRow | null; error: unknown };
    return os?.id_produto_segmento || null;
  },
  enabled: open && !!watchedProjectId,
});

// Step 2: fetch serviços vinculados ao produto via produto_servico
const { data: categorias = [] } = useQuery({
  queryKey: ['fiscal-task-servicos-by-produto', produtoSegmentoId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('produto_servico')
      .select('servico_prestado_id, servico:servicos_prestados(id, nome)')
      .eq('produto_segmento_id', produtoSegmentoId!) as {
        data: ProdutoServicoRow[] | null; error: unknown;
      };
    if (error) throw error;
    return (data || [])
      .map(r => r.servico)
      .filter((s): s is { id: string; nome: string } => !!s);
  },
  enabled: open && !!produtoSegmentoId,
});

// Derived state for the Serviço field
const servicoFieldDisabled = !!watchedProjectId && !produtoSegmentoId;
const servicoPlaceholder = !watchedProjectId
  ? "Selecione um projeto primeiro"
  : servicoFieldDisabled
    ? "Cadastre uma OS com produto no projeto"
    : "Selecione o serviço";
```

**Atualizar o JSX do campo Serviço (linhas 471-499):**
- Mostrar sempre (remover `{watchedProjectId && ...}` wrapper)
- Adicionar `disabled={!watchedProjectId || servicoFieldDisabled}`
- Usar `servicoPlaceholder` no placeholder
- Se `servicoFieldDisabled`, não renderizar os `SelectItem` de serviços

```tsx
<FormField
  control={form.control}
  name="servico_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Serviço</FormLabel>
      <Select
        onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
        value={field.value || '_none'}
        disabled={!watchedProjectId || servicoFieldDisabled}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={servicoPlaceholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="_none">Nenhum</SelectItem>
          {categorias.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Effect A (linha 234-235):** `servico_id` já é limpo ao trocar de projeto — mantém como está.

### Não alterado
- Nenhuma tabela ou migração
- Schema de `fiscal_tasks.servico_id` permanece igual
- Resto do TaskModal intacto

