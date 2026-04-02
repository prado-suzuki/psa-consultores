

## Plan: Adicionar campo "Percentual Aplicado (%)" no modal de PER

### Diagnóstico

O `PerFormModal.tsx` já possui `porcentagem_psa` no schema Zod (linha 97), nos defaultValues (linha 145), no reset de edição (linha 225), e nas mutations de create/update (linhas 290, 362). Porém, **não há nenhum `<FormField>` renderizado** para este campo no JSX.

### Correção: `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

**1. Adicionar validação `.max(100)` no schema** (linha 97):
```typescript
porcentagem_psa: z.coerce.number().max(100, 'Máximo 100%').nullable().optional(),
```

**2. Adicionar `<FormField>` antes do `<DialogFooter>`** (após linha 710, antes da 712):
```tsx
<FormField
  control={form.control}
  name="porcentagem_psa"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Percentual Aplicado (%)</FormLabel>
      <FormControl>
        <Input
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Ex: 15.00"
          value={field.value ?? ''}
          onChange={(e) =>
            field.onChange(
              e.target.value ? Math.min(Number(e.target.value), 100) : null
            )
          }
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Nenhum outro arquivo afetado

A lógica de persistência (create/update), draft, e reset de edição já tratam `porcentagem_psa`. Apenas o campo visual está ausente.

