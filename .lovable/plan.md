

## Adicionar filtros de Ano, Mes e Responsavel no painel de metricas

### O que sera feito
Adicionar uma barra de filtros no topo do componente `SprintHoursDashboard` com tres filtros:
1. **Ano** - Select com os anos disponiveis nos dados
2. **Mes** - Select com os meses (Jan-Dez), filtrado pelo ano selecionado
3. **Responsavel** - Select com os nomes das pessoas atribuidas

Os filtros serao aplicados antes de calcular KPIs, grafico e tabela resumo, permitindo analisar recortes especificos dos dados.

### Alteracoes no arquivo `src/components/sprint/SprintHoursDashboard.tsx`

#### 1. Novos estados de filtro
- `filterYear: string | null` - ano selecionado (null = todos)
- `filterMonth: string | null` - mes selecionado (null = todos)
- `filterPerson: string | null` - ID do responsavel (null = todos)

#### 2. Extrair opcoes disponiveis
- **Anos**: extrair anos unicos das `due_date` dos deliverables
- **Meses**: extrair meses unicos do ano selecionado (ou todos se nenhum ano selecionado)
- **Pessoas**: listar todas as pessoas atribuidas nos deliverables

#### 3. Barra de filtros
Renderizar acima dos KPI cards uma linha com 3 Selects lado a lado:
```
[Ano ▾]  [Mês ▾]  [Responsável ▾]  [Limpar]
```
- Cada Select usa o padrao `__none__` para "Todos"
- Botao "Limpar" reseta todos os filtros

#### 4. Aplicar filtros nos dados
Criar um `filteredWithHours` que aplica os filtros de ano, mes e pessoa sobre `withHours` antes de alimentar KPIs, grafico e tabela.

#### 5. Imports adicionais
- Adicionar `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` dos componentes UI
- Adicionar `Button` para o botao limpar
- Adicionar `Filter` icon do lucide-react

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Arquivo editado | `src/components/sprint/SprintHoursDashboard.tsx` |
| Novos estados | `filterYear`, `filterMonth`, `filterPerson` |
| Filtragem | Aplicada no `withHours` antes de calcular `chartData`, `personSummary` e KPIs |
| Componentes UI | `Select` (Radix), `Button` |
| Padrao vazio | `__none__` para representar "Todos" nos selects |

