

## Correção de layout: Sheet do calendário cortando conteúdo

### Problema
O `SheetContent` no `TaskCalendar.tsx` usa largura padrão (`sm:max-w-sm` = 384px), que é insuficiente para exibir o `TaskCard` completo — o botão de menu (3 pontos com "Editar") fica cortado na borda direita.

### Solução

**Arquivo: `src/components/equipe/fiscal/tasks/TaskCalendar.tsx`** (linha 122)

Adicionar classe de largura maior ao `SheetContent`:

```tsx
<SheetContent className="sm:max-w-md">
```

Isso aumenta de 384px para 448px, dando espaço suficiente para o card com avatar + botão de menu sem cortar.

Também ajustar o `ScrollArea` (linha 128) para usar padding adequado:

```tsx
<ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-2">
```

E garantir que o container interno (linha 129) tenha `pr-4` (já tem) para que o dropdown do menu não seja clipado.

### 1 arquivo editado

