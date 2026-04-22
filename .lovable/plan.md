

## Plano: Padronização de Tooltips e Marca de Obrigatoriedade — Levantamento PIS/COFINS

Aplicar o padrão visual e textual de `ConsultaXMLs.tsx` (`FieldTooltip` com `<Info>` + `<RequiredMark />` no label) em todas as 4 ferramentas do grupo Levantamento PIS/COFINS, eliminando os helpers despadronizados (`HelpCircle`) e os `<Info>` soltos.

### 1. Padrão único (referência)

```tsx
<label className="flex items-center gap-1.5 ...">
  Cliente <RequiredMark />
  <FieldTooltip text={TOOLTIPS.cliente} />
</label>
```

- `FieldTooltip` recebe **apenas `text`** e renderiza só o ícone `<Info className="h-3.5 w-3.5">`.
- `<RequiredMark />` aparece sempre que o filtro é obrigatório para a consulta.
- Texto do tooltip do filtro obrigatório **deve incluir "Obrigatório."** ao final.

### 2. Refatorar helpers compartilhados para o padrão `ConsultaXMLs`

**`src/components/equipe/dev/auditoria/tooltipHelpers.tsx`** e **`src/components/equipe/dev/correcoes-sped/tooltipHelpers.tsx`**:

- Trocar a assinatura de `FieldTooltip({ children, text })` (com `HelpCircle` + botão) para `FieldTooltip({ text })` (apenas `<Info>`), idêntica ao `ConsultaXMLs`.
- Manter a portalização do tooltip (`TooltipPrimitive.Portal` + `z-[100]`) — isso é benéfico e não conflita com o padrão visual.
- Atualizar os textos dos filtros principais para incluir "Obrigatório." onde aplicável (ver §4–§6).

### 3. `MapaNCMPisCofins.tsx` (já alinhado)

Sem mudanças estruturais — o `FieldTooltip` local já segue o padrão. Apenas:
- Confirmar que nenhum filtro (Buscar, Setor, Permite Crédito) é obrigatório → sem `<RequiredMark />`. Manter como está.

### 4. `ApuracaoPisCofins.tsx`

- **Adicionar `<RequiredMark />` em Data Início e Data Fim** (os dois são exigidos juntos pela validação em `handleSearch`, sem eles a query não retorna o período correto).
- Atualizar tooltips: `dataInicio` e `dataFim` → adicionar **"Obrigatório."** ao final.
- Demais filtros (Cliente ✅, Contribuinte ✅) já estão corretos — manter.
- "Tipo de análise" e "Período Fechado" continuam opcionais — sem `RequiredMark`.

### 5. `AuditoriaCruzada.tsx`

- Adaptar uso para a nova assinatura: o `<Label>` passa a conter texto + `<RequiredMark />` + `<FieldTooltip text={...} />` em vez de `FieldTooltip>{children}</FieldTooltip>`.
- **Adicionar `<RequiredMark />` em Cliente, Contribuinte, Data Início e Data Fim** (os 4 são obrigatórios — `handleConsultar` só faz sentido quando todos preenchidos; queries têm `enabled` baseado em `id_contribuinte`+`dt_ini`+`dt_fim`).
- Atualizar `AUDITORIA_TOOLTIPS` (cliente, contribuinte, dataInicio, dataFim) → adicionar **"Obrigatório."** ao final.
- Manter os tooltips internos das abas (`contaContabil`, `periodoFechado`, `chaveNfe`, `cfopIntervalo`) — não obrigatórios.

### 6. `CorrecoesSped.tsx`

- Adaptar uso para a nova assinatura (texto + `<RequiredMark />` + `<FieldTooltip text={...} />`).
- **Adicionar `<RequiredMark />` em Cliente, Contribuinte, Data Início e Data Fim** (todos exigidos por `canConsult`).
- Atualizar `SPED_TOOLTIPS.cliente/contribuinte/dataInicio/dataFim` → adicionar **"Obrigatório."** ao final.
- Filtro **NCM**: substituir o `<Info>` solto inline por `<FieldTooltip text={...} />` (texto preservado: "Filtra os itens da tabela cruzando a informação com o NCM vinculado ao produto no Registro 0200 do SPED."). Não obrigatório.
- Filtros condicionais da aba **F100** (Nat. Base de Crédito, Cód. Conta):
  - Substituir os `<Info>` soltos por `<FieldTooltip text={...} />`.
  - Adicionar `<RequiredMark />` em **ambos** quando `activeTab === 'f100'`, com texto do tooltip indicando: **"Obrigatório informar este campo OU Cód. Conta para consultar F100."** (e o complementar inverso). A regra `(natBcCreds.length > 0 || !!codCta)` já existe em `f100FiltersValid` — apenas refletir visualmente.
- Filtro **Buscar por descrição/chave/NCM** (search livre): adicionar `<FieldTooltip text={SPED_TOOLTIPS.buscar} />` (já existe no dicionário, hoje sem ícone). Não obrigatório.

### 7. Cuidados aplicados

- **Nenhum tooltip existente é removido** — apenas o ícone visual é uniformizado e o texto enriquecido com "Obrigatório." onde faltava.
- **Filtros de coluna das tabelas** (`ColumnFilterDropdown`) **não são tocados** — o trabalho aqui é só nos filtros principais do Card.
- **Componente compartilhado**: a mudança de assinatura do `FieldTooltip` em `auditoria/tooltipHelpers.tsx` e `correcoes-sped/tooltipHelpers.tsx` é **breaking** apenas para os call-sites das próprias páginas/abas — todos os usos serão atualizados nesta mesma tarefa (são exclusivos desses módulos).
- **Abas internas das ferramentas** (BalanceteEfdTab, EfdcIcmsTab, EfdcXmlTab, TabC170…F130): seus usos atuais de `FieldTooltip>{children}</FieldTooltip>` serão atualizados para o novo padrão (`<Label>{texto}<FieldTooltip text={...} /></Label>`). Sem alteração de comportamento.
- **Texto sem ambiguidade**: novas frases curtas e diretas — ex.: `"Cliente cuja base SPED será revisada. Obrigatório."`.

### 8. Arquivos alterados

1. `src/components/equipe/dev/auditoria/tooltipHelpers.tsx` — refatorar `FieldTooltip` para `({ text })` + atualizar textos com "Obrigatório.".
2. `src/components/equipe/dev/correcoes-sped/tooltipHelpers.tsx` — idem + adicionar entradas para NCM, F100 NatBcCred e F100 CodCta.
3. `src/pages/equipe/dev/ApuracaoPisCofins.tsx` — `RequiredMark` em Data Início/Fim + ajuste de textos.
4. `src/pages/equipe/dev/AuditoriaCruzada.tsx` — `RequiredMark` nos 4 filtros + nova assinatura do `FieldTooltip`.
5. `src/pages/equipe/dev/CorrecoesSped.tsx` — `RequiredMark` nos 4 filtros principais + F100 (NatBcCred/CodCta) + nova assinatura + remover `<Info>` soltos.
6. `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx` — atualizar call-sites de `FieldTooltip` (filtros internos: Conta Contábil, Período Fechado).
7. `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx` — idem (Chave NFe).
8. `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx` — idem (CFOP/Intervalo).
9. `src/components/equipe/dev/correcoes-sped/TabC170…TabF130.tsx` (6 abas) — só se houver chamada a `FieldTooltip>{children}</FieldTooltip>` em cabeçalhos/grupos; usos via `renderColumnLabel` permanecem inalterados.

Sem mudanças de banco, hooks, rotas, lógica de filtros/ordenação/queries ou de qualquer componente compartilhado fora do escopo acima.

