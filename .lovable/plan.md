# Plan — `produto_checklist_item`: elo produto × documento padrão

## Pré-voo (concluído — tudo verde)

| Check | Resultado |
|---|---|
| `to_regclass('public.produto_checklist_item')` | `null` — tabela ainda não existe |
| `produto_segmento.id` / `checklist_item_padrao.id` | ambos `uuid` |
| Função `checklist_touch_updated_at` | existe |
| Função `has_role_or_higher` | existe |

Seguro prosseguir.

## Escopo

- **Único objeto novo:** tabela `public.produto_checklist_item` (M:N entre `produto_segmento` e `checklist_item_padrao`).
- **Único arquivo de código alterado após migration:** `src/integrations/supabase/types.ts` (regeneração automática).
- **Fora de escopo:** dados, RPCs, hooks, telas, alterações em outras tabelas/policies, coluna `quantidade_esperada`.

## Migration nova

Arquivo: `supabase/migrations/<timestamp>_produto_checklist_item.sql`

Conteúdo idêntico ao bloco SQL do briefing:

- `CREATE TABLE public.produto_checklist_item` com:
  - `id uuid pk default gen_random_uuid()`
  - `produto_segmento_id uuid not null references produto_segmento(id) on delete cascade`
  - `item_padrao_id uuid not null references checklist_item_padrao(id) on delete cascade`
  - `obrigatorio boolean not null default true`
  - `created_at/created_by/updated_at/updated_by` (defaults `now()` / `auth.uid()`)
  - `unique (produto_segmento_id, item_padrao_id)`
- `COMMENT ON TABLE` e `COMMENT ON COLUMN obrigatorio`
- Índice inverso `idx_produto_checklist_item_padrao (item_padrao_id)`
- Trigger `trg_produto_checklist_item_updated_at BEFORE UPDATE` reusando `public.checklist_touch_updated_at()`
- `ENABLE ROW LEVEL SECURITY`
- 4 policies (drop-if-exists + create), todas `to authenticated`:
  - SELECT — `has_role_or_higher(auth.uid(), 'team_member')`
  - INSERT — `has_role_or_higher(auth.uid(), 'sublider')` (with check)
  - UPDATE — `has_role_or_higher(auth.uid(), 'sublider')` (using + with check)
  - DELETE — `has_role_or_higher(auth.uid(), 'sublider')`
- Grants: `select, insert, update, delete` para `authenticated`; `all` para `service_role`.
- Envelope `BEGIN; ... COMMIT;`

## Pós-migration

1. Regenerar `src/integrations/supabase/types.ts` (fluxo automático do Supabase) e confirmar que `produto_checklist_item` aparece.
2. Rodar o bloco GATE (6 queries) e devolver os resultados no chat:
   - colunas/defaults, FKs+unique, RLS on + 4 policies, trigger, `count(*)=0`, e checagem de que `checklist_item_padrao` / `checklist_cliente_item` / `produto_segmento` mantêm o mesmo número de policies de antes.

## Riscos

Nenhum: DDL puro, aditivo, sem dados, sem alteração em objeto existente. Rollback = `DROP TABLE public.produto_checklist_item`.
