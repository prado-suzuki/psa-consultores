

## Plano: Ajustes nas abas Balancete e EFD ICMS da Auditoria Cruzada

### 1. Aba Balancete (`BalanceteEfdTab.tsx`)

**Toggle "Período Fechado":**
- Adicionar estado `periodoFechado` (boolean, default `false`)
- Importar `Switch` de `@/components/ui/switch`
- Renderizar o Switch ao lado do campo de busca, com label "Período Fechado"

**Coluna dinâmica:**
- Último `TableHead`: exibir "Saldo Período" se `!periodoFechado`, ou "Saldo Atual" se `periodoFechado`
- Último `TableCell`: renderizar `item.saldo_periodo` ou `item.saldo_atual` conforme o toggle
- Tipagem `BalanceteEfdItem` já possui `saldo_atual` — nenhuma alteração necessária

**Alerta visual de divergência:**
- Calcular `saldoComparacao = periodoFechado ? item.saldo_atual : item.saldo_periodo`
- Se `Math.abs(item.vlr_efd - saldoComparacao) > 0.05`, aplicar classes `bg-red-50 hover:bg-red-100` na `TableRow`

### 2. Aba EFD ICMS (`EfdcIcmsTab.tsx`)

**NFe não encontrada na EFD Contribuições:**
- Verificar se `nota.EFD_CONTRIB.CFOP.length === 0` (dados vazios)
- Se vazio: renderizar `<TableCell colSpan={3} className="text-xs text-center italic text-amber-600">NFe não encontrada na EFD Contribuições</TableCell>`
- Se preenchido: manter as 3 colunas atuais

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `BalanceteEfdTab.tsx` | Switch + coluna dinâmica + highlight divergência |
| `EfdcIcmsTab.tsx` | Tratamento NFe não encontrada |

2 arquivos, ~25 linhas de alteração.

