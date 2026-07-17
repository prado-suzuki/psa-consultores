## Objetivo
Consertar cadastro de cliente quebrado desde 14/07 (trigger deferido `trg_cliente_tem_cluster` explode no commit porque front grava `cliente` e `cliente_clusters` em transações PostgREST separadas). Solução: RPC atômica SECURITY DEFINER que insere cliente + vínculos de cluster na mesma transação e devolve a linha completa do cliente. Não alterar policies nem o trigger. **CSV fora de escopo neste PR.**

## Passo A — Migration: RPC atômica

Novo `supabase/migrations/<timestamp>_criar_cliente_com_clusters.sql`:

```sql
CREATE OR REPLACE FUNCTION public.criar_cliente_com_clusters(
  p_cliente     jsonb,
  p_cluster_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cliente%ROWTYPE;
  v_cid uuid;
BEGIN
  -- Autorização (espelha rls_cliente_insert)
  IF NOT public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para cadastrar cliente' USING ERRCODE = '42501';
  END IF;

  -- Validação: pelo menos 1 cluster
  IF p_cluster_ids IS NULL OR array_length(p_cluster_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos 1 cluster' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.cliente (
    nome, categoria, ativo, fixo, telefone, municipio, uf, observacoes, ambiente
  ) VALUES (
    btrim(p_cliente->>'nome'),
    NULLIF(p_cliente->>'categoria',''),
    COALESCE((p_cliente->>'ativo')::boolean, true),
    NULLIF(p_cliente->>'fixo',''),
    NULLIF(p_cliente->>'telefone',''),
    NULLIF(p_cliente->>'municipio',''),
    NULLIF(p_cliente->>'uf',''),
    NULLIF(p_cliente->>'observacoes',''),
    COALESCE(NULLIF(p_cliente->>'ambiente',''), 'prod')
  )
  RETURNING * INTO v_row;

  FOREACH v_cid IN ARRAY p_cluster_ids LOOP
    INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
    VALUES (v_row.id, v_cid);
  END LOOP;

  -- Mesma transação → trg_cliente_tem_cluster (DEFERRED) valida no commit e passa.
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_cliente_com_clusters(jsonb, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.criar_cliente_com_clusters(jsonb, uuid[]) TO authenticated;
```

Não altera policies, trigger nem tabelas.

## Passo B1 — Front, ramo de CRIAÇÃO em `src/hooks/useSaveClientTransaction.ts`

No bloco `else` de `isEditing` (~L166+), substituir o `supabase.from('cliente').insert(...).select().single()` por:

```ts
const { data: novo, error } = await (supabase.rpc as any)(
  'criar_cliente_com_clusters',
  { p_cliente: clientPayload, p_cluster_ids: clusterIds }
);
if (error) throw error;
clienteId = (novo as any).id;
createdClienteId = clienteId;
clienteResult = novo; // linha real: id, created_at, updated_at, nome normalizado
```

Motivo do `RETURNS jsonb` com a linha inteira: a RPC executa SECURITY DEFINER e devolve `created_at`/`updated_at` gerados pelo banco e `nome` já normalizado pelo trigger `normalize_name_title_case`. Um `SELECT` pós-insert bateria em `cliente_select_scoped` (cluster-scoped) e voltaria vazio para criadores fora dos clusters atribuídos.

Manter intacto no mesmo bloco: pré-validação, check de nome duplicado (L135), inserts-filhos (contribuinte/representante/OS) usando `clienteId`, `logAction`, `syncCadastrosToDW`, rollback no `catch`.

## Passo B2 — Guard no bloco de reconciliação de clusters (L541–L560)

Envolver todo o bloco `--- Persist cliente_clusters (incremental upsert) ---` em `if (isEditing) { ... }`. Justificativa: `cliente_clusters` tem `UNIQUE (cliente_id, cluster_id)` (índice `unique_cliente_cluster` confirmado no pré-voo — o pré-voo original do prompt estava desatualizado), então rodar a reconciliação após a criação daria erro de conflict. Ramo de edição segue idêntico.

## Passo D — Validação

1. Regenerar `src/integrations/supabase/types.ts` (aparece a nova RPC).
2. GATE manual no preview:
   - Sublíder cadastra cliente com 2 clusters → sucesso; `cliente_clusters` com **exatamente 2 linhas**; `clienteResult.created_at`/`updated_at` **preenchidos** (não `undefined`).
   - Sublíder envia `p_cluster_ids = []` → erro claro "Selecione ao menos 1 cluster".
   - Edição de cliente existente com troca de clusters → funciona (bloco B2 continua ativo no ramo `isEditing`).
   - `team_member` puro chamando a RPC → 42501 "Sem permissão para cadastrar cliente".

## Fora de escopo (explícito)
- **CSV / `src/pages/equipe/dev/GerenciarDados.tsx` não é tocado** — será tratado em PR separado via abordagem C1.
- Não alterar `rls_cliente_insert` nem `cliente_select_scoped`.
- Não afrouxar/remover `trg_cliente_tem_cluster`.
- Não tocar no ramo de EDIÇÃO além do guard B2.