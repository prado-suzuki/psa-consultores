

# Redesign UI do Controle de Balancetes

## Referência analisada
O HTML de referência apresenta um design mais limpo e espaçoso:
- Cards com `rounded-2xl`, `border-slate-200`, `shadow-sm`, padding generoso (`p-6 md:p-8`)
- Título de filtro com ícone teal + texto `uppercase tracking-widest font-bold text-sm`
- Layout de filtros em grid 12 colunas
- Botões de ação com estilo claro (buscar teal, limpar vermelho)
- Tabela com headers uppercase e tracking-wider
- Estados vazios com ícone grande centralizado
- Espaçamento geral mais generoso

## O que já temos
A página `ControleBalancetes.tsx` já tem toda a lógica funcional (filtros, busca, download, upload modal). A mudança é puramente visual/layout.

## Alterações (1 arquivo)

**`src/pages/equipe/dev/ControleBalancetes.tsx`** — ajustes de styling:

1. **Card de Filtros**: trocar para `rounded-2xl border-slate-200 shadow-sm`, padding `p-6 md:p-8`; título com ícone Filter + texto uppercase tracking-widest
2. **Grid de filtros**: manter `grid-cols-12 gap-6` com inputs `h-11`; melhorar labels com `text-sm font-medium text-slate-700`
3. **Barra de ações dos filtros**: separador `border-t` + `flex justify-end gap-3`; botão Limpar com estilo vermelho outline; botão Buscar maior com `py-2.5 px-5`
4. **Card de Resultados**: `rounded-2xl`; header com título + botão "Novo Balancete" alinhados
5. **Tabela**: headers com `uppercase tracking-wider text-xs font-semibold text-slate-500`; linhas com hover sutil
6. **Estado vazio**: ícone `h-12 w-12` centralizado + texto descritivo com `text-sm`
7. **Estado loading**: spinner centralizado com texto "Buscando balancetes..."

Nenhuma mudança de lógica, queries, ou migrações SQL.

