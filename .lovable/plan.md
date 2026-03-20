

## Plano: Fase 1 — Página Apuração PIS/COFINS

### 1. Menu lateral (DevLayout.tsx)

Adicionar novo agrupador collapsible "Análise PIS/COFINS" no sidebar, idêntico ao padrão "Consulta SPED":

- Novo array `pisCofinsSubItems` com um item inicial: `{ icon: FileText, label: 'Apuração', path: '/equipe/dev/apuracao-pis-cofins' }`
- Novo state `pisCofinsOpen` com lógica de auto-abertura igual a `spedOpen`
- Ícone do agrupador: `Calculator` (já importado)
- Posicionar **após** o bloco Consulta SPED e **antes** de `navItemsAfterSped`

### 2. Rota (App.tsx)

```
import ApuracaoPisCofins from "./pages/equipe/dev/ApuracaoPisCofins";
// Route:
<Route path="/equipe/dev/apuracao-pis-cofins" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/apuracao-pis-cofins"><ApuracaoPisCofins /></PageAccessGate></TeamRoute>} />
```

### 3. Tipagem (src/types/pisCofins.ts)

```typescript
export interface PisCofinsItemCredito {
  cst_pis: string;
  aliq_pis: number;
  cod_cta: string;
  descricao_conta: string;
  bloco_efd: string;
  vlr_efd: number;
  credito: number;
  debito: number;
  saldo_periodo: number;
  saldo_atual: number;
}

export interface PisCofinsRateioReceitas {
  rec_bru_cum: number;
  ncum_exp: number;
  ncum_trib_mi: number;
  ncum_nt_mi: number;
  faturamento_bruto: number;
}

export interface PisCofsinPeriodo {
  dt_ini: string;           // "2024-01-01"
  itens_credito: PisCofinsItemCredito[];
  rateio_receitas: PisCofinsRateioReceitas | null;
}

export interface PisCofinsApuracaoResponse {
  periodos: PisCofsinPeriodo[];
}

// Linha achatada para a tabela
export interface PisCofinsRow extends PisCofinsItemCredito {
  periodo: string;          // "01/2024" (derivado de dt_ini)
  dt_ini: string;
  rateio_receitas: PisCofinsRateioReceitas | null;
}
```

### 4. Hook de dados (src/hooks/usePisCofinsApuracao.ts)

- Seguir padrão de `useEFDData.ts`: usa `useApiAuth` + `useQuery`
- Endpoint: `getApiUrl('/api/v1/pis_cofins/apuracao')` com query params `cnpj`, `data_inicio`, `data_fim`
- Recebe `cnpj`, `dataInicio`, `dataFim`, `enabled`
- Retorna `useQuery` com `queryKey: ['pis-cofins-apuracao', cnpj, dataInicio, dataFim]`

### 5. Página (src/pages/equipe/dev/ApuracaoPisCofins.tsx)

**Layout**: `<DevLayout title="Apuração PIS/COFINS" subtitle="Visão unificada de apuração e cruzamento de dados EFD">`.

**Filtros** (padrão do projeto — Select/MonthYearPicker, não inputs HTML):
- Cliente (`Select` com dados de `useClientesList`)
- Contribuinte (`Select` com dados de `useContribuintesByCliente`)
- Data início e Data fim (`MonthYearPicker` — mesmo componente usado em ConsultaEFD)
- Validação: se uma data informada, outra obrigatória; fim ≥ início
- Botão "Consultar" (teal-600, ícone `Search`)

**Transformação flatten**: `useMemo` que itera `periodos`, para cada período extrai `dt_ini` → formata como "MM/YYYY", e espalha cada `item_credito` com `periodo` e `rateio_receitas` do período-pai, resultando em `PisCofinsRow[]`.

**Data Grid**:
- Componente `Table` do shadcn/ui (como usado em ConsultaEFD)
- Colunas: Período, CST, Alíq %, CTA, Descrição Conta, Bloco EFD, VLR EFD, Crédito, Débito, Saldo Per., Saldo Atual, Ações
- `sticky top-0` no `thead`
- Valores numéricos: `tabular-nums text-right`, formatados com `toLocaleString('pt-BR')`
- Saldos negativos: `text-red-600`
- Coluna Ações: `Button` ghost com ícone `PieChart` (lucide) — placeholder para Fase 2 (rateio)

**Estética DESIGN.md**:
- Filtros em card `bg-slate-50 rounded-xl` (surface-container-low equivalente no projeto)
- Tabela em card `bg-white rounded-xl shadow-sm`
- Header da tabela: `bg-slate-100` com labels `text-xs font-semibold uppercase tracking-wider text-slate-500`
- Hover nas rows: `hover:bg-slate-50`
- Sem bordas 1px entre seções (No-Line Rule) — usar espaçamento
- Labels com `text-xs uppercase tracking-wider text-slate-500`

### 6. Componentes reutilizados

| Componente | Uso |
|---|---|
| `DevLayout` | Shell da página |
| `Select` (shadcn) | Filtros cliente/contribuinte |
| `MonthYearPicker` | Filtros de data |
| `Table` (shadcn) | Grid de dados |
| `Button` (shadcn) | Consultar + ações |
| `Skeleton` | Loading state |
| `RequiredMark` | Asterisco em campos obrigatórios |
| `useClientesList` / `useContribuintesByCliente` | Dados de filtros (hooks existentes) |

### Arquivos criados/editados

| Arquivo | Ação |
|---|---|
| `src/types/pisCofins.ts` | Criar — tipos da API e row achatada |
| `src/hooks/usePisCofinsApuracao.ts` | Criar — hook de fetch com auth |
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Criar — página completa |
| `src/components/equipe/dev/DevLayout.tsx` | Editar — adicionar agrupador "Análise PIS/COFINS" |
| `src/App.tsx` | Editar — adicionar import + rota |

