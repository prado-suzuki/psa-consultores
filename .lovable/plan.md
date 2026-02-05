
# Plano: Editar Projetos em Processos e Ajustar Layout de Sprints

## Resumo

Este plano aborda duas necessidades:
1. **Processos**: Adicionar capacidade de vincular multiplos projetos ao editar um processo
2. **Sprints**: Redesenhar os cards das sprints, removendo a visao geral de horas (ja existe no Dashboard) e aplicando design mais limpo

---

## Parte 1: Vincular Multiplos Projetos aos Processos

### Situacao Atual
- A aba "Projetos" no modal de processo apenas exibe os projetos vinculados (somente leitura)
- Os vinculos sao gerenciados na tabela `project_processes` (N:N)
- Nao existe interface para adicionar/remover projetos de um processo

### Solucao Proposta

Adicionar funcionalidade de edicao na aba "Projetos" do modal:

```text
+-------------------------------------------------------------+
|  Projetos (3)                                               |
+-------------------------------------------------------------+
|                                                             |
|  [+ Adicionar Projeto]                                      |
|                                                             |
|  +-------------------------------------------------------+  |
|  | P2 - Automacao SPED              [Principal]  [X]     |  |
|  +-------------------------------------------------------+  |
|  | P6 - Dashboard Gestao            [Secundario] [X]     |  |
|  +-------------------------------------------------------+  |
|  | P9 - Site e Chamados             [Suporte]    [X]     |  |
|  +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

### Componentes da Interface

1. **Botao "Adicionar Projeto"**: Abre um popover/dialog com:
   - Select de projetos (filtrados para nao mostrar ja vinculados)
   - Select de tipo de impacto (Principal, Secundario, Suporte)
   - Botao confirmar

2. **Lista de Projetos Vinculados**:
   - Mostra cada projeto com badge de tipo de impacto
   - Botao X para remover vinculo
   - Confirmacao antes de remover

---

## Parte 2: Ajustar Layout de Sprints

### Mudancas no Design

1. **Remover componente HorasAcumuladas**: Esta duplicando informacao do Dashboard

2. **Cards mais limpos**:
   - Remover icones decorativos desnecessarios
   - Tipografia mais equilibrada (titulos menores)
   - Sem emojis
   - Espacamento mais consistente

### Antes vs Depois

```text
ANTES (atual):
+------------------------------------------------------------------+
|  [Card HorasAcumuladas - REMOVER]                                |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------------------------------------------+  |
|  | [Target Icon] Sprint 1 - Janeiro        [Ativa] [Projeto]  |  |
|  | Objetivo da sprint completo aqui                           |  |
|  | [Calendar] 01/01 - 07/01   [Clock] 40.5h alocadas          |  |
|  | [TrendingUp] Impacto Digital: R$ 2.500/mes   15h liberadas |  |
|  | [User] Horas por Pessoa (3)                    [v]         |  |
|  +------------------------------------------------------------+  |

DEPOIS (proposto):
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | Sprint 1 - Janeiro                      [Ativa] [Projeto]  |  |
|  |------------------------------------------------------------+  |
|  | Objetivo da sprint                                         |  |
|  |                                                            |  |
|  | 01/01 - 07/01  •  40.5h alocadas                           |  |
|  |                                                            |  |
|  | Impacto: R$ 2.500/mes  •  15h liberadas                    |  |
|  |                                        [Ver Detalhes] [...]|  |
|  +------------------------------------------------------------+  |
```

---

## Secao Tecnica

### Arquivos a Modificar

#### 1. src/pages/equipe/EquipeProcessos.tsx

Adicionar estado e funcoes para gerenciar projetos:

```typescript
const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
const [isAddingProject, setIsAddingProject] = useState(false);
const [newProjectLink, setNewProjectLink] = useState({
  project_id: '',
  impact_type: 'principal'
});
```

Adicionar funcoes:

```typescript
const addProjectToProcess = async () => {
  const { error } = await supabase
    .from('project_processes')
    .insert({
      process_id: selectedProcess.id,
      project_id: newProjectLink.project_id,
      impact_type: newProjectLink.impact_type
    });
  // Refresh data
};

const removeProjectFromProcess = async (linkId: string) => {
  await supabase.from('project_processes').delete().eq('id', linkId);
  // Refresh data
};
```

Modificar aba "Projetos" para permitir edicao:

```tsx
<TabsContent value="projects">
  {/* Botao adicionar */}
  <div className="flex justify-end mb-4">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Projeto
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-3">
          <Select value={newProjectLink.project_id} onValueChange={...}>
            {/* Lista de projetos disponiveis */}
          </Select>
          <Select value={newProjectLink.impact_type} onValueChange={...}>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="secundario">Secundario</SelectItem>
            <SelectItem value="suporte">Suporte</SelectItem>
          </Select>
          <Button onClick={addProjectToProcess}>Vincular</Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>

  {/* Lista com botao remover */}
  {projectProcesses.map((pp) => (
    <Card key={pp.id}>
      <CardContent className="flex justify-between items-center">
        <div>
          <p className="font-medium">{pp.projects?.name}</p>
          <Badge>{pp.impact_type}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeProjectFromProcess(pp.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </CardContent>
    </Card>
  ))}
</TabsContent>
```

#### 2. src/pages/equipe/EquipeSprints.tsx

Remover HorasAcumuladas e redesenhar cards:

```tsx
// REMOVER estas linhas (519-525):
// <div className="mb-6">
//   <HorasAcumuladas showRoutines={true} title="Visao Geral de Horas" />
// </div>

// Remover import do HorasAcumuladas

// Redesenhar Card da Sprint:
<Card key={sprint.id} className="bg-white border-gray-100 shadow-sm">
  <CardContent className="p-5">
    {/* Header com titulo e badges */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-gray-900 text-base">
          {sprint.name}
        </h3>
        {getStatusBadge(sprint.status)}
        {sprint.project_id && (
          <Badge variant="secondary" className="text-xs font-normal">
            {getProjectName(sprint.project_id)}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => {setSelectedSprint(sprint); setIsEditMode(true)}}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/equipe/sprints/${sprint.id}`)}>
          Ver Detalhes
        </Button>
      </div>
    </div>
    
    {/* Objetivo (se houver) */}
    {sprint.goal && (
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sprint.goal}</p>
    )}
    
    {/* Meta info em linha */}
    <div className="flex items-center gap-4 text-sm text-gray-500">
      <span>
        {parseDate(sprint.start_date).toLocaleDateString('pt-BR')} - 
        {parseDate(sprint.end_date).toLocaleDateString('pt-BR')}
      </span>
      {totalHours > 0 && (
        <span>{totalHours.toFixed(0)}h alocadas</span>
      )}
    </div>
    
    {/* Impacto Digital (se houver) */}
    {sprintImpact && sprintImpact.totalCostSaved > 0 && (
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm">
        <span className="text-green-600 font-medium">
          Impacto: R$ {sprintImpact.totalCostSaved.toLocaleString('pt-BR')}/mes
        </span>
        <span className="text-blue-600">
          {sprintImpact.totalTimeSaved.toFixed(0)}h liberadas
        </span>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `EquipeProcessos.tsx` | Adicionar funcionalidade para vincular/desvincular projetos na aba "Projetos" |
| `EquipeSprints.tsx` | Remover HorasAcumuladas, redesenhar cards mais limpos |

## Beneficios

1. **Processos**: Usuarios podem gerenciar projetos vinculados diretamente na interface
2. **Sprints**: Layout mais limpo, sem duplicacao de informacao, design profissional sem emojis
3. **Consistencia**: Horas consolidadas ficam apenas no Dashboard (fonte unica)
