
## Adicionar item "Chamados" no menu lateral Tax

### Alteração única

**Arquivo:** `src/components/equipe/fiscal/FiscalSidebar.tsx`

1. Adicionar `MessageSquare` ao import do `lucide-react` (linha 10)
2. Adicionar novo item no array `menuItems` após "Auditoria" (após linha 81):

```typescript
{
  id: 'chamados',
  label: 'Chamados',
  icon: MessageSquare,
  path: '/equipe/chamados'
}
```

Segue o mesmo padrão visual dos itens existentes (ícone + label, highlight emerald no active). Nenhuma página, rota ou RLS alterada.
