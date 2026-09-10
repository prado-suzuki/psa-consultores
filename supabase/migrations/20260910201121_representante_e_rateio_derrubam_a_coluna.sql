-- Fase 2 de representante e rateio: apaga as linhas marcadas e derruba a coluna.
--
-- Tarefa 4 de 5 da regra de 02/09/2026, subtarefa T3 (CAD-10).
-- docs/sprints/sprint-13/TAREFA_representante-e-rateio-hard-delete.md
--
-- ############################################################################
-- IRREVERSÍVEL, E FORA DA SPRINT POR RECOMENDAÇÃO DA PRÓPRIA TAREFA.
-- Por isso o arquivo NÃO termina em `.sql`: o `db:sync` filtra por extensão e
-- não a enxerga. Renomear é uma decisão, não um passo.
--
-- Pré-requisitos, nesta ordem:
--   1. A fase 1 (20260910160000) rodando em produção, tranquila.
--   2. O front já apagando de vez (feito) E sem os filtros `.eq('excluido',
--      false)` dessas duas tabelas — ver "O FRONT PRECISA MUDAR JUNTO", abaixo.
--   3. A Patricia confirmando o descarte das linhas.
--   4. Refazer a contagem. Ela anda: a tarefa registrava 9 e 189; em 10/09 o
--      sandbox tinha 11 e 187 e produção 10 e 191.
-- ############################################################################
--
-- O QUE A TAREFA NÃO PREVIU, e foi medido em 10/09/2026 por `pg_depend` e por
-- varredura dos corpos de função no sandbox:
--
-- A tarefa manda "reemitir as permissões (SELECT, UPDATE e DELETE das duas
-- tabelas)" e "conferir as duas views". As duas afirmações estão desatualizadas:
--
--   - O DELETE das duas JÁ NÃO cita `excluido` — a fase 1 tirou. São 5 policies
--     a reemitir, não 6: 3 de representante e 2 de rateio.
--   - As views `cliente_setor_regiao_atual` e `org_comments_feed` dependem de
--     `ordem_servico.excluido`, NÃO de representante nem de rateio. Elas não
--     bloqueiam esta migração; bloqueiam a de OS (CAD-17/18).
--   - E existem TRÊS FUNÇÕES que leem `representante.excluido` e que a tarefa
--     não menciona. Sem recriá-las, elas continuam existindo e quebram na
--     primeira chamada, porque plpgsql/sql só resolve o corpo em tempo de
--     execução — o DROP COLUMN passa e o estrago aparece depois:
--       * resolve_user_cliente_id      <- a mais grave: é chamada DE DENTRO da
--                                         policy `cliente_select_scoped`. Se
--                                         quebrar, a leitura de cliente do
--                                         portal quebra junto.
--       * destinatarios_cliente        <- destinatários de notificação
--       * get_clusters_do_cliente_atual
--
-- Nenhuma outra função lê `distribuicao_receita.excluido`, tirando a
-- `soft_delete_distribuicao_receita`, que esta migração derruba (ver abaixo).
--
-- DESVIO DELIBERADO: a tarefa 5 (T5) é que derrubaria
-- `soft_delete_distribuicao_receita`. Ela é derrubada AQUI porque esta migração
-- tira a coluna que o corpo dela lê — deixá-la de pé seria deixar função quebrada
-- no schema à espera de outra migração. Ela já está sem chamador desde a fase 1.
-- O `DROP FUNCTION IF EXISTS` que continua na tarefa 5 vira no-op.
--
-- O FRONT PRECISA MUDAR JUNTO, no mesmo lote:
--   `useSaveClientTransaction.ts` e `useClientEditData.ts` ainda filtram
--   `.eq('excluido', false)` em representante e rateio. Depois desta migração
--   esses filtros passam a apontar para coluna inexistente e a query quebra.
--   Eles foram mantidos de propósito na fase 1 (ver D3 do handoff): as policies
--   `admin_full_*` não filtram `excluido`, então removê-los antes faria o admin
--   passar a ver as linhas marcadas.
--
-- Idempotente: DELETE guardado por existência da coluna, `drop policy if exists`
-- + `create`, `create or replace function`, `drop column if exists`.

-- ─── 1. As linhas marcadas saem, enquanto a coluna ainda existe ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'representante'
                AND column_name = 'excluido') THEN
    DELETE FROM public.representante WHERE excluido = true;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'distribuicao_receita'
                AND column_name = 'excluido') THEN
    DELETE FROM public.distribuicao_receita WHERE excluido = true;
  END IF;
END
$$;

-- ─── 2. As três funções que liam representante.excluido ─────────────────────
-- Só sai o `r.excluido`. O `c.excluido` (cliente) FICA: cliente continua com
-- exclusão lógica, por decisão de 02/09.

CREATE OR REPLACE FUNCTION public.resolve_user_cliente_id(_uid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT c.id)
  INTO ids
  FROM public.representante r
  JOIN public.cliente c ON c.id = r.id_cliente AND c.excluido = false
  WHERE r.user_id = _uid;

  IF ids IS NULL OR array_length(ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  IF array_length(ids, 1) > 1 THEN
    RAISE EXCEPTION
      'resolve_user_cliente_id: usuario % vinculado a % id_cliente distintos (dado duplicado)',
      _uid, array_length(ids, 1);
  END IF;
  RETURN ids[1];
END;
$function$;

CREATE OR REPLACE FUNCTION public.destinatarios_cliente(_cliente_id uuid)
 RETURNS TABLE(user_id uuid, nome text, email text, telefone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct r.user_id, r.nome, r.email, r.telefone
    from public.representante r
    join public.cliente c on c.id = r.id_cliente and c.excluido = false
   where r.id_cliente = _cliente_id
     and r.user_id is not null;
$function$;

CREATE OR REPLACE FUNCTION public.get_clusters_do_cliente_atual()
 RETURNS TABLE(cliente_id uuid, cluster_id uuid, cluster_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id AS cliente_id,
         ec.id AS cluster_id,
         ec.name AS cluster_name
  FROM public.representante r
  JOIN public.cliente c
    ON c.id = r.id_cliente
   AND c.excluido = false
  JOIN public.cliente_clusters cc
    ON cc.cliente_id = c.id
  JOIN public.estrutura_clusters ec
    ON ec.id = cc.cluster_id
   AND ec.is_active = true
  WHERE auth.uid() IS NOT NULL
    AND r.user_id = auth.uid()
  ORDER BY ec.id;
$function$;

-- A função de exclusão lógica do rateio lê a coluna que cai aqui, e já está sem
-- chamador desde a fase 1. Ver "DESVIO DELIBERADO" no cabeçalho.
DROP FUNCTION IF EXISTS public.soft_delete_distribuicao_receita(uuid[]);

-- ─── 3. As cinco policies que citam a coluna ────────────────────────────────
DROP POLICY IF EXISTS "Clients can read their own representante" ON public.representante;
CREATE POLICY "Clients can read their own representante" ON public.representante
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS team_select_representante ON public.representante;
CREATE POLICY team_select_representante ON public.representante
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS distribuicao_receita_select ON public.distribuicao_receita;
CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.ordem_servico os
       WHERE os.id = distribuicao_receita.id_ordem_servico
         AND public.cliente_visivel_para(os.id_cliente)
    )
  );

DROP POLICY IF EXISTS rls_distribuicao_receita_update ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_update ON public.distribuicao_receita
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

-- ─── 4. A coluna cai ────────────────────────────────────────────────────────
ALTER TABLE public.representante        DROP COLUMN IF EXISTS excluido;
ALTER TABLE public.distribuicao_receita DROP COLUMN IF EXISTS excluido;
