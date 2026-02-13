

## Plano: Adicionar visualizacao de calendario na aba Agenda

### Contexto
A aba "Agenda" na pagina de detalhes da sprint atualmente so exibe `sprint_events` em formato de lista cronologica. O usuario quer uma visualizacao de calendario mensal (igual ao `TaskCalendar` do modulo Tax) mostrando a distribuicao de entregas (`sprint_deliverables`) por data.

### Solucao
Criar um componente `SprintCalendar` inspirado no `TaskCalendar` existente e integra-lo na aba Agenda, mantendo a listagem de eventos existente abaixo do calendario.

---

### Alteracoes

#### 1. Novo componente: `src/components/sprint/SprintCalendar.tsx`

Componente de calendario mensal que:
- Recebe a lista de `deliverables` e callbacks para editar
- Exibe grid de dias do mes com indicadores coloridos por status (pendente=cinza, em progresso=amarelo, concluido=verde)
- Ao clicar em um dia, abre um `Sheet` lateral listando os entregaveis daquele dia
- Navegacao entre meses e botao "Hoje"
- Usa `due_date` dos deliverables para posicionar no calendario
- Reutiliza date-fns, ptBR locale, e componentes UI existentes (Sheet, ScrollArea, Button, Badge)

Estrutura visual:
```text
+----------------------------------------------+
|  < Fevereiro 2026           [Hoje]  >        |
+----------------------------------------------+
| Dom | Seg | Ter | Qua | Qui | Sex | Sab     |
|     |     |     |     |     |     |          |
|     |  2  |  3  |  4  |  5  |  6  |  7      |
|     |     | ooo |     |  o  |     |          |
|  8  |  9  | 10  | 11  | 12  | 13  | 14      |
|     | oo  |     |     | ooo+|     |          |
+----------------------------------------------+
```

#### 2. Alterar `src/pages/equipe/EquipeSprintDetalhes.tsx`

- Importar `SprintCalendar`
- Na aba "Agenda" (linhas 1536-1587), adicionar o `SprintCalendar` acima da listagem de eventos existente
- Passar `filteredDeliverables` e `openEditModal` como props
- Manter a secao de eventos existente abaixo, com um titulo separador "Eventos da Sprint"

### Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Novo arquivo | `src/components/sprint/SprintCalendar.tsx` |
| Arquivo editado | `src/pages/equipe/EquipeSprintDetalhes.tsx` (aba Agenda) |
| Dados exibidos | `deliverables` filtrados, posicionados por `due_date` |
| Indicadores | Bolinhas coloridas por status: cinza (pending), amarelo (in_progress), verde (completed) |
| Interacao | Click no dia abre Sheet com lista de entregaveis; click no entregavel abre modal de edicao |
| Dependencias | Nenhuma nova - usa date-fns, componentes UI existentes |

