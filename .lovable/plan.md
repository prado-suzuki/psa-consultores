

# Mover aba "Rotina" para uma pagina propria abaixo de "Daily" na sidebar

## O que sera feito

A aba "Rotina" que atualmente fica dentro do Dashboard (como uma tab ao lado de Sprint e Impacto) sera extraida para uma pagina independente, acessivel pela sidebar logo abaixo de "Daily".

## Mudancas

### 1. Criar nova pagina `src/pages/equipe/EquipeRotinas.tsx`

Pagina dedicada contendo toda a logica da aba "Rotina" que hoje esta em `EquipeDashboard.tsx`:
- Listagem de rotinas do usuario
- Dialog para criar nova rotina
- Busca de team_members e routines do banco
- Usa `EquipeLayout` com titulo "Rotinas"

### 2. Atualizar sidebar (`src/components/equipe/EquipeLayout.tsx`)

Adicionar item "Rotinas" no menu, dentro do grupo "Projetos", abaixo de "Daily":

```
Projetos
  - Processos
  - Kanban
  - Sprints
  - Backlog
  - Daily
  - Rotinas   <-- novo
```

Usar icone `RefreshCw` (ja importado no projeto) para representar rotinas.

### 3. Registrar rota no `src/App.tsx`

Adicionar:
```
<Route path="/equipe/rotinas" element={<TeamRoute><EquipeRotinas /></TeamRoute>} />
```

### 4. Limpar `src/pages/equipe/EquipeDashboard.tsx`

- Remover a aba "Rotina" do `TabsList` e o `TabsContent value="rotina"` inteiro
- Remover estados e funcoes relacionados (`isRoutineDialogOpen`, `newRoutine`, `handleCreateRoutine`, `myRoutines`, `getFrequencyLabel`, `getStatusLabel`)
- O Dashboard ficara apenas com as abas "Sprint" e "Impacto Digital"

## Resultado esperado

- "Rotinas" aparece como item proprio na sidebar, abaixo de "Daily"
- Dashboard fica mais limpo, com foco em Sprint e Impacto
- Toda a funcionalidade de rotinas continua funcionando na nova pagina dedicada

