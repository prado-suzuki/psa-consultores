# Migration — RPC `gerar_solicitacao_os`

Plano já aprovado. Registro final para aplicar em build mode.

## Migration única

`BEGIN` … `COMMIT` com:

1. `CREATE OR REPLACE FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid) RETURNS integer` — PLPGSQL, VOLATILE, SECURITY DEFINER, `SET search_path = public`. Corpo exatamente como especificado:
   - Guard 1: `cliente_visivel_para(_cliente_id)` → `42501`.
   - Guard 2: OS pertence ao cliente e `excluido = false` → `42501`.
   - CTE `itens`: agrupa por `item_padrao_id`, obrigatoriedade via `bool_or`.
   - CTE `alvos`: expande por granularidade (`pessoa_pf`, `pessoa_pj`, `bem`, `matricula_rural`, `matricula_urbana`, e fallback nível cliente). Regra rural = `COALESCE(m.tipo_bem, b.tipo_bem) = 'IR' OR IS NULL`.
   - Idempotência: `NOT EXISTS` com `IS NOT DISTINCT FROM` em `(cliente_id, item_padrao_id, pessoa_id, bem_id, matricula_id)`.
   - Insere com `origem='padrao'`, `status='solicitado'`; retorna a contagem de linhas criadas.
2. `COMMENT ON FUNCTION ...`.
3. `REVOKE ALL ... FROM public` + `GRANT EXECUTE ... TO authenticated`.

## Fora de escopo
Nenhuma alteração em tabela, coluna, policy, trigger, view, frontend, ou dados. `types.ts` é regerado automaticamente após a aplicação.

## Depois da aplicação
Executo o GATE (Partes 1, 2 e 3) com o bloco corrigido do `esperado` (usando `count(DISTINCT pci.item_padrao_id)` sobre todos os produtos da OS) e a consulta extra por produto, devolvendo:
- metadados da função;
- `esperado`, `criados_primeira_vez`, `criados_segunda_vez`, `pares_duplicados`, contagens por entidade/origem/status;
- confirmação de que `produto_checklist_item`, `checklist_cliente_item(cliente_teste)` e `os_produtos_contratados(OS_teste)` voltaram para `260 / 0 / 1`.
