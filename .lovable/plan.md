

## Plano: Sidebar responsiva com toggle de expandir/ocultar

O problema atual: a sidebar do BoardLayout nao tem nenhum botao de toggle. No desktop (>=1280px) ela e fixa em 232px sem opcao de colapsar. No tablet (768-1279px) ela so expande via hover — sem controle manual. No mobile o hamburger funciona, mas nao ha como fechar alem do overlay.

### Mudancas no `BoardLayout.tsx`

1. **Adicionar estado `collapsed`** com persistencia em `localStorage('board-sidebar-collapsed')` para manter a preferencia do usuario entre sessoes.

2. **Botao de toggle visivel em desktop e tablet**: Um botao circular posicionado na borda direita da sidebar (estilo ChevronLeft/ChevronRight) que alterna entre 232px e 64px. Usa as mesmas classes visuais da sidebar (fundo escuro, borda sutil).

3. **Unificar desktop e tablet**: Remover o comportamento de hover-only do tablet. Usar um unico `<aside>` para md+ com largura controlada por `collapsed`:
   - Expandido: `w-[232px]`
   - Colapsado: `w-[64px]`
   - Transicao suave com `transition-all duration-300`

4. **Ajustar `ml-` do main content** para acompanhar o estado collapsed: `md:ml-[64px]` quando colapsado, `md:ml-[232px]` quando expandido.

5. **Mobile (<768px)**: Manter Sheet/drawer como esta — funciona corretamente.

6. **Toggle no header mobile**: Ja existe o botao Menu — sem alteracao.

### Arquivo modificado

| Acao | Arquivo |
|------|---------|
| Editar | `src/components/equipe/board/BoardLayout.tsx` |

### O que NAO muda
- Nenhuma rota, hook ou pagina
- Conteudo da sidebar (nav items, badges, footer)
- Estilo visual (cores, fontes, gradientes)

