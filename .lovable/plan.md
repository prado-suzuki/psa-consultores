

# Exibir botão "Salvar Alterações" em todas as abas

## Problema
O botão de salvar só aparece na última aba. O usuário precisa navegar até o final para salvar.

## Solução

**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx` (linhas 4041-4058)

Alterar o bloco de botões no footer para exibir **ambos** os botões (Avançar e Salvar) quando não for a última aba, e apenas o Salvar na última aba:

- Quando `!isLastTab`: mostrar botão "Avançar" E botão "Salvar Alterações" lado a lado
- Quando `isLastTab`: mostrar apenas botão "Salvar Alterações" (como já está)
- Manter o botão "Cancelar" sempre visível

O botão Salvar terá estilo secundário (outline com cor teal) nas abas intermediárias para dar destaque visual ao "Avançar", e estilo primário na última aba.

