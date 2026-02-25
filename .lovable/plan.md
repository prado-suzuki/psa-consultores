

# Tornar campo Projeto obrigatório no TaskModal fiscal

## Mudanças em `src/components/equipe/fiscal/tasks/TaskModal.tsx`

### 1. Schema zod (linha 66)
```tsx
// DE:
project_id: z.string().optional(),
// PARA:
project_id: z.string().min(1, 'Projeto é obrigatório'),
```

### 2. Select onChange — trocar undefined por string vazia (linha 330)
```tsx
// DE:
onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
// PARA:
onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
```

### 3. Default values nos form.reset — garantir `project_id: ''` em vez de `undefined`

No reset de nova tarefa (linha ~252):
```tsx
project_id: parentTask?.project_id || '',
```

No reset ao editar (linha ~231):
```tsx
project_id: task.project_id || '',
```

No draft restore (mantém o valor do draft, que já será string).

### 4. Label com asterisco (linha 328)
```tsx
// DE:
<FormLabel>Projeto</FormLabel>
// PARA:
<FormLabel>Projeto <span className="text-red-500">*</span></FormLabel>
```

### 5. FormMessage já existe (linha 345)
O `<FormMessage />` já está no JSX abaixo do Select de Projeto — a mensagem de erro do zod será exibida automaticamente.

**Total: 4 pontos de edição no mesmo arquivo.**

