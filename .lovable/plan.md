

## Plano: Visão Geral + Tooltips em Correções no SPED

Aplicar em `src/pages/equipe/dev/CorrecoesSped.tsx` e nas seis abas (`TabC170`, `TabA170`, `TabD100`, `TabF100`, `TabF120`, `TabF130`) o mesmo padrão já consolidado em `ApuracaoPisCofins.tsx` e `AuditoriaCruzada.tsx`, reutilizando os helpers compartilhados.

### 1. Visão Geral (sem link de manual)

Adicionar `<DevPageHeader description={...} hideManualLink />` logo dentro do `<DevLayout>`, acima do Card de filtros, e envolver o conteúdo em `<TooltipProvider delayDuration={300}>`.

Texto:
> "A ferramenta **Correções no SPED** permite revisar e ajustar os registros do SPED Contribuições (**C170**, **A170**, **D100**, **F100**, **F120**, **F130**) cruzando dados da escrituração com XMLs originais. Use os filtros para selecionar contribuinte e período, navegue pelas abas e edite as linhas com divergências para gerar correções rastreáveis."

A prop `hideManualLink` já existe no `DevPageHeader` (foi adicionada na implementação anterior).

### 2. Helpers compartilhados — novo arquivo

Criar `src/components/equipe/dev/correcoes-sped/tooltipHelpers.tsx` com:

- **`FieldTooltip`** — mesmo padrão de `auditoria/tooltipHelpers.tsx` (ícone `HelpCircle` + `TooltipPrimitive.Portal` + `z-[100]` + `collisionPadding={12}`). Renderiza ao lado do label.
- **`SPED_TOOLTIPS`** — dicionário com tooltips de filtros principais e colunas das abas (ver §4 e §5).

Esse helper segue exatamente o padrão portalizado já validado, evitando que o card seja cortado por colunas vizinhas/sticky/`overflow-auto`.

### 3. Reutilizar `ColumnTooltip`

Usar `renderColumnLabel(label, text)` de `src/components/equipe/dev/pis-cofins/ColumnTooltip.tsx` (já portalizado) para envolver **apenas o texto** do label dentro de cada `<TableHead>`. Os `<ColumnFilterDropdown>` continuam ao lado, intactos — não há refatoração de filtros.

### 4. Tooltips dos filtros principais (`CorrecoesSped.tsx`)

Adicionar `FieldTooltip` ao lado de cada `<Label>` no Card de filtros:

| Filtro | Tooltip |
|---|---|
| Cliente | "Cliente cuja base SPED será revisada." |
| Contribuinte | "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente." |
| Data Início | "Data inicial do período da escrituração a ser consultada." |
| Data Fim | "Data final do período da escrituração a ser consultada." |
| NCM | **mantido** (tooltip atual já existe no Info icon) — apenas trocar o `Info` solto pelo `FieldTooltip` para padronizar. |
| Nat. Base de Crédito (F100) | **mantido** (tooltip atual preservado). |
| Código da Conta (F100) | **mantido** (tooltip atual preservado). |
| Buscar por descrição… | "Busca textual livre por descrição do item, chave do documento ou NCM." |

Os tooltips existentes nos campos **NCM**, **Nat. Base de Crédito** e **Código da Conta** são preservados (apenas substituindo `<Info>` solto pelo `FieldTooltip` quando fizer sentido para uniformizar o ícone — caso contrário, mantém-se exatamente como está).

### 5. Tooltips em TODAS as colunas das tabelas (6 abas)

Em cada `<TableHead>`, substituir o texto do label por `renderColumnLabel(label, tooltip)`. Os `<ColumnFilterDropdown>` permanecem como irmãos no mesmo `<span>`, **sem alterar nada da lógica de filtros/ordenação**.

#### 5.1 Cabeçalhos de grupo (todas as abas)

| Grupo | Tooltip |
|---|---|
| "Dados EFD" | "Dados extraídos da EFD Contribuições (escrituração original)." |
| "Dados XML" (C170) | **mantido** — tooltip já existe. |
| "Impostos" | "Apuração de PIS/COFINS para o registro: CST, base de cálculo, alíquota e valor." |

#### 5.2 `TabC170` (NFe/NFCe)

| Coluna | Tooltip |
|---|---|
| Descrição (EFD) | "Descrição do item conforme registro C170 ou Registro 0200 quando ausente." |
| NCM (0200) | **mantido**. |
| Valor | "Valor unitário do item (VL_ITEM) no SPED." |
| Descrição (XML) | **mantido**. |
| NCM (XML) | **mantido**. |
| CST PIS / CST COF | "Código de Situação Tributária para PIS/COFINS." |
| % PIS / % COF | "Alíquota aplicada de PIS/COFINS." |
| VL PIS / VL COF | "Valor do tributo apurado." |
| Conta | "Código da conta analítica contábil (Registro 0500)." |

#### 5.3 `TabA170` (NFSe)

| Coluna | Tooltip |
|---|---|
| Prestador | "Razão social do prestador (Registro 0150)." |
| CPF/CNPJ | "Documento do prestador (Registro 0150)." |
| Descrição | "Descrição do serviço (DESCR_COMPL ou Registro 0200)." |
| Valor | "Valor do serviço (VL_ITEM)." |
| Conta | **mantido**. |
| BC PIS / BC COF | "Base de cálculo do PIS/COFINS." |
| CHV NFSe | "Chave de acesso da NFSe quando disponível." |
| (CST/% /VL — mesmos textos da §5.2) |  |

#### 5.4 `TabD100` (CTe)

| Coluna | Tooltip |
|---|---|
| Data | "Data de emissão do documento (DT_DOC)." |
| CHV CTe | "Chave de acesso do CT-e (44 dígitos)." |
| CNPJ | "CNPJ do participante da operação." |
| Simples | **mantido**. |
| Valor Doc | **mantido**. |
| (CST/% /VL — §5.2) |  |

#### 5.5 `TabF100` (Outros)

| Coluna | Tooltip |
|---|---|
| Data | "Data da operação (DT_OPER)." |
| Nome | "Nome do participante." |
| CPF/CNPJ | "Documento do participante." |
| Tipo | "Tipo de pessoa (PF/PJ)." |
| Simples | "Indica se o participante é optante pelo Simples Nacional." |
| Valor | "Valor da operação (VL_OPER)." |
| (CST/% /VL — §5.2) |  |

#### 5.6 `TabF120` (Depreciação) e `TabF130` (Aquisição)

Aplicar o mesmo padrão a todos os `<TableHead>` existentes (Data, Identificador do bem, Valor da depreciação/aquisição, Conta, NAT_BC_CRED, CST/% /VL). Tooltips específicos:

- F120 → "Encargos de depreciação/amortização do ativo imobilizado (Bloco F – Registro F120)."
- F130 → "Crédito sobre aquisição de ativo imobilizado (Bloco F – Registro F130)."
- NAT_BC_CRED (F100/F120/F130) → "Natureza da Base de Crédito conforme Tabela 4.3.7 da EFD Contribuições."

### Cuidados aplicados

- **Filtros de coluna preservados**: `renderColumnLabel` envolve apenas o texto; `<ColumnFilterDropdown>` permanece como irmão dentro do mesmo `<span>` do `<TableHead>` — nenhum handler `onSort`/`onFilter` é tocado.
- **Card do tooltip não corta**: `ColumnTooltip` e `FieldTooltip` usam `TooltipPrimitive.Portal` + `z-[100]` + `collisionPadding={12}`, funcionando dentro do `overflow-auto` de cada tabela.
- **Texto natural**: tooltips diretos e curtos (ex.: "Valor do tributo apurado."), sem frases ambíguas como "(mês/ano) selecionada".
- **Tooltips existentes preservados**: nenhum tooltip atual é removido. Os `<Info>` inline já presentes (NCM, Dados XML, Simples, Valor Doc, Itens XML do modal, etc.) ficam exatamente como estão; apenas adicionamos onde falta.
- **Visão Geral sem manual**: usa a prop `hideManualLink` já existente.
- **Sem refatorar estado**: o `CorrecoesSped` mantém seu state inline (não migra para Context) — fora do escopo desta tarefa de tooltips.

### Arquivos alterados

1. `src/pages/equipe/dev/CorrecoesSped.tsx` — `TooltipProvider` + `DevPageHeader` (sem manual) + `FieldTooltip` nos labels dos filtros principais.
2. `src/components/equipe/dev/correcoes-sped/tooltipHelpers.tsx` — **novo** arquivo com `FieldTooltip` e `SPED_TOOLTIPS`.
3. `src/components/equipe/dev/correcoes-sped/TabC170.tsx` — `renderColumnLabel` em todos os `<TableHead>` da tabela.
4. `src/components/equipe/dev/correcoes-sped/TabA170.tsx` — idem.
5. `src/components/equipe/dev/correcoes-sped/TabD100.tsx` — idem.
6. `src/components/equipe/dev/correcoes-sped/TabF100.tsx` — idem.
7. `src/components/equipe/dev/correcoes-sped/TabF120.tsx` — idem.
8. `src/components/equipe/dev/correcoes-sped/TabF130.tsx` — idem.

Sem mudanças de banco, hooks, rotas, lógica de filtros ou de qualquer outro componente compartilhado.

