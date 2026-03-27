

## Plano: Restaurar campo CST PIS/COFINS no formulário do Mapa NCM

### Diagnóstico

O componente `CstCombobox` já existe no `RegraFormSheet.tsx` (linhas 118-199) e exibe código + descrição na mesma linha. Porém o `FormField` que o utiliza foi removido do JSX do formulário — entre as linhas 334 e 337 há apenas uma linha em branco onde deveria estar o campo CST.

O `handleFormSubmit` (linha 249-252) já popula `desc_cst` automaticamente a partir do CST selecionado e sincroniza `cst_cofins = cst_pis`.

### Alterações em `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

**1. Adicionar o campo CST PIS/COFINS com Combobox no formulário (entre linha 334 e 337)**

Inserir após o grid de NCM/Setor e antes de Base Legal:

```tsx
{/* Permite Crédito + Tipo Crédito */}
<div className="grid grid-cols-2 gap-4">
  <FormField control={form.control} name="permite_credito" render={({ field }) => (
    <FormItem>
      <FormLabel>Permite Crédito</FormLabel>
      <Select onValueChange={field.onChange} value={field.value ?? ''}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="S">Sim</SelectItem>
          <SelectItem value="N">Não</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )} />
  <FormField control={form.control} name="tipo_credito" render={({ field }) => (
    <FormItem>
      <FormLabel>Tipo de Crédito</FormLabel>
      <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</div>

{/* CST PIS/COFINS — campo unificado com código + descrição */}
<FormField control={form.control} name="cst_pis" render={({ field }) => (
  <FormItem>
    <FormLabel>CST PIS/COFINS</FormLabel>
    <FormControl>
      <CstCombobox
        value={field.value}
        onChange={field.onChange}
        onSyncDesc={(desc) => form.setValue('desc_cst', desc)}
        mode="code"
        placeholder="Selecione o CST..."
      />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
```

**2. Adicionar Descrição CST na view mode (linha ~276)**

Após o campo "CST PIS/COFINS" na visualização, adicionar:

```tsx
<DetailField label="Descrição CST" value={regra.desc_cst} />
```

**3. O `handleFormSubmit` já salva corretamente**: `cst_pis` e `cst_cofins` recebem o código, `desc_cst` recebe a descrição por extenso — cada um em seu campo separado no banco.

### Resultado

- Combobox mostra "01 — Operação Tributável com Alíquota Básica" em cada opção
- Ao selecionar, `cst_pis` salva o código ("01"), `desc_cst` salva a descrição
- View mode exibe ambos os campos

