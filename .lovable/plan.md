

## Plano: Visão Geral + Tooltips em Auditoria Cruzada

Aplicar em `src/pages/equipe/dev/AuditoriaCruzada.tsx` e nas três abas (`BalanceteEfdTab`, `EfdcIcmsTab`, `EfdcXmlTab`) o mesmo padrão já usado em `ApuracaoPisCofins.tsx` / `ControlePerdcomp.tsx` — reaproveitando `DevPageHeader`, `FieldTooltip` e o helper compartilhado `ColumnTooltip` (que já é portalizado, garantindo que o card não seja cortado por colunas vizinhas).

### 1. Visão Geral (`AuditoriaCruzada.tsx`)

- Adicionar `<DevPageHeader description="..." />` logo dentro do `<DevLayout>` (acima do Card de filtros).
- **Sem o trecho "Para acessar o manual..."** → estender `DevPageHeader` com nova prop opcional `hideManualLink?: boolean` (default `false`) que, quando `true`, omite a frase e o link `aqui`. Isto preserva todos os outros usos.
- Texto da descrição:
  > "A ferramenta **Análise Cruzada** realiza a reconciliação fiscal cruzando dados de **Balancete x EFD Contribuições**, **EFD ICMS x EFD Contribuições x XML de NFe** e **XMLs de CT-e por lote**. Use os filtros para selecionar cliente, contribuinte e período, e navegue pelas abas para identificar divergências entre as fontes."
- Envolver o conteúdo em `<TooltipProvider delayDuration={300}>`.

### 2. `DevPageHeader` — extensão backward-compatible

Adicionar prop `hideManualLink?: boolean`. Quando `true`, não renderiza o sufixo `" Para acessar o manual..."`. Demais páginas seguem inalteradas.

### 3. Tooltips dos filtros principais (página `AuditoriaCruzada.tsx`)

Adicionar `FieldTooltip` (helper local, idêntico ao de `ApuracaoPisCofins.tsx`) em cada label do Card de filtros:

```ts
const TOOLTIPS = {
  cliente: "Cliente cuja base fiscal será analisada.",
  contribuinte: "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente.",
  dataInicio: "Data inicial do período a ser cruzado entre as fontes (Balancete, EFD, XML).",
  dataFim: "Data final do período a ser cruzado entre as fontes (Balancete, EFD, XML).",
};
```

Aplicar nos quatro labels existentes (Cliente, Contribuinte, Data Início, Data Fim).

### 4. Tooltips dos filtros internos das abas

Em cada aba, adicionar `FieldTooltip` (mesmo helper local, importado de um pequeno utilitário compartilhado novo: `src/components/equipe/dev/auditoria/tooltipHelpers.tsx` para evitar duplicação) ao lado dos labels:

- **BalanceteEfdTab**: "Conta Contábil" → `"Filtra a árvore de contas pelo código ou descrição."`; "Período Fechado" → `"Quando ativo, mostra apenas o saldo do último mês acumulado."`.
- **EfdcIcmsTab**: "Chave NFe" → `"Filtra os documentos pela chave de acesso da NFe (44 dígitos)."`.
- **EfdcXmlTab**: "CFOP / Intervalo" → `"Filtra os lotes pelo CFOP ou pelo intervalo de numeração informado."`.

### 5. Tooltips em TODAS as colunas das tabelas principais (3 abas)

Reutilizar o helper compartilhado `renderColumnLabel(label, text)` de `src/components/equipe/dev/pis-cofins/ColumnTooltip.tsx` — já portalizado (`TooltipPrimitive.Portal`, `z-[100]`, `collisionPadding={12}`), portanto **não corta** o card e **não interfere** nos `ColumnFilterDropdown` (que continuam ao lado do label).

#### 5.1 `BalanceteEfdTab` → `BalanceteTreeTable`

Já aceita `columnTooltips?: Record<string, string>`. Passar mapa:

```ts
{
  Conta: "Código contábil da conta no plano de contas do cliente.",
  "Descrição": "Descrição da conta contábil.",
  __total__: "Soma de todos os meses exibidos no período consultado.",
  __year__: "Total do ano. Clique no '+' para expandir e ver os meses.",
  __month__: "Valor total do mês.",
  // gerar também as chaves YYYY-MM e YYYY a partir de `periodos`
}
```

A geração dos meses/anos é feita inline na aba (mesmo padrão de `buildColumnTooltips` em `ApuracaoPisCofins.tsx`).

#### 5.2 `EfdcIcmsTab` — tabela inline

Substituir cada label de `<TableHead>` por `renderColumnLabel(label, tooltip)` (mantendo `ColumnFilterDropdown` ao lado, pois ele renderiza após a label):

| Coluna | Tooltip |
|---|---|
| Dt. Ini | "Data inicial do período da escrituração." |
| Chave NFe | "Chave de acesso da NFe (44 dígitos)." |
| EFD ICMS (cabeçalho de grupo) | "Dados extraídos da EFD ICMS/IPI." |
| EFD Contribuições (grupo) | "Dados extraídos da EFD Contribuições." |
| XML (grupo) | "Dados extraídos do XML original da NFe." |
| CFOP (×3) | "Código Fiscal de Operações e Prestações." |
| Conta Contábil (×2) | "Conta contábil vinculada ao item." |
| Valor Doc (×3) | "Valor total do documento fiscal." |

#### 5.3 `EfdcXmlTab` — tabela inline e modal

Tabela principal:

| Coluna | Tooltip |
|---|---|
| Data Início | "Data inicial do período do lote." |
| Data Lote | "Data de emissão/processamento do lote." |
| Emitente | "Razão social do emitente do lote de CT-es." |
| CFOP | "Código Fiscal de Operações e Prestações." |
| Série | "Série dos documentos do lote." |
| Cód. Sit. | "Código de situação dos documentos." |
| Intervalo | "Intervalo de numeração dos CT-es do lote." |
| Valor Lote | "Valor total declarado do lote na EFD." |
| Soma CT-es | "Somatório dos valores dos CT-es individuais." |
| Diferença | "Diferença entre Valor Lote e Soma CT-es. Vermelho indica divergência > R$ 0,05." |

Modal (CT-es):

| Coluna | Tooltip |
|---|---|
| Chave CT-e | "Chave de acesso do CT-e (44 dígitos)." |
| Número | "Número do CT-e." |
| Valor | "Valor do CT-e." |

### Cuidados aplicados

- **Filtros de coluna preservados**: `renderColumnLabel` envolve apenas o texto da label; o `<ColumnFilterDropdown>` continua sendo renderizado como irmão dentro do mesmo `<TableHead>`, exatamente como hoje.
- **Card do tooltip não corta**: `ColumnTooltip` já usa `TooltipPrimitive.Portal` + `z-[100]` (correção feita anteriormente), funcionando dentro de `overflow-auto`.
- **Texto natural nos meses**: usa `"Valor total do mês."` (mesmo padrão já adotado), evitando frase estranha "(mês/ano) selecionada".
- **Tooltips existentes preservados**: nenhum tooltip atual é removido; apenas adições.
- **Visão Geral sem manual**: nova prop `hideManualLink` no `DevPageHeader` mantém compatibilidade com as demais páginas.

### Arquivos alterados

1. `src/components/equipe/dev/DevPageHeader.tsx` — adicionar prop `hideManualLink?: boolean`.
2. `src/pages/equipe/dev/AuditoriaCruzada.tsx` — `TooltipProvider` + `DevPageHeader` (sem manual) + `FieldTooltip` nos 4 filtros.
3. `src/components/equipe/dev/auditoria/tooltipHelpers.tsx` — **novo** arquivo com `FieldTooltip` e tabela `AUDITORIA_TOOLTIPS` reaproveitada pelas três abas.
4. `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx` — `FieldTooltip` nos labels + `columnTooltips` passado ao `BalanceteTreeTable` (incluindo geração dinâmica de meses/anos).
5. `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx` — `FieldTooltip` no filtro + `renderColumnLabel` em todos os `<TableHead>` da tabela.
6. `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx` — `FieldTooltip` no filtro + `renderColumnLabel` na tabela principal e na do modal.

Sem mudanças de banco, hooks, rotas ou de qualquer outro componente compartilhado.

