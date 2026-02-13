

## Adicionar coluna `porcentagem_psa` nas tabelas `per` e `dcomp`

### O que sera feito

Uma migration SQL adicionando a coluna `porcentagem_psa` do tipo `numeric`, nullable, com valor default `NULL`, em ambas as tabelas:

- `public.per`
- `public.dcomp`

### Migration SQL

```sql
ALTER TABLE public.per ADD COLUMN porcentagem_psa numeric;
ALTER TABLE public.dcomp ADD COLUMN porcentagem_psa numeric;
```

### Ajustes no codigo

Apos a migration, os tipos TypeScript serao regenerados automaticamente. Sera necessario atualizar os seguintes pontos que interagem com essas tabelas para considerar o novo campo:

1. **`CargaPerdcompCSV.tsx`** - Adicionar parsing da coluna `porcentagem_psa` no CSV para PER e DCOMP
2. **`sync-perdcomp` edge function** - Incluir `porcentagem_psa` nas interfaces `PerRecord` e `DcompRecord`
3. **`syncPerdcomp.ts`** (lib) - Incluir o campo no payload de sync
4. **Formularios de PER e DCOMP** (`PerFormModal.tsx`, `DcompFormModal.tsx`) - Adicionar campo de input para porcentagem_psa
5. **Tabela de exibicao** (`ControlePerdcomp.tsx`) - Exibir a coluna na listagem

### Detalhes tecnicos

- Tipo `numeric` sem precisao fixa, permitindo valores decimais livres
- Nullable e sem default, para nao impactar registros existentes
- Nenhuma alteracao em RLS necessaria (as politicas existentes ja cobrem a tabela inteira)

