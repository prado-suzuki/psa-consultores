

## Plano: Refatorar tabela PIS/COFINS para Pivot Table

### Lógica de Pivotamento (`useMemo` no componente)

Substituir o flatten atual por uma transformação pivot:

1. **Extrair períodos únicos** — iterar `apiData.periodos`, coletar `dt_ini` ordenados cronologicamente → gera as colunas dinâmicas (ex: `2025-01`, `2025-02`)
2. **Agrupar por chave composta** — `${cst_pis}|${cod_cta}|${descricao_conta}|${bloco_efd}` → cada chave = 1 linha
3. **Preencher valores** — para cada grupo, mapear `dt_ini → vlr_efd`. Períodos sem valor = `0`

Tipo de saída:
```typescript
interface PivotRow {
  cst_pis: string;
  cod_cta: string;
  descricao_conta: string;
  bloco_efd: string;
  valores: Record<string, number>; // chave = "YYYY-MM", valor = vlr_efd
}
```

### Renderização da Tabela

**Colunas fixas** (esquerda, sticky): CST, CTA, Descrição Conta, Bloco EFD

**Colunas dinâmicas** (direita, scroll horizontal): uma por período, header formatado como `MM/YYYY`

**Células de valor**: `tabular-nums text-right text-xs`, formatadas com `toLocaleString('pt-BR')`. Valores negativos em `text-red-600`. Zero exibido como `0,00`.

**Scroll**: container com `overflow-x-auto`. Colunas fixas com `sticky left-0 bg-white z-10` (encadeadas com `left-[Npx]` para cada coluna fixa).

**Row count**: atualizado para contar linhas pivotadas.

### Arquivo afetado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Substituir flatten por pivot `useMemo`, reescrever `<Table>` com colunas dinâmicas e sticky |

Tipo `PisCofinsRow` em `pisCofins.ts` permanece (não remove), mas não será mais usado pela tabela — pode adicionar `PivotRow` inline ou no types.

