

# Corrigir Chevron de Subtarefas no Kanban Fiscal

## Problema

O botão chevron para expandir subtarefas usa `position: absolute` dentro do mesmo `div` do `TaskCard`, ficando escondido atrás do card renderizado.

## Solução

Reestruturar o wrapper de cada tarefa pai no `TaskKanban.tsx` (linhas 106-136): mover o chevron para FORA do div draggable, criando um layout flex horizontal onde o chevron fica à esquerda e o TaskCard ocupa o espaço restante.

## Arquivo: `src/components/equipe/fiscal/tasks/TaskKanban.tsx`

Substituir o bloco atual (linhas 106-136) por:

```tsx
{columnTasks.map(task => (
  <div key={task.id}>
    <div className="flex items-start gap-1">
      {task.subtaskCount > 0 ? (
        <button
          onClick={(e) => toggleTaskExpanded(task.id, e)}
          className="mt-3 p-0.5 hover:bg-gray-100 rounded flex-shrink-0"
        >
          {expandedTasks.has(task.id) ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      ) : (
        <div className="w-5 flex-shrink-0" />
      )}
      <div
        className={cn(
          "flex-1 min-w-0 cursor-grab active:cursor-grabbing",
          draggedTask?.id === task.id && "opacity-50"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
      >
        <TaskCard
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onReassign={onReassign}
          allTasks={tasks}
          compact
        />
      </div>
    </div>
```

O restante do componente (subtarefas expandidas, empty state) permanece inalterado.

**1 arquivo modificado.**

