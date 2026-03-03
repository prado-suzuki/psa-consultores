

# Corrigir sidebar Tax: ocultar completamente e mover toggle para header

## Problema

Quando a sidebar é colapsada, ela encolhe para `w-16` (modo ícones) e o botão de toggle fica posicionado dentro dela. O usuário quer que ao colapsar, a sidebar desapareça **completamente** e o botão para reabri-la fique no header superior, à esquerda.

## Alterações

### 1. `FiscalSidebar.tsx`

- Mudar o comportamento: quando `isCollapsed = true`, a sidebar fica com `w-0` e `overflow-hidden` (totalmente oculta), em vez de `w-16`
- Remover o botão de toggle de dentro da sidebar
- Expor o estado `isCollapsed` e `setIsCollapsed` para o componente pai (via props ou via contexto)
- Opção mais simples: **extrair o estado para o `FiscalLayout`** e passar `isCollapsed`/`onToggle` como props para `FiscalSidebar`

### 2. `FiscalLayout.tsx`

- Gerenciar o estado `isCollapsed` aqui
- Passar `isCollapsed` e `onToggle` para `FiscalSidebar`
- No header, quando `isCollapsed = true`, mostrar um botão com ícone `Menu` (ou `ChevronRight`) à esquerda do título para reabrir a sidebar
- Manter o botão de colapsar (ChevronLeft) dentro da sidebar quando ela estiver aberta

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/components/equipe/fiscal/FiscalSidebar.tsx` | Receber `isCollapsed`/`onToggle` via props; quando colapsado, renderizar `w-0 overflow-hidden`; remover botão toggle interno |
| `src/components/equipe/fiscal/FiscalLayout.tsx` | Gerenciar estado `isCollapsed`; adicionar botão toggle no header à esquerda |

