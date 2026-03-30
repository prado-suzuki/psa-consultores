

## Plano: Scroll horizontal flutuante fixo no rodapé

### Problema
As tabelas de apuração PIS/COFINS são muito largas. O usuário precisa rolar até o final vertical da tabela para acessar o scrollbar horizontal. Isso dificulta a navegação.

### Solução
Criar um componente `FloatingScrollbar` que renderiza uma barra de scroll horizontal **fixa na parte inferior da viewport** (`position: fixed; bottom: 0`), sincronizada bidirecionalmente com o container real da tabela.

### Alterações

**1. Novo componente `src/components/ui/floating-scrollbar.tsx`**
- Recebe uma `ref` do container scrollável (o `div` com `overflow-x-auto`)
- Renderiza um `div` fixo no bottom da tela com `overflow-x: auto` contendo um div-filho cuja largura espelha o `scrollWidth` do container real
- Sincroniza scroll bidirecional via `onScroll` em ambos (com guard para evitar loop)
- Usa `ResizeObserver` para atualizar a largura do conteúdo interno
- Esconde-se automaticamente quando o scrollbar nativo do container já está visível no viewport (via `IntersectionObserver`)
- Alinha horizontalmente com o container real (calcula `left` e `width` baseado no `getBoundingClientRect` do container)

**2. Editar `ApuracaoDataTable.tsx`**
- Adicionar `ref` ao `div.overflow-x-auto` do container da tabela
- Renderizar `<FloatingScrollbar targetRef={scrollRef} />` após o container

**3. Editar `BalanceteTreeTable.tsx`**
- Mesma lógica: `ref` no container scrollável + `<FloatingScrollbar />`

**4. Editar `ApuracaoPisCofins.tsx`**
- Para as tabelas inline (Apuração, Rateio) que usam `InlineTableWrapper` e `Card`: adicionar ref + `FloatingScrollbar` no wrapper

### Detalhes técnicos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/floating-scrollbar.tsx` | **Novo** — componente de scrollbar flutuante |
| `ApuracaoDataTable.tsx` | Adicionar ref + FloatingScrollbar |
| `BalanceteTreeTable.tsx` | Adicionar ref + FloatingScrollbar |
| `ApuracaoPisCofins.tsx` | Adicionar ref + FloatingScrollbar nas tabelas inline |

