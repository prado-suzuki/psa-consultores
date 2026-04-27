# Ajuste no Prazo de Chamados Fechados — `/gestao/chamados`

## Problema
Na tabela de chamados em `/gestao/chamados`, a coluna **Prazo** continua exibindo a data em vermelho (com ícone de alerta de "vencido") mesmo quando o chamado já está com status **Fechado** ou **Resolvido**. Isso gera ruído visual indevido — um chamado encerrado não tem prazo "estourando".

Exemplo no print: "Dúvida sobre obrigatoriedade…" (Fechado) exibe `20/04/2026 (segunda)` em vermelho com `⚠`.

## Causa
Em `src/pages/gestao/GestaoChamados.tsx` (~linha 631–647), o cálculo da cor do prazo considera apenas se a data já passou (`isPastBrazil`), ignorando o `ticket.status`.

## Solução
Tratar chamados com status `resolvido` ou `fechado` como **encerrados**, sem aplicar a lógica de "vencido":

- Se o chamado estiver **fechado/resolvido**:
  - Exibir a data em cinza neutro (`text-slate-500`, sem `font-semibold`).
  - **Não** mostrar o ícone `AlertTriangle`.
- Caso contrário, manter o comportamento atual (vermelho/âmbar/verde conforme proximidade do prazo).

## Arquivo afetado
- `src/pages/gestao/GestaoChamados.tsx` — ajustar o bloco de renderização do prazo (linhas ~631–647) para considerar `ticket.status`.

## Fora de escopo
- Nenhuma mudança em hooks, banco, RLS ou outras telas.
- A lógica equivalente em `EquipeChamados.tsx` / portal do cliente não foi reportada e não será alterada agora (posso estender depois se quiser).
