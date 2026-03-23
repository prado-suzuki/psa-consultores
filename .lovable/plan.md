

## Plano: Refatoração da camada de dados da Apuração PIS/COFINS

### Diagnóstico

**Estado atual**: Existem duas "gerações" de código coexistindo:
- **Geração 1 (projeto)**: `src/types/pisCofins.ts`, `src/hooks/usePisCofinsApuracao.ts`, `src/lib/pisCofinsFilters.ts` — usados pela página `ApuracaoPisCofins.tsx` atual (dashboard pivotado simples)
- **Geração 2 (anexos)**: `types.ts`, `apuracao.ts`, `usePisCofinsApuracao.ts`, `usePisCofinsCalculator.ts` — motor de cálculo completo com apuração de PIS/COFINS, rateio, carryforward de saldos, variante balancete e pivoteamento genérico

**Problemas identificados nos anexos**:
1. `usePisCofinsCalculator` mistura 4 responsabilidades: cálculo de resultados, cálculo de totais, montagem de colunas e pivoteamento de 6 tabelas — tudo num único `useMemo` gigante
2. `pivotItems` usa `any` no retorno e recalcula todas as 6 tabelas quando qualquer dependência muda
3. `calcTotais` recebe `any[]` — sem tipagem
4. Tipos duplicados entre `src/types/pisCofins.ts` e o `types.ts` anexo (mesmos campos, nomes diferentes)
5. O hook de fetch anexo usa `API_BASE_URL` diretamente em vez de `getApiUrl`

### Arquitetura proposta

```text
src/types/pisCofins.ts          ← Fonte única de tipagens (merge)
src/lib/apuracaoPisCofins.ts    ← Motor de cálculo puro (funções do apuracao.ts)
src/lib/pisCofinsFilters.ts     ← Predicados CST + buildPivot (já existe, expandir)
src/hooks/usePisCofinsApuracao.ts  ← Fetch only (já existe, ajustar tipagem)
src/hooks/usePisCofinsCalculator.ts ← Novo: orquestra cálculos com useMemo granulares
```

### Fase 1 — Unificar tipagens em `src/types/pisCofins.ts`

Mesclar os tipos dos anexos com os existentes. Manter os nomes do projeto (`PisCofinsItemCredito` etc.) como aliases para evitar breaking changes na página atual.

| Tipo existente | Tipo anexo | Ação |
|---|---|---|
| `PisCofinsItemCredito` | `ItemCredito` | Manter existente, exportar alias `ItemCredito` |
| `PisCofinsRateioReceitas` | `RateioReceitas` | Idem |
| `PisCofsinPeriodo` | `Periodo` | Idem |
| `PisCofinsApuracaoResponse` | `ApuracaoInput` | Expandir com campo `metadata` |
| — | `SaldoCarryforward` | Adicionar |
| — | `ResultadoApuracao` | Adicionar |
| — | `RateioResultado` | Adicionar |
| `PisCofinsRow` | — | Manter |
| `PivotRow` | — | Manter |

Adicionar tipo `ResultadoPeriodo` para tipar o retorno de `calcTodosPeriodos` (eliminar `any[]`).

### Fase 2 — Motor de cálculo: `src/lib/apuracaoPisCofins.ts`

Copiar **fielmente** todas as funções de `apuracao.ts` sem alterar nenhuma fórmula:
- Predicados: `isItemReceita`, `isItemSuspenso`, `isItemOutrasSaidas`, `isItemCredito`, `isItemIsencaoCredito`
- Seção 1 (Débitos): `calcReceitaPorConta`, `receitaBrutaTotal`, `exclusaoSuspensao`, `calcBaseDebito`
- Seção 2 (Créditos): `calcCreditoPorConta`, `calcBaseCredito`
- Seção 3 (Valores): `COFINS_POR_PIS`, `aliqCofins`, `calcValoresCredito`
- Seção 4 (Apuração): `calcApuracao`, `calcTodosPeriodos`
- Seção 5 (Rateio): `calcRateio`
- Variante Balancete: `valorBaseBalancete`, `calcCreditoPorContaBalancete`, `calcBaseCreditoBalancete`, `calcValoresCreditoBalancete`, `calcTodosPeriodosBalancete`
- Totais: `calcTotais` — **tipar o parâmetro** como `ResultadoPeriodo[]` em vez de `any[]`

Importar tipos de `@/types/pisCofins`. Zero alteração em lógica de negócio.

### Fase 3 — Expandir `src/lib/pisCofinsFilters.ts`

Adicionar predicados de item (delegando para `apuracaoPisCofins`):
- `isItemOutrasSaidas`, `isItemIsencaoCredito`

Adicionar `buildPivotGeneric` — versão parametrizável do `pivotItems` do calculator:
- Aceita `groupBy` e `valueFn` customizáveis
- Retorna `PivotRow[]` tipado (sem `any`)
- Mantém `buildPivot` existente inalterado para não quebrar a página atual

### Fase 4 — Hook de fetch: `src/hooks/usePisCofinsApuracao.ts`

Ajustes mínimos:
- Atualizar tipagem de retorno para `ApuracaoInput` (que agora inclui `metadata`)
- Manter uso de `getApiUrl` (já correto no projeto)
- O hook anexo é descartado — o existente já segue os padrões do projeto

### Fase 5 — Novo hook: `src/hooks/usePisCofinsCalculator.ts`

Desacoplar o `useMemo` monolítico em memos granulares:

```text
usePisCofinsCalculator({ data, tipoApuracao, periodoFechado })
  ├── resultados    = useMemo(calcTodosPeriodos | calcTodosPeriodosBalancete)
  ├── totais        = useMemo(calcTotais, [resultados])
  ├── columnsData   = useMemo(periods + yearsMap, [data])
  ├── resumoData    = useMemo(buildPivotGeneric, [data, tipoApuracao, periodoFechado])
  ├── debitosData   = useMemo(buildPivotGeneric, [data])
  ├── isencoesData  = useMemo(buildPivotGeneric, [data])
  ├── outrasSaidasData = useMemo(buildPivotGeneric, [data])
  ├── creditosData  = useMemo(buildPivotGeneric, [data, tipoApuracao, periodoFechado])
  └── isencoesCredito = useMemo(buildPivotGeneric, [data, tipoApuracao, periodoFechado])
```

Benefícios:
- `debitosData` e `isencoesData` não recalculam quando `periodoFechado` muda (dependem só de `vlr_efd`)
- Cada tabela tem dependências mínimas e precisas
- Eliminação total de `any` — todos os retornos tipados

### Resumo de arquivos

| Arquivo | Ação | Linhas estimadas |
|---|---|---|
| `src/types/pisCofins.ts` | Expandir (merge tipos) | ~80 |
| `src/lib/apuracaoPisCofins.ts` | Criar (motor de cálculo) | ~220 |
| `src/lib/pisCofinsFilters.ts` | Expandir (novos predicados + pivot genérico) | ~40 adicionais |
| `src/hooks/usePisCofinsApuracao.ts` | Ajuste mínimo de tipagem | ~5 linhas |
| `src/hooks/usePisCofinsCalculator.ts` | Criar (orquestrador de estado) | ~90 |

Nenhuma alteração em `ApuracaoPisCofins.tsx` (Fase 2 do usuário). Nenhuma fórmula ou lógica de negócio alterada.

