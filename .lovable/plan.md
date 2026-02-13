

## Mover filtros de Ano, Mes e Responsavel para a barra de filtros principal

### O que sera feito
Remover os filtros (Ano, Mes, Responsavel) de dentro do componente `SprintHoursDashboard` e coloca-los na barra de filtros principal da pagina `EquipeSprintDetalhes.tsx`, ao lado dos botoes de urgencia (Hoje, Amanha, Atrasados).

### Alteracoes

#### 1. `src/pages/equipe/EquipeSprintDetalhes.tsx`

**Novos estados:**
- `filterYear`, `filterMonth`, `filterMetricsPerson` (todos com valor `"__none__"` como padrao)

**Opcoes de filtro derivadas:**
- Extrair anos e meses unicos dos deliverables com horas estimadas
- Listar responsaveis unicos

**Na barra de filtros (linhas ~1067-1134):**
Adicionar 3 Selects apos os botoes de urgencia (Atrasados):
```
[Responsável ▾] [Status ▾] [Hoje] [Amanhã] [Atrasados] | [Ano ▾] [Mês ▾] [Pessoa ▾] [Limpar]
```

**No SprintHoursDashboard:**
Passar os deliverables ja filtrados por ano/mes/pessoa, em vez de passar os filtros como props.

#### 2. `src/components/sprint/SprintHoursDashboard.tsx`

**Remover:**
- Estados `filterYear`, `filterMonth`, `filterPerson`
- Memos `availableYears`, `availableMonths`, `availablePeople`
- Memo `filteredWithHours` (os dados ja virao filtrados via props)
- Toda a barra de filtros no JSX (Filter icon + 3 Selects + botao Limpar)
- Imports de `Select`, `Button`, `Filter` que ficarem sem uso

**Ajustar:**
- Todos os calculos (`chartData`, `personSummary`, KPIs) passam a usar `withHours` diretamente, pois os dados ja chegam filtrados

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Arquivos editados | `EquipeSprintDetalhes.tsx`, `SprintHoursDashboard.tsx` |
| Logica de filtragem | Movida para o componente pai |
| Props do dashboard | Sem mudanca na interface (continua recebendo `deliverables` e `profiles`) |
| Filtros aplicados | Antes de passar ao `SprintHoursDashboard` e tambem ao `filteredDeliverables` existente |
| Posicao visual | Ao lado dos botoes Hoje/Amanha/Atrasados na barra de filtros |

