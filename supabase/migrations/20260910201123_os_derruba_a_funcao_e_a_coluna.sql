-- Último passo da OS: derruba as funções de exclusão lógica e a coluna.
--
-- Tarefa 5 de 5 da regra de 02/09/2026, subtarefa T5 (CAD-17/18).
-- docs/sprints/sprint-13/TAREFA_os-hard-delete.md
--
-- ############################################################################
-- IRREVERSÍVEL, E FORA DA SPRINT POR RECOMENDAÇÃO DA PRÓPRIA TAREFA.
-- Arquivo não termina em `.sql` de propósito: o `db:sync` não o enxerga.
--
-- Pré-requisitos, nesta ordem, e o terceiro é uma trava de verdade:
--   1. T1 a T4 da tarefa 5 rodando em produção.
--   2. O front sem os filtros `.eq('excluido', false)` de `ordem_servico`
--      (`useSaveClientTransaction.ts` e `useClientEditData.ts`).
--   3. A LIMPEZA (20260910201119_os_limpeza_dos_orfaos) JÁ TER RODADO.
--      Se sobrar linha com `excluido = true` quando a coluna cair, essas linhas
--      voltam a ser normais e RESSUSCITAM na tela. Em 10/09 eram 29 no sandbox
--      e 33 em produção. Esta migração ABORTA se encontrar alguma — ver o passo 0.
-- ############################################################################
--
-- O QUE A TAREFA NÃO PREVIU, medido em 10/09/2026 no sandbox por `pg_depend` e
-- por varredura dos corpos de função:
--
--   - As duas views `cliente_setor_regiao_atual` e `org_comments_feed` têm
--     dependência DURA da coluna (registrada em `pg_depend`). Diferente das
--     funções, elas fazem o `DROP COLUMN` FALHAR, não quebrar depois. A tarefa
--     manda "conferir"; na prática é preciso reescrever as duas.
--   - Elas vão por `CREATE OR REPLACE VIEW`, não `DROP` + `CREATE`: substituir
--     preserva os GRANT, e como nenhuma coluna do resultado muda, o replace é
--     aceito.
--   - E existem DUAS FUNÇÕES lendo `ordem_servico.excluido` que a tarefa não
--     menciona. Como o corpo só é resolvido em execução, o DROP COLUMN passa e o
--     estrago aparece depois:
--       * gerar_solicitacao_os        <- a RPC que monta a solicitação a partir
--                                        da OS; quebraria o fluxo da OSG
--       * get_ordens_by_client_name
--
-- `soft_delete_distribuicao_receita` já foi derrubada na fase 2 do representante
-- e rateio (20260910201121), porque é lá que a coluna que ela lê cai. O
-- `DROP FUNCTION IF EXISTS` abaixo fica por idempotência e vira no-op.
--
-- Idempotente: guarda por existência de coluna, `create or replace`,
-- `drop ... if exists`, `drop column if exists`.

-- ─── 0. Trava: linha marcada sobrando ressuscita quando a coluna cai ────────
DO $$
DECLARE v_sobraram integer;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'ordem_servico'
                AND column_name = 'excluido') THEN
    SELECT count(*) INTO v_sobraram FROM public.ordem_servico WHERE excluido = true;
    IF v_sobraram > 0 THEN
      RAISE EXCEPTION
        'Ainda ha % ordem(ns) de servico com excluido = true. Rode a limpeza (20260910201119_os_limpeza_dos_orfaos) ANTES: sem isso a coluna cai e essas linhas voltam a aparecer na tela.',
        v_sobraram;
    END IF;
  END IF;
END
$$;

-- ─── 1. As duas views que dependem da coluna ────────────────────────────────
-- Só sai o filtro sobre `ordem_servico`. Em `org_comments_feed`, o `excluido`
-- de `org_comments` (c e r) FICA: aquela tabela continua com exclusão lógica.

CREATE OR REPLACE VIEW public.cliente_setor_regiao_atual AS
 SELECT DISTINCT ON (id_cliente) id_cliente,
    setor_cliente,
    setor_cliente_id,
    regiao
   FROM ordem_servico os
  ORDER BY id_cliente, data_emissao DESC NULLS LAST, created_at DESC;

CREATE OR REPLACE VIEW public.org_comments_feed AS
 SELECT c.id,
    c.entity_type,
    c.entity_id,
    c.project_id,
    c.parent_id,
    c.kind,
    c.body,
    c.metadata,
    c.author_id,
    c.author_name,
    c.editado_em,
    c.created_at,
    c.updated_at,
    COALESCE(t.title, p.name) AS entity_title,
    p.name AS project_name,
    ( SELECT count(*)::integer AS count
           FROM org_comments r
          WHERE r.parent_id = c.id AND r.excluido = false) AS reply_count,
    ( SELECT count(*)::integer AS count
           FROM org_comment_attachments a
          WHERE a.comment_id = c.id) AS attachment_count,
    c.excluido,
    COALESCE(p.external_client_id, os.id_cliente) AS client_id
   FROM org_comments c
     LEFT JOIN org_projects p ON p.id = c.project_id
     LEFT JOIN ordem_servico os ON os.id = p.ordem_servico_id
     LEFT JOIN org_tasks t ON t.id = c.entity_id AND c.entity_type = 'org_task'::org_comment_entity;

-- ─── 2. As duas funções que liam ordem_servico.excluido ─────────────────────

CREATE OR REPLACE FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_solicitacao uuid;
  v_criados     integer;
BEGIN
  IF NOT public.cliente_visivel_para(_cliente_id) THEN
    RAISE EXCEPTION 'cliente fora do seu escopo' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = _ordem_servico_id
      AND os.id_cliente = _cliente_id
  ) THEN
    RAISE EXCEPTION 'ordem de servico nao encontrada para este cliente' USING ERRCODE = '42501';
  END IF;

  -- Acha o cabeçalho ativo ou cria um rascunho. Quem garante que não vão
  -- existir dois é o índice único parcial uq_solicitacao_ativa_por_cliente
  -- (EDU-21), não este IF: duas chamadas simultâneas passariam pelas duas
  -- verificações.
  SELECT s.id INTO v_solicitacao
  FROM public.solicitacao s
  WHERE s.cliente_id = _cliente_id
    AND s.status <> 'encerrada'::public.osg_solicitacao_status
  LIMIT 1;

  IF v_solicitacao IS NULL THEN
    INSERT INTO public.solicitacao (cliente_id, ordem_servico_id, status)
    VALUES (_cliente_id, _ordem_servico_id, 'rascunho'::public.osg_solicitacao_status)
    RETURNING id INTO v_solicitacao;
  END IF;

  WITH itens AS (
    SELECT pdt.item_padrao_id
    FROM public.os_produtos_contratados opc
    JOIN public.produto_documento_tipo pdt
      ON pdt.produto_segmento_id = opc.produto_segmento_id
    WHERE opc.ordem_servico_id = _ordem_servico_id
    GROUP BY pdt.item_padrao_id
  ),
  novos AS (
    INSERT INTO public.solicitacao_item (
      solicitacao_id, item_padrao_id, granularidade, grupo, ordem, status
    )
    SELECT v_solicitacao, i.item_padrao_id, t.granularidade, t.grupo, t.ordem,
           'ativo'::public.osg_solicitacao_item_status
    FROM itens i
    JOIN public.documento_tipo t ON t.id = i.item_padrao_id AND t.ativo
    WHERE NOT EXISTS (
      SELECT 1 FROM public.solicitacao_item si
      WHERE si.solicitacao_id = v_solicitacao
        AND si.item_padrao_id = i.item_padrao_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_criados FROM novos;

  RETURN v_criados;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
 RETURNS SETOF ordem_servico
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select os.*
    from ordem_servico os
   where os.id_cliente in (
           select c2.id
             from cliente c2
            where public.nome_cliente_normalizado(c2.nome)
                = public.nome_cliente_normalizado(
                    (select nome from cliente where id = p_client_id limit 1))
              and c2.ambiente = (select ambiente from cliente where id = p_client_id)
              and c2.excluido = false)
   order by os.created_at desc;
$function$;

-- ─── 3. As funções de exclusão lógica que sobraram ──────────────────────────
DROP FUNCTION IF EXISTS public.soft_delete_ordem_servico(uuid[]);
DROP FUNCTION IF EXISTS public.soft_delete_distribuicao_receita(uuid[]);

-- ─── 4. As duas policies de ordem_servico que citam a coluna ────────────────
-- `admin_full_ordem_servico_select` e `rls_ordem_servico_delete` não citam, e
-- não se mexe nelas.

DROP POLICY IF EXISTS ordem_servico_select ON public.ordem_servico;
CREATE POLICY ordem_servico_select ON public.ordem_servico
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.cliente_visivel_para(id_cliente)
    OR (cluster_id IS NOT NULL
        AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
  );

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

-- ─── 5. A coluna cai ────────────────────────────────────────────────────────
ALTER TABLE public.ordem_servico DROP COLUMN IF EXISTS excluido;
