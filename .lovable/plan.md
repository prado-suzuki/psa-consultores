

## Tornar Data de Início e Data de Término obrigatórias

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Validação no `handleSubmit` (linha 431, após validação do responsável):**

```typescript
if (!formData.start_date) {
  toast.error('Data de Início é obrigatória');
  return;
}
if (!formData.end_date) {
  toast.error('Data de Término é obrigatória');
  return;
}
if (formData.start_date > formData.end_date) {
  toast.error('Data de Término deve ser posterior à Data de Início');
  return;
}
```

**2. Indicadores visuais nos labels (linhas 1025 e 1033):**

- Linha 1025: `<Label>Data de Início</Label>` → `<Label>Data de Início <span className="text-destructive">*</span></Label>`
- Linha 1033: `<Label>Data de Término</Label>` → `<Label>Data de Término <span className="text-destructive">*</span></Label>`

Nenhum outro arquivo alterado.

