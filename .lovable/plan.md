# Plano: Barra de rolagem superior na tabela de /gestao/chamados

## Objetivo
Adicionar uma barra de rolagem horizontal **fixa no topo** da tabela em `GestaoChamados.tsx`, sincronizada com a rolagem nativa, para facilitar a navegação quando há muitas colunas (Status, Título, Departamento, Área, Cluster, Representante, Cliente, Responsável, Prazo, Atualizado, Ações).

## Mudanças

### 1. `src/components/ui/floating-scrollbar.tsx`
Adicionar suporte a posicionamento no topo:
- Nova prop `position?: "top" | "bottom"` (default `"bottom"`).
- Quando `position="top"`: a barra é posicionada de forma `fixed` usando `top: rect.top` (calculado via `getBoundingClientRect()` do alvo) em vez de `bottom: 0`.
- A lógica de visibilidade muda: para `top`, mostrar quando o **topo** do conteúdo NÃO está visível (`rect.top < 0`) ou quando `alwaysVisible` for true e houver overflow horizontal.
- Sincronização horizontal já existente continua valendo.

### 2. `src/pages/gestao/GestaoChamados.tsx`
- Criar `const tableContainerRef = useRef<HTMLDivElement>(null);`
- Passar `containerRef={tableContainerRef}` para `<Table>` (a prop já existe em `src/components/ui/table.tsx`).
- Renderizar logo acima ou abaixo do `<Card>` da tabela:
  ```tsx
  <FloatingScrollbar targetRef={tableContainerRef} position="top" alwaysVisible />
  ```
- Importar `FloatingScrollbar` e `useRef`.

## Comportamento esperado
- Ao abrir `/gestao/chamados`, se a tabela tiver overflow horizontal, aparece uma barrinha fina fixa no topo da viewport (alinhada à largura da tabela) que move junto com a rolagem nativa inferior.
- Mover a barra superior rola a tabela; rolar a tabela move a barra superior — ambas sincronizadas.
- Quando o topo da tabela está visível na tela, a barra superior some (a menos que `alwaysVisible` mantenha quando há overflow). Vamos manter `alwaysVisible` para sempre exibir a barra superior enquanto houver overflow horizontal — isso é o pedido do usuário.

## Arquivos modificados
- `src/components/ui/floating-scrollbar.tsx` (adiciona prop `position`)
- `src/pages/gestao/GestaoChamados.tsx` (usa o componente com `position="top"`)

Sem alterações de banco, hooks ou tipos.
