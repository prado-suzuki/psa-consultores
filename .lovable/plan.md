

## Plano: Adicionar Tooltips ao Mapa NCM

Aplicar em `src/pages/equipe/dev/MapaNCMPisCofins.tsx` o mesmo padrão de tooltips usado em `ConsultaXMLs.tsx` (helpers `FieldTooltip`, `ColumnTooltip`, `ButtonTooltip` + objeto `TOOLTIPS`).

### 1. Imports a adicionar

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
```

### 2. Helpers de tooltip (no topo do arquivo)

Replicar os 3 componentes utilitários já consagrados:

- **`FieldTooltip`** — ícone `Info` ao lado de labels de filtros.
- **`ColumnTooltip`** — texto sublinhado pontilhado nos cabeçalhos de tabela.
- **`ButtonTooltip`** — wrapper para botões de ação.

### 3. Objeto `TOOLTIPS` centralizado

```ts
const TOOLTIPS = {
  // Filtros
  buscar: "Busca livre por NCM, descrição CST, base legal ou setor.",
  setor: "Filtra as regras pelo segmento de negócio (setor do contribuinte).",
  credito: "Filtra regras pelo direito a crédito de PIS/COFINS (Sim/Não).",

  // Ações
  limpar: "Redefine todos os filtros aplicados.",
  novaRegra: "Cria uma nova regra fiscal de PIS/COFINS para um NCM.",

  // Colunas da tabela
  colNcm: "Código NCM (Nomenclatura Comum do Mercosul) ao qual a regra se aplica.",
  colSetor: "Segmento de negócio para o qual a regra é válida.",
  colCst: "Código de Situação Tributária aplicado às operações de PIS/COFINS.",
  colDescCst: "Descrição textual do CST e do tratamento tributário aplicado.",
  colBaseLegal: "Fundamentação normativa (lei, IN, ADI) que sustenta o tratamento.",
  colCredito: "Indica se a operação permite apropriação de crédito de PIS/COFINS.",
  colAcoes: "Visualizar, editar ou excluir a regra.",
} as const;
```

### 4. Aplicar nos labels dos filtros

Adicionar `<FieldTooltip text={TOOLTIPS.x} />` ao lado de cada label no card de filtros:

- Label **Buscar** → `TOOLTIPS.buscar`
- Label **Setor** → `TOOLTIPS.setor`
- Label **Permite Crédito** → `TOOLTIPS.credito`

### 5. Aplicar nos botões de ação

Envolver com `ButtonTooltip`:

- **Limpar Filtros** → `TOOLTIPS.limpar`
- **Nova Regra** → `TOOLTIPS.novaRegra`
- Botões da coluna Ações da tabela (**Visualizar** / **Excluir**) → tooltips curtos diretos ("Visualizar regra", "Excluir regra").

### 6. Aplicar nos cabeçalhos da tabela

Substituir o texto plano de cada `<TableHead>` por `<ColumnTooltip label="..." text={TOOLTIPS.x} />`, mantendo o `ColumnFilterDropdown` ao lado:

```tsx
<TableHead>
  <ColumnTooltip label="NCM" text={TOOLTIPS.colNcm} />
  <ColumnFilterDropdown ... />
</TableHead>
```

Aplicar para: **NCM**, **Setor**, **CST PIS/COFINS**, **Descrição CST**, **Base Legal**, **Crédito**, **Ações**.

### 7. Wrapper `<TooltipProvider>`

Envolver todo o conteúdo retornado pelo componente em `<TooltipProvider delayDuration={200}>` (logo dentro do `<DevLayout>`), seguindo o mesmo padrão de `ConsultaXMLs.tsx`.

### Resultado

A ferramenta passa a oferecer ajuda contextual consistente com as demais (Consulta XMLs, Controle PERDCOMP): ícones `Info` nos filtros, cabeçalhos sublinhados pontilhado nas colunas e tooltips em todos os botões de ação.

### Arquivos alterados

- `src/pages/equipe/dev/MapaNCMPisCofins.tsx` (único arquivo)

Sem mudanças de banco, hooks ou rotas.

