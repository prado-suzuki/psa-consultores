

# Corrigir calendário da Agenda cortando na direita

## Problema

O grid do calendário (`grid grid-cols-7`) não tem `min-width` definido, então quando o container é menor que o necessário para 7 colunas com `min-h-[100px]`, as colunas de Sex/Sáb ficam cortadas pelo `overflow-hidden` do layout pai.

## Solução

No `SprintCalendar.tsx`:

1. Envolver o grid do calendário em um container com scroll horizontal e largura mínima:
   - Adicionar `overflow-x-auto` no wrapper
   - Adicionar `min-w-[700px]` no grid para garantir que as 7 colunas sempre tenham espaço adequado

Alteração simples na linha 87:
```tsx
// Antes:
<div className="grid grid-cols-7 gap-1">

// Depois — envolver em scroll container:
<div className="overflow-x-auto">
  <div className="grid grid-cols-7 gap-1 min-w-[700px]">
    ...
  </div>
</div>
```

Isso garante que em telas menores o calendário faz scroll horizontal em vez de cortar, e em telas maiores (que é o caso da screenshot — monitor grande com sidebar) as colunas se expandem normalmente.

