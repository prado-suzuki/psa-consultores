# EDU-22 · Criar a lista de itens do pedido de documentos

Executar, sem alterar nada, a migration `supabase/migrations/20260803190000_osg_solicitacao_item.sql`, que cria a tabela onde ficam os documentos de cada pedido.

## O que a migration faz

- Cria o tipo de status do item com dois valores: ativo e dispensado.
- Cria a tabela `solicitacao_item`, com 15 colunas. Item vindo do catálogo entra sem texto próprio (documento, entidade e nota nulos) e herda do catálogo na leitura; texto preenchido significa que o analista sobrescreveu só para aquele cliente.
- Cria 4 índices (2 de busca e 2 únicos), 1 regra de domínio na granularidade, 1 gatilho de atualização de data, 5 regras de acesso e os grants.
- Nenhum dado é gravado e nenhuma tabela existente é alterada.

Os dois índices únicos convivem de propósito (nulo não colide com nulo no Postgres): um cuida do item de catálogo, o outro do item manual. Não serão "corrigidos".

## Passos

1. Executar essa migration, exatamente como está no repositório, e somente ela.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Rodar o GATE de 6 consultas de leitura e devolver os resultados na íntegra, sem resumir, e confirmar que o types.ts traz `solicitacao_item`.

## Fora de escopo

- Coluna `solicitacao_id` em `documento_arquivo` (EDU-23).
- RPC de leitura (EDU-24) e reescrita da `gerar_solicitacao_os` (EDU-25).
- Qualquer alteração de front.

## Se falhar

Devolver a mensagem de erro completa e o diagnóstico, sem editar a migration e sem contornar.
