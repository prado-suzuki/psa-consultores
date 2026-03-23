

## Plano: Colunas de Auditoria na `pis_cofins_regra`

### 1. Migration SQL

Adicionar colunas `updated_at` e `updated_by` na tabela `pis_cofins_regra`:

```sql
ALTER TABLE public.pis_cofins_regra
  ADD COLUMN updated_at timestamptz DEFAULT now(),
  ADD COLUMN updated_by text;
```

Sem trigger automático para `updated_at` — vamos controlar via código para enviar ambos os campos juntos.

### 2. Hook `useRegrasNCM.ts`

- Importar `useAuth` do `AuthContext`
- No `updateRegra.mutationFn`, injetar `updated_at: new Date().toISOString()` e `updated_by: user?.email` no payload de update
- No `createRegra.mutationFn`, injetar os mesmos campos
- Usar `as any` com comentário justificativo (colunas ainda não tipadas no types.ts gerado)

### 3. Modal `RegraFormSheet.tsx`

No modo **view**, adicionar uma seção de metadados no final com separador visual:

- "Última atualização" — exibe `updated_at` formatado em pt-BR (`dd/MM/yyyy HH:mm`)
- "Atualizado por" — exibe `updated_by` (e-mail)
- Estilo discreto: texto menor, cor muted, separador `border-t`

Esses campos são somente leitura e **nunca** aparecem no formulário de edição.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Migration SQL | ADD COLUMN `updated_at`, `updated_by` |
| `src/hooks/useRegrasNCM.ts` | Injetar campos de auditoria nas mutations |
| `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx` | Exibir metadados no modo view |

