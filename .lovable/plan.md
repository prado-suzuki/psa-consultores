

## Plano: Limpeza de código morto e campo órfão

### 1. Remover `useAreaServicos` e `TaxAreaCategoria` de `useTaxReferenceData.ts`

Deletar linhas 23-28 (interface `TaxAreaCategoria`) e linhas 75-87 (hook `useAreaServicos`). Nenhum arquivo importa esse hook ou interface.

### 2. Dropar coluna `area_id` da tabela `metas`

Migration SQL:
```sql
ALTER TABLE public.metas DROP COLUMN area_id;
```

### 3. Atualizar `useMetasDesempenho.ts`

Remover `area_id: string | null;` da interface `Meta` (L18).

### 4. Atualizar `DesempenhoMetas.tsx`

Remover `area_id: null,` da criação de meta (L106).

### Diagnóstico que justifica o drop

| Onde | Como `area_id` é usado |
|------|------------------------|
| `useMetasDesempenho.ts` L18 | Declarado na interface, nunca lido |
| `DesempenhoMetas.tsx` L106 | Sempre `null` hardcoded na criação |
| Filtros/formulários | Não aparece em nenhum |
| Banco (FK) | Nenhuma constraint |

**Veredicto**: campo 100% morto → dropar.

### Arquivos alterados

| Ação | Arquivo |
|------|---------|
| Editar | `src/hooks/useTaxReferenceData.ts` — remover interface + hook |
| Editar | `src/hooks/useMetasDesempenho.ts` — remover `area_id` da interface |
| Editar | `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` — remover `area_id: null` |
| Migration | `ALTER TABLE metas DROP COLUMN area_id` |

