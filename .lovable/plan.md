

## Plano: Dashboard de Horas por Pessoa na aba Metricas

### Objetivo
Substituir a mensagem "Nenhuma metrica cadastrada" por um dashboard visual que mostra a distribuicao de horas estimadas dos `sprint_deliverables` agrupadas por pessoa, com filtros de granularidade temporal (dia, semana, mes, ano).

### Novo componente: `src/components/sprint/SprintHoursDashboard.tsx`

Dashboard que:
- Recebe `deliverables` e `profiles` como props
- Possui seletor de granularidade: Dia / Semana / Mes / Ano
- Usa recharts (ja instalado) para exibir um grafico de barras empilhadas (stacked bar chart) onde:
  - Eixo X = periodo (dia, semana, mes ou ano dependendo do filtro)
  - Eixo Y = horas estimadas
  - Cada cor = uma pessoa (assigned_to)
- Abaixo do grafico, uma tabela resumo por pessoa mostrando: nome, total de horas, quantidade de tarefas, media de horas/tarefa
- Cards de KPI no topo: Total de Horas, Media por Dia, Pessoa com Mais Horas, Tarefas sem Horas

Logica de agrupamento:
- **Dia**: agrupa deliverables por `due_date` exato
- **Semana**: agrupa por numero da semana usando `getISOWeek` do date-fns
- **Mes**: agrupa por mes/ano
- **Ano**: agrupa por ano

### Alteracao: `src/pages/equipe/EquipeSprintDetalhes.tsx`

Na aba Metricas (linha ~1605), adicionar o `SprintHoursDashboard` **antes** do conteudo de metricas existente. O dashboard aparece sempre (independente de ter metricas cadastradas), usando os dados dos deliverables.

```text
Tab Metricas
+----------------------------------------------+
| KPI Cards: Total Horas | Media/Dia | ...     |
+----------------------------------------------+
| [Dia] [Semana] [Mes] [Ano]                   |
| +------------------------------------------+ |
| | Grafico barras empilhadas por pessoa     | |
| | X = periodo, Y = horas, cor = pessoa     | |
| +------------------------------------------+ |
+----------------------------------------------+
| Tabela resumo por pessoa                     |
| Nome | Horas | Tarefas | Media               |
+----------------------------------------------+
| (metricas manuais existentes abaixo)         |
+----------------------------------------------+
```

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Novo arquivo | `src/components/sprint/SprintHoursDashboard.tsx` |
| Arquivo editado | `src/pages/equipe/EquipeSprintDetalhes.tsx` (aba Metricas) |
| Dados usados | `filteredDeliverables` (estimated_hours, due_date, assigned_to) e `profiles` |
| Grafico | `BarChart` do recharts com barras empilhadas, cores distintas por pessoa |
| Filtros | Toggle group com 4 opcoes de granularidade temporal |
| KPIs | Total horas, media por dia, pessoa destaque, tarefas sem hora |
| Dependencias | Nenhuma nova - usa recharts, date-fns, componentes UI existentes |

