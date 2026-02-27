
# Adicionar novos campos na aba OS (front-end only)

## Objetivo

Implementar os campos e secoes que constam no HTML de referencia mas ainda nao existem no codigo, mantendo tudo apenas no front-end (sem alteracoes de banco de dados). Os dados ficarao no state local do formulario para validacao visual.

## Arquivo alterado

- `src/components/equipe/dev/NewClientModal.tsx`

## Novos campos e secoes

### 1. Situacao do Projeto (Select)

Opcoes: "Em andamento", "Concluido", "Suspenso", "Cancelado"

### 2. Observacoes do Projeto (Textarea)

Campo de texto livre para observacoes. Secao com titulo "OBSERVACOES" e placeholder "Insira observacoes relevantes sobre o projeto...".

### 3. Servicos Contratados (lista dinamica)

- Secao com borda tracejada e titulo "SERVICOS CONTRATADOS"
- Botao "+ Adicionar Servico"
- Cada linha: Select com opcoes do `catalog_clients` (busca do banco) + botao remover (X)
- Dados ficam no state local do draft como array de strings (IDs)

### 4. Distribuicao de Receita - Centros de Custo (lista dinamica)

- Secao com borda tracejada e titulo "DISTRIBUICAO DE RECEITA (CENTROS DE CUSTO)"
- Botao "+ Adicionar Centro de Custo"
- Cada linha: Select com opcoes de `EMPRESA_FATURAMENTO_OPTIONS` + Input de percentual + botao remover (X)
- Indicador de total distribuido: "Total Distribuido: XX% - Faltam YY% para completar 100%"
- Dados ficam no state local como array de objetos `{ empresa: string, percentual: number }`

## Mudancas tecnicas

### Interface DraftContract (linha 144)

Adicionar campos:

```typescript
interface DraftContract {
  // ... existentes ...
  situacao_projeto: string;
  observacoes_projeto: string;
  servicos_contratados: string[];
  centros_custo: Array<{ empresa: string; percentual: number }>;
}
```

### State draftContract (linha 503)

Adicionar valores iniciais:

```typescript
situacao_projeto: "em_andamento",
observacoes_projeto: "",
servicos_contratados: [],
centros_custo: [],
```

### Constante SITUACAO_PROJETO_OPTIONS

```typescript
const SITUACAO_PROJETO_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
  { value: "cancelado", label: "Cancelado" },
];
```

### Query catalog_clients

Adicionar um `useQuery` para buscar servicos do `catalog_clients` (tabela ja existente):

```typescript
const { data: catalogServices } = useQuery({
  queryKey: ["catalog_clients_services"],
  queryFn: async () => {
    const { data } = await supabase
      .from("catalog_clients")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    return data || [];
  },
});
```

### Formulario "Nova OS" (apos linha 3246)

Inserir apos o campo Valor:

1. **Situacao do Projeto** - Select no grid 2 colunas ao lado do Valor
2. **Observacoes** - Textarea full width com titulo de secao
3. **Servicos Contratados** - Secao dashed com lista dinamica
4. **Distribuicao de Receita** - Secao dashed com lista + barra de progresso

### Inline Edit da OS (apos linha 3043)

Adicionar os mesmos 4 campos/secoes no modo de edicao inline.

### Card Read-only da OS (apos linha 2876)

Exibir:
- Situacao do Projeto como FieldPair
- Observacoes como FieldPair (col-span full)
- Lista de servicos contratados (nomes)
- Lista de centros de custo com percentuais

### Funcao addContract e reset (linhas 859-910)

Adicionar validacao e reset dos novos campos. Nao exigir 100% nos centros de custo por enquanto (apenas visual).

## Layout dos novos campos na Nova OS

```text
(campos existentes no grid 2 colunas)

VALOR DO PROJETO (R$) *     SITUACAO DO PROJETO *
[currency]                  [select]

REEMBOLSO POR KM (R$)       REEMBOLSO REFEICAO (R$)
[currency]                   [currency]

--- OBSERVACOES ---
[textarea full width]

--- SERVICOS CONTRATADOS ---
[+ Adicionar Servico]
| [Select servico]  [X] |
| [Select servico]  [X] |

--- DISTRIBUICAO DE RECEITA (CENTROS DE CUSTO) ---
[+ Adicionar Centro de Custo]
| [Select empresa] [input %] [X] |
| [Select empresa] [input %] [X] |
Total Distribuido: 70% - Faltam 30% para completar 100%
```

## Resumo de impacto

- **Banco de dados**: Nenhuma alteracao
- **State local**: 4 novos campos no DraftContract
- **UI**: Novos campos no formulario, inline edit e card read-only da OS
- **Persistencia**: Os novos campos serao ignorados no `handleSave` ate que as tabelas sejam criadas
