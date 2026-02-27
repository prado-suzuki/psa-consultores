

# Restaurar campo Contribuinte no modal de cadastrar PER

## Contexto
O campo de contribuinte foi removido anteriormente, mas agora precisa voltar ao formulario, posicionado no topo, com a lista de contribuintes carregando corretamente a partir do banco.

## Alteracoes

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

### 1. Restaurar a query de contribuintes (apos linha 148)

Adicionar de volta a query que busca contribuintes do banco, filtrando por `clienteId`:

```typescript
const { data: contribuintes = [] } = useQuery({
  queryKey: ['contribuintes', clienteId],
  queryFn: async () => {
    if (!clienteId) return [];
    const { data, error } = await supabase
      .from('contribuinte_dev')
      .select('id, nome_razao_social, cpf_cnpj')
      .eq('cliente_id', clienteId)
      .order('nome_razao_social');
    if (error) throw error;
    return data || [];
  },
  enabled: !!clienteId,
});
```

### 2. Adicionar o campo visual no topo do formulario (antes do campo "Numero do Processo", linha ~459)

Inserir um `FormField` com `Select` para o contribuinte, pre-selecionando o `contribuinteId` vindo da prop quando disponivel:

```tsx
<FormField
  control={form.control}
  name="id_contribuinte"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Contribuinte</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o contribuinte" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {contribuintes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome_razao_social} {c.cpf_cnpj ? `(${c.cpf_cnpj})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3. Garantir inicializacao correta

O `defaultValues` ja inicializa `id_contribuinte` com `contribuinteId || ''` (linha 132), entao o campo vira pre-selecionado quando o filtro da pagina principal estiver ativo. O usuario tambem podera mudar manualmente se necessario.

### 4. Posicionamento

O campo Contribuinte ficara como o **primeiro campo** do formulario, antes de "Tipo de Declaracao" e "Numero do Processo".

