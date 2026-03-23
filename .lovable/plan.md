

## Plano: Corrigir auto-submit ao clicar em Editar

### Causa raiz

O botão "Editar" no footer não tem `type="button"` explícito. Dentro de um `DialogContent` que contém um `<form>`, o botão pode ser interpretado como `type="submit"` pelo browser, disparando o submit do formulário no momento em que o modo troca para `edit` e o form aparece.

### Correção

**Arquivo:** `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

1. Adicionar `type="button"` ao botão "Editar" (linha 244) para garantir que ele nunca dispare submit
2. Adicionar `type="button"` ao botão "Fechar" (linha 243) por segurança

Alteração mínima — apenas 2 atributos adicionados, zero mudança de lógica.

