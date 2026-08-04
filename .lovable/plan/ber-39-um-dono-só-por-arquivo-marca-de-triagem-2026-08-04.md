# BER-39 · Um dono só por arquivo + marca de triagem

## Pré-voo (já rodado)

- Linhas com mais de um dono (`pessoa_id` / `bem_id` / `matricula_id`): **0** — via livre, a guarda da migration não vai abortar.
- `contribuinte_id` preenchido: **0** · `org_projects_id` preenchido: **0** (de 43 linhas no total) — as duas colunas saem sem perda de dado.

## O que será feito

Executar `supabase/migrations/20260804120000_documento_arquivo_um_dono_e_triagem.sql` exatamente como está, sem renomear nem reescrever. Dentro de uma transação, na ordem do arquivo:

1. Guarda que aborta se surgir linha com mais de um dono.
2. Remove as colunas nunca usadas `contribuinte_id` e `org_projects_id`.
3. Adiciona `triado_em` (timestamptz) e `triado_por` (uuid, sem FK, mesmo padrão de `created_by`/`updated_by`).
4. Comentários nas duas colunas novas.
5. Constraint `documento_arquivo_um_dono_apenas`: soma de `pessoa_id`, `bem_id`, `matricula_id` e `triado_em` não nulos `<= 1` (linha totalmente vazia continua válida — é o balde).
6. Comentário na constraint.

Depois: regenerar `src/integrations/supabase/types.ts`.

## Fora de escopo

Nenhuma mudança em RLS/policies de `documento_arquivo`; nada em `documento_gerado_id`, `checklist_item_id` ou `solicitacao_id`; nenhum código de front (isso é a BER-40).

## GATE que será devolvido

1. Os dois números do pré-voo (acima).
2. Estrutura da tabela depois, provando que `contribuinte_id`/`org_projects_id` sumiram e `triado_em`/`triado_por` existem.
3. Definição da constraint lida de `pg_constraint`.
4. Três provas em `begin`/`rollback`:
   - a) update marcando `pessoa_id` + `bem_id` na mesma linha **falha**;
   - b) update marcando `triado_em` em linha que já tem `pessoa_id` **falha**;
   - c) insert de linha sem dono e sem `triado_em` **passa**.
5. Confirmação da regeneração do `types.ts` e o nome do commit gerado.
