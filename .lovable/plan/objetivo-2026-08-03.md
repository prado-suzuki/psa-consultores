## Objetivo

Executar exatamente `supabase/migrations/20260803150000_renomear_checklist_para_documento_tipo.sql` (commit e9dc8715), sem alterar uma linha, e regenerar `src/integrations/supabase/types.ts`.

## O que o arquivo faz (lido, não alterado)

`BEGIN` → renomeia `checklist_item_padrao` → `documento_tipo` e `produto_checklist_item` → `produto_documento_tipo` → `CREATE OR REPLACE` de `gerar_solicitacao_os(uuid,uuid)` com o corpo atual e as 8 citações trocadas → re-aplica os grants da função (revoga de anon/service_role/public, concede a authenticated) → renomeia 2 gatilhos, 6 constraints, 1 índice e 6 policies → `COMMIT`.

Sem DML, sem mudança de coluna, sem tocar em `checklist_cliente_item`.

## Execução

1. Rodar a migration pela ferramenta de migration, com o SQL do arquivo exatamente como está.
2. Deixar o `types.ts` ser regenerado após a migration aprovada (automático no fluxo pós-migration).

Front intocado: as duas chamadas com nome antigo em `src/hooks/useOsgChecklist.ts` ficam como estão, conforme decidido.

## GATE (devolvo os quatro resultados, sem resumir)

1. `to_regclass` das quatro tabelas — esperado: os dois nomes novos preenchidos, os dois antigos NULL.
2. Contagem — esperado `documento_tipo = 58`, `produto_documento_tipo = 260`.
3. `pg_proc` com `prosrc ilike` nos nomes antigos — esperado nenhuma linha.
4. União de constraints, índices, policies e triggers das duas tabelas — esperado nenhum nome contendo "checklist".

Mais a confirmação, lendo o arquivo, de que `types.ts` traz `documento_tipo` e `produto_documento_tipo` e não traz mais os nomes antigos.

## Se algo falhar

Devolvo a mensagem completa e o diagnóstico da causa, sem alterar a migration e sem contornar.

## Condição adicional de pré-voo

Não executar `public.gerar_solicitacao_os` em nenhuma hipótese, nem para validar: ela contém um `INSERT` em `checklist_cliente_item` e criaria dado real. A prova de que o corpo resolve os nomes novos fica para uma verificação separada, dentro de transação desfeita.
