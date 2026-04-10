

## Correção: Painel lateral do calendário fiscal cortando botões

### Problema
O `TaskCalendar.tsx` usa o componente `TaskCard` completo dentro do Sheet, que inclui `DropdownMenu`, avatares e badges — conteúdo muito largo para o painel. No Sprint (`SprintCalendar.tsx`), o layout funciona porque usa cards simples com um botão de edição inline (ícone de lápis).

### Solução
Replicar o padrão do `SprintCalendar.tsx`: em vez de usar o `TaskCard` completo dentro do Sheet, renderizar cards simplificados inline com:
- Badge de status + código da tarefa
- Título da tarefa
- Nome do responsável
- Horas estimadas
- Botão de edição (ícone `Edit2`) como `Button ghost` alinhado à direita

**Arquivo: `src/components/equipe/fiscal/tasks/TaskCalendar.tsx`**

Substituir o bloco que renderiza `<TaskCard>` (dentro do Sheet) por cards inline seguindo o mesmo padrão do Sprint:

```tsx
selectedDateTasks.map(task => (
  <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={cn("text-white text-xs", statusColors[task.status]?.bgSolid || 'bg-slate-400')}>
            {statusColors[task.status]?.label || task.status}
          </Badge>
        </div>
        <p className="font-medium text-sm break-words">{task.title}</p>
        {task.assigned_profile && (
          <p className="text-xs text-muted-foreground mt-1">
            {task.assigned_profile.first_name} {task.assigned_profile.last_name}
          </p>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
))
```

Remover a importação de `TaskCard` e adicionar `Edit2` do lucide-react.

### 1 arquivo editado

