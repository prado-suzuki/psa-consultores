

# Redesign da aba OS no NewClientModal

## Contexto

A aba "OS - Ordem de Servico" no NewClientModal atualmente usa um layout de label horizontal (label a esquerda, campo a direita). O objetivo e adaptar para o design de referencia fornecido: grid de 2 colunas com labels acima dos campos (uppercase), alem de adicionar 3 novos elementos.

**Nota importante**: Os dados de OS atualmente NAO sao persistidos no banco (linha 925: `console.log('[OS] Dados locais...')`). As mudancas serao exclusivamente no frontend/UI.

## Mudancas planejadas

### 1. Novo layout visual (grid 2 colunas)

Substituir o layout atual (`flex-row items-center gap-4` com `Label w-48`) por um grid de 2 colunas (`grid grid-cols-2 gap-6`) com labels acima dos campos:

```text
Antes:                          Depois:
[Label w-48] [Input]            LABEL *
[Label w-48] [Input]            [Input]          [Input]
                                LABEL             LABEL
```

- Labels: `uppercase text-xs font-semibold text-muted-foreground mb-1.5`
- Campos obrigatorios com `<span class="text-red-500">*</span>`
- Campos de valor com prefixo "R$" visual
- Observacoes (textarea) ocupa largura total (col-span-2)

### 2. Novo campo: Situacao do Projeto

Adicionar um Select com opcoes:
- Em andamento (default)
- Concluido
- Suspenso
- Cancelado

Adicionar `situacao_projeto` a interface `DraftContract` e ao estado `draftContract`.

### 3. Nova secao: Servicos Contratados

Abaixo dos dados da OS, adicionar secao com borda tracejada (`border-dashed`) contendo:
- Titulo "SERVICOS CONTRATADOS" + botao "+ Adicionar Servico"
- Lista de servicos adicionados, cada um com Select (usando `catalog_clients` como catalogo de opcoes) e botao de remover (icone lixeira)

Estado local: array `draftServices` como `{ _id: number; catalog_client_id: string }[]` dentro de cada DraftContract.

### 4. Nova secao: Distribuicao de Receita (Centros de Custo)

Secao com borda tracejada contendo:
- Titulo "DISTRIBUICAO DE RECEITA (CENTROS DE CUSTO)" + botao "+ Adicionar Centro de Custo"
- Lista com Select de centro de custo + campo de % numerico + botao remover
- Barra de validacao mostrando total distribuido e faltante (vermelho se != 100%)

Estado local: array `draftCostCenters` como `{ _id: number; name: string; percent: number }[]` dentro de cada DraftContract.

Opcoes de centro de custo: lista fixa inicial (Administrativo/Matriz, Comercial, Operacional) que pode ser expandida depois.

## Detalhes tecnicos

### Arquivo alterado
- `src/components/equipe/dev/NewClientModal.tsx`

### Alteracoes na interface DraftContract (linha 119)

Adicionar campos:
```typescript
situacao_projeto: string;        // 'em_andamento' | 'concluido' | 'suspenso' | 'cancelado'
servicos: { _id: number; catalog_client_id: string }[];
centros_custo: { _id: number; name: string; percent: number }[];
```

### Alteracoes no estado draftContract (linha 442)

Adicionar valores default:
```typescript
situacao_projeto: 'em_andamento',
servicos: [],
centros_custo: [],
```

### Query para carregar opcoes de servicos

Usar `catalog_clients` (ja usado em outros modulos) para popular o Select de servicos:
```typescript
const { data: catalogClients } = await supabase
  .from('catalog_clients')
  .select('id, name')
  .eq('is_active', true)
  .order('name');
```

### Layout do formulario "Nova OS" (linhas 2050-2148)

Substituir todo o bloco de campos por:

```text
+------------------------------------------+
| DADOS DA OS                              |
|------------------------------------------|
| ORDEM DE SERVICO *  | DATA DE EMISSAO *  |
| [input]             | [date]             |
| DATA INICIO *       | DATA FIM           |
| [date]              | [date]             |
| VALOR DO PROJETO *  | SITUACAO DO PROJ * |
| [R$ currency]       | [select]           |
| REEMBOLSO POR KM    | REEMBOLSO REFEICAO |
| [R$ currency]       | [R$ currency]      |
| OBSERVACOES                              |
| [textarea full width]                    |
+------------------------------------------+
| SERVICOS CONTRATADOS    [+ Adicionar]    |
| [select servico]              [trash]    |
+------------------------------------------+
| CENTROS DE CUSTO        [+ Adicionar]    |
| [select centro] [input %]    [trash]     |
| Total: 70% - Faltam 30%                 |
+------------------------------------------+
|                    [Adicionar OS a Lista] |
+------------------------------------------+
```

### Layout do card expandido (read-only, linhas 1900-1936)

Atualizar o FieldPair grid para incluir os novos campos (Situacao, Servicos, Centros de Custo).

### Layout do card em edicao (linhas 1939-2043)

Aplicar o mesmo grid 2 colunas com os novos campos.

### Validacao no addContract (linha 692)

Nenhuma validacao adicional obrigatoria para servicos/centros de custo (sao opcionais). Porem, se centros de custo forem preenchidos, alertar se o total != 100%.

### Reset (linha 958)

Incluir os novos campos no reset do draftContract.

## Resumo de impacto

| O que | Onde |
|---|---|
| Interface DraftContract + novos campos | Linha 119 |
| Estado draftContract default | Linhas 442, 708, 961 |
| Query catalog_clients para servicos | Novo useQuery |
| Layout "Nova OS" (grid 2 colunas) | Linhas 2050-2148 |
| Layout card expandido (read-only) | Linhas 1900-1936 |
| Layout card em edicao | Linhas 1939-2043 |
| Validacao addContract | Linha 692 |

