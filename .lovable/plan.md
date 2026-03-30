

## Plano: Sidebar minimalista no DevLayout

### Objetivo
Transformar o estado recolhido da sidebar em uma faixa mínima (~16px) sem conteúdo visível, com apenas um botão flutuante de expansão na borda esquerda. Transição suave de largura.

### Alterações em `src/components/equipe/dev/DevLayout.tsx`

**1. Largura no estado collapsed**
- Trocar `w-16` por `w-4` (16px) no `<aside>`
- Manter `w-64` quando expandido

**2. Esconder todo conteúdo no collapsed**
- Envolver o header da sidebar, navegação e footer em `{!collapsed && (...)}` — nada renderiza quando recolhido
- Remover os blocos condicionais internos que mostravam "DD", "SPED", "LC" no collapsed

**3. Botão flutuante de expansão**
- Substituir o botão toggle atual por um botão `absolute` posicionado na borda esquerda (`left-1 top-1/2 -translate-y-1/2`) visível apenas quando `collapsed`
- Quando expandido, manter um botão de recolher no canto superior direito da sidebar (como já existe)

**4. Transição suave**
- Adicionar `transition-all duration-300 ease-in-out` no `<aside>` (já tem `transition-all duration-300`, basta confirmar)

**5. Conteúdo principal**
- O `<main>` já usa `flex-1` — ao reduzir a sidebar para 16px, ele ocupa o espaço automaticamente sem gaps

### Resultado visual

```text
Collapsed:          Expanded:
┌──┬─────────┐      ┌────────────┬──────┐
│▸ │ Content  │      │ Digital Dev│      │
│  │          │      │ Início     │ Cont │
│  │          │      │ XMLs       │      │
│  │          │      │ SPED ▾     │      │
│  │          │      │ ...        │      │
└──┴─────────┘      └────────────┴──────┘
16px                 256px
```

| Arquivo | Alteração |
|---------|-----------|
| `DevLayout.tsx` | Sidebar `w-4` quando collapsed, conteúdo condicional `{!collapsed && ...}`, botão flutuante chevron |

