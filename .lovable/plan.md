

## Plano: Multi-select de contas na aba Resumo

### Objetivo
Adicionar um componente de seleção múltipla acima da tabela "Resumo Geral" para filtrar por contas (`cod_cta`). As contas selecionadas aparecem como tags com botão de remoção individual e botão de limpar tudo.

### Alterações

**1. Criar componente `MultiSelectContas.tsx`** (`src/components/equipe/dev/pis-cofins/`)

Componente reutilizável com:
- `Popover` + `Command` (shadcn) como dropdown de busca/seleção
- Lista de contas disponíveis com checkbox visual
- Tags/badges dentro do trigger mostrando `cod_cta - descricao_conta` (truncado)
- Ícone `X` em cada tag para remover individualmente
- Botão "Limpar" para resetar todas as seleções
- Props: `options: {value: string, label: string}[]`, `selected: string[]`, `onChange: (selected: string[]) => void`, `placeholder?: string`

**2. Alterar `ApuracaoPisCofins.tsx`**

- Novo estado: `const [selectedContas, setSelectedContas] = useState<string[]>([])`
- Derivar lista de contas únicas de `tables.resumoData` via `useMemo`: `{ value: cod_cta, label: "${cod_cta} - ${descricao_conta}" }`
- Filtrar `tables.resumoData` por `selectedContas` (se vazio, mostrar tudo)
- Renderizar `<MultiSelectContas>` acima do `<ApuracaoDataTable>` na aba Resumo
- Resetar `selectedContas` ao limpar/trocar consulta

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/pis-cofins/MultiSelectContas.tsx` | Novo componente multi-select com tags |
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Estado, derivação de opções, filtro e renderização |

