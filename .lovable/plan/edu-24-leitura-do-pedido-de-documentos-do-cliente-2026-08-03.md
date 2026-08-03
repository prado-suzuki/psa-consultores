# EDU-24 · Leitura do pedido de documentos do cliente

Executar, sem alterar nada, a migration `supabase/migrations/20260803230000_get_solicitacao_ativa_cliente.sql`.

## O que a migration faz

- Cria a função de leitura `get_solicitacao_ativa_cliente()`, sem parâmetros, que devolve um único bloco de dados com o pedido já enviado do cliente logado e os documentos ativos dele.
- Quando o item veio do catálogo e não tem texto próprio, o texto é herdado do catálogo; item criado à mão usa o texto da própria linha.
- Sem pedido enviado, devolve cabeçalho nulo e lista vazia.
- Permissão de execução apenas para usuários autenticados.
- Nenhum dado é gravado e nenhuma tabela é alterada. A função antiga `get_checklist_solicitado_cliente` continua existindo.

## Passos

1. Executar essa migration, exatamente como está no repositório, e somente ela.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Rodar o GATE de 4 consultas e devolver os resultados na íntegra, sem resumir, confirmando que o types.ts traz a função nova.

## Fora de escopo

- Reescrita da `gerar_solicitacao_os` (EDU-25), lib de grupos (EDU-26), tela do cliente (EDU-27).
- Qualquer alteração de front ou de hook.
- Remoção da função antiga.

## Se falhar

Devolver a mensagem de erro completa e o diagnóstico, sem editar a migration e sem contornar.
