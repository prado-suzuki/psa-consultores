# EDU-23 · De qual pedido veio o arquivo

Executar, sem alterar nada, `supabase/migrations/20260803210000_documento_arquivo_solicitacao_id.sql`.

## O que a migration faz

- Acrescenta em `documento_arquivo` a coluna nulável `solicitacao_id`, com chave estrangeira para `solicitacao` e apagamento que apenas desvincula (nunca apaga arquivo do cliente).
- Cria o comentário da coluna e um índice parcial restrito aos registros não excluídos.
- Nenhum dado é gravado; nenhuma outra tabela é tocada.

Ausências propositais mantidas: sem NOT NULL, sem unicidade e sem coluna de item.

## Passos

1. Executar essa migration, exatamente como está, e somente ela.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Rodar o GATE de 4 consultas de leitura e devolver os resultados na íntegra, mais a confirmação de `solicitacao_id` no types.ts.

## Fora de escopo

RPC de leitura (EDU-24), reescrita da `gerar_solicitacao_os` (EDU-25), preenchimento no upload (EDU-27) e qualquer front.

## Se falhar

Devolver a mensagem de erro completa e o diagnóstico, sem editar a migration e sem contornar.
