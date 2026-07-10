-- =====================================================================
-- RLS-P1 — Isolamento por CLUSTER dos módulos MAPA (Processos / Gargalos /
--          Melhorias / Sistemas / Justificativas)
--
-- ⚠️  RASCUNHO / ESQUELETO — NÃO APLICAR SEM REVISÃO DO EDUARDO.
--     Substitui as 49 policies `USING (true)` por checagem real de cluster.
--     Antes de aplicar: (1) resolver as DECISÕES A/B/C abaixo;
--                       (2) testar com um usuário team_member e um client.
--
-- Alvo (15 tabelas, todas hoje com USING(true) p/ authenticated):
--   Processos : documentos_processo, etapa_documentos, etapa_responsaveis,
--               etapa_sistemas
--   Gargalos  : gargalos, gargalo_processos, gargalo_responsaveis
--   Melhorias : melhoria_acoes_td, melhoria_processos, melhoria_responsaveis,
--               melhoria_sistemas
--   Sistemas  : sistemas_processo, sistema_clusters, sistema_responsaveis
--   Projeto   : projeto_justificativas
--
-- NÃO incluídas (catálogo global — leitura ampla é aceitável, decidir à parte):
--   estrutura_*, centros_custo.
--
-- Padrão de referência: migration RLS-05 Fiscal (20260709214333) —
--   helper SECURITY DEFINER + policies CRUD split.
--
-- -------------------------------------------------------------------------
-- DECISÕES PENDENTES (ajustar nos helpers abaixo antes de aplicar):
--   • DECISÃO A — linhas com cluster_id IS NULL (não atribuídas a cluster):
--        default deste rascunho = visíveis/gerenciáveis por team_member+.
--        Se NÃO for desejado, remover o ramo "_cluster_id IS NULL ...".
--   • DECISÃO B — piso de papel para ESCRITA (INSERT/UPDATE/DELETE):
--        default = team_member+. Se DELETE precisar ser sublider+/lider+
--        (ver DEC-01 "quem exclui"), criar helper separado p/ DELETE.
--   • DECISÃO C — client / timecliente devem enxergar MAPA?
--        default = NÃO (só admin + membros do cluster via
--        resolve_user_cluster_ids). Confirmar que essas roles não recebem
--        clusters por engano.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. HELPERS
-- =====================================================================

-- Visibilidade (SELECT): admin, ou membro do cluster, ou (DECISÃO A) linha sem cluster p/ team_member+
CREATE OR REPLACE FUNCTION public.mapa_cluster_visivel(_cluster_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR (_cluster_id IS NULL                                        -- DECISÃO A
          AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
      OR _cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()));
$$;

-- Gestão (INSERT/UPDATE/DELETE): visível + piso de papel (DECISÃO B)
CREATE OR REPLACE FUNCTION public.mapa_cluster_gerenciavel(_cluster_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.mapa_cluster_visivel(_cluster_id)
      AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role);  -- DECISÃO B
$$;

-- =====================================================================
-- 2. LIMPEZA — derruba TODAS as policies atuais das 15 tabelas
--    (todas são USING(true); recriamos o conjunto CRUD abaixo)
-- =====================================================================
DO $$
DECLARE
  r record;
  tbls text[] := ARRAY[
    'documentos_processo','etapa_documentos','etapa_responsaveis','etapa_sistemas',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'melhoria_acoes_td','melhoria_processos','melhoria_responsaveis','melhoria_sistemas',
    'sistemas_processo','sistema_clusters','sistema_responsaveis',
    'projeto_justificativas'
  ];
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(tbls)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Garante RLS ligado (já está em 100%, idempotente)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documentos_processo','etapa_documentos','etapa_responsaveis','etapa_sistemas',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'melhoria_acoes_td','melhoria_processos','melhoria_responsaveis','melhoria_sistemas',
    'sistemas_processo','sistema_clusters','sistema_responsaveis',
    'projeto_justificativas'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- =====================================================================
-- 3. POLICIES — GRUPO A: cluster_id é COLUNA DIRETA
--    (documentos_processo, sistemas_processo, gargalos, sistema_clusters)
-- =====================================================================

-- 3.1 documentos_processo
CREATE POLICY documentos_processo_select ON public.documentos_processo
  FOR SELECT TO authenticated USING (public.mapa_cluster_visivel(cluster_id));
CREATE POLICY documentos_processo_insert ON public.documentos_processo
  FOR INSERT TO authenticated WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY documentos_processo_update ON public.documentos_processo
  FOR UPDATE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id))
                              WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY documentos_processo_delete ON public.documentos_processo
  FOR DELETE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id));

-- 3.2 sistemas_processo
CREATE POLICY sistemas_processo_select ON public.sistemas_processo
  FOR SELECT TO authenticated USING (public.mapa_cluster_visivel(cluster_id));
CREATE POLICY sistemas_processo_insert ON public.sistemas_processo
  FOR INSERT TO authenticated WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY sistemas_processo_update ON public.sistemas_processo
  FOR UPDATE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id))
                              WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY sistemas_processo_delete ON public.sistemas_processo
  FOR DELETE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id));

-- 3.3 gargalos
CREATE POLICY gargalos_select ON public.gargalos
  FOR SELECT TO authenticated USING (public.mapa_cluster_visivel(cluster_id));
CREATE POLICY gargalos_insert ON public.gargalos
  FOR INSERT TO authenticated WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY gargalos_update ON public.gargalos
  FOR UPDATE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id))
                              WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY gargalos_delete ON public.gargalos
  FOR DELETE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id));

-- 3.4 sistema_clusters
CREATE POLICY sistema_clusters_select ON public.sistema_clusters
  FOR SELECT TO authenticated USING (public.mapa_cluster_visivel(cluster_id));
CREATE POLICY sistema_clusters_insert ON public.sistema_clusters
  FOR INSERT TO authenticated WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY sistema_clusters_update ON public.sistema_clusters
  FOR UPDATE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id))
                              WITH CHECK (public.mapa_cluster_gerenciavel(cluster_id));
CREATE POLICY sistema_clusters_delete ON public.sistema_clusters
  FOR DELETE TO authenticated USING (public.mapa_cluster_gerenciavel(cluster_id));

-- =====================================================================
-- 4. POLICIES — GRUPO B: cluster_id via FK (subquery escalar → helper)
--    Padrão: passa o cluster_id do PAI para o helper.
-- =====================================================================

-- 4.1 projeto_justificativas  (projeto_id → projects.cluster_id)
CREATE POLICY projeto_justificativas_select ON public.projeto_justificativas
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT p.cluster_id FROM public.projects p WHERE p.id = projeto_justificativas.projeto_id)));
CREATE POLICY projeto_justificativas_insert ON public.projeto_justificativas
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT p.cluster_id FROM public.projects p WHERE p.id = projeto_justificativas.projeto_id)));
CREATE POLICY projeto_justificativas_update ON public.projeto_justificativas
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT p.cluster_id FROM public.projects p WHERE p.id = projeto_justificativas.projeto_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT p.cluster_id FROM public.projects p WHERE p.id = projeto_justificativas.projeto_id)));
CREATE POLICY projeto_justificativas_delete ON public.projeto_justificativas
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT p.cluster_id FROM public.projects p WHERE p.id = projeto_justificativas.projeto_id)));

-- 4.2 gargalo_processos  (gargalo_id → gargalos.cluster_id)
CREATE POLICY gargalo_processos_select ON public.gargalo_processos
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_processos.gargalo_id)));
CREATE POLICY gargalo_processos_insert ON public.gargalo_processos
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_processos.gargalo_id)));
CREATE POLICY gargalo_processos_update ON public.gargalo_processos
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_processos.gargalo_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_processos.gargalo_id)));
CREATE POLICY gargalo_processos_delete ON public.gargalo_processos
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_processos.gargalo_id)));

-- 4.3 gargalo_responsaveis  (gargalo_id → gargalos.cluster_id)
CREATE POLICY gargalo_responsaveis_select ON public.gargalo_responsaveis
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_responsaveis.gargalo_id)));
CREATE POLICY gargalo_responsaveis_insert ON public.gargalo_responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_responsaveis.gargalo_id)));
CREATE POLICY gargalo_responsaveis_update ON public.gargalo_responsaveis
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_responsaveis.gargalo_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_responsaveis.gargalo_id)));
CREATE POLICY gargalo_responsaveis_delete ON public.gargalo_responsaveis
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT g.cluster_id FROM public.gargalos g WHERE g.id = gargalo_responsaveis.gargalo_id)));

-- 4.4 melhoria_processos  (melhoria_id → process_improvements.cluster_id)
CREATE POLICY melhoria_processos_select ON public.melhoria_processos
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_processos.melhoria_id)));
CREATE POLICY melhoria_processos_insert ON public.melhoria_processos
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_processos.melhoria_id)));
CREATE POLICY melhoria_processos_update ON public.melhoria_processos
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_processos.melhoria_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_processos.melhoria_id)));
CREATE POLICY melhoria_processos_delete ON public.melhoria_processos
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_processos.melhoria_id)));

-- 4.5 melhoria_sistemas  (melhoria_id → process_improvements.cluster_id)
CREATE POLICY melhoria_sistemas_select ON public.melhoria_sistemas
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_sistemas.melhoria_id)));
CREATE POLICY melhoria_sistemas_insert ON public.melhoria_sistemas
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_sistemas.melhoria_id)));
CREATE POLICY melhoria_sistemas_update ON public.melhoria_sistemas
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_sistemas.melhoria_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_sistemas.melhoria_id)));
CREATE POLICY melhoria_sistemas_delete ON public.melhoria_sistemas
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_sistemas.melhoria_id)));

-- 4.6 melhoria_responsaveis  (melhoria_id → process_improvements.cluster_id)
CREATE POLICY melhoria_responsaveis_select ON public.melhoria_responsaveis
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_responsaveis.melhoria_id)));
CREATE POLICY melhoria_responsaveis_insert ON public.melhoria_responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_responsaveis.melhoria_id)));
CREATE POLICY melhoria_responsaveis_update ON public.melhoria_responsaveis
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_responsaveis.melhoria_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_responsaveis.melhoria_id)));
CREATE POLICY melhoria_responsaveis_delete ON public.melhoria_responsaveis
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_responsaveis.melhoria_id)));

-- 4.7 melhoria_acoes_td  (melhoria_id → process_improvements.cluster_id)
CREATE POLICY melhoria_acoes_td_select ON public.melhoria_acoes_td
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_acoes_td.melhoria_id)));
CREATE POLICY melhoria_acoes_td_insert ON public.melhoria_acoes_td
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_acoes_td.melhoria_id)));
CREATE POLICY melhoria_acoes_td_update ON public.melhoria_acoes_td
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_acoes_td.melhoria_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_acoes_td.melhoria_id)));
CREATE POLICY melhoria_acoes_td_delete ON public.melhoria_acoes_td
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pi.cluster_id FROM public.process_improvements pi WHERE pi.id = melhoria_acoes_td.melhoria_id)));

-- 4.8 sistema_responsaveis  (sistema_id → sistemas_processo.cluster_id)
CREATE POLICY sistema_responsaveis_select ON public.sistema_responsaveis
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT s.cluster_id FROM public.sistemas_processo s WHERE s.id = sistema_responsaveis.sistema_id)));
CREATE POLICY sistema_responsaveis_insert ON public.sistema_responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT s.cluster_id FROM public.sistemas_processo s WHERE s.id = sistema_responsaveis.sistema_id)));
CREATE POLICY sistema_responsaveis_update ON public.sistema_responsaveis
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT s.cluster_id FROM public.sistemas_processo s WHERE s.id = sistema_responsaveis.sistema_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT s.cluster_id FROM public.sistemas_processo s WHERE s.id = sistema_responsaveis.sistema_id)));
CREATE POLICY sistema_responsaveis_delete ON public.sistema_responsaveis
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT s.cluster_id FROM public.sistemas_processo s WHERE s.id = sistema_responsaveis.sistema_id)));

-- =====================================================================
-- 5. POLICIES — GRUPO C: via ETAPA (etapa_id → process_stages → processes.cluster_id)
--    (etapa_documentos, etapa_responsaveis, etapa_sistemas)
--    Nota: process_stages.id é PK; a subquery escalar retorna 1 cluster.
-- =====================================================================

-- 5.1 etapa_documentos
CREATE POLICY etapa_documentos_select ON public.etapa_documentos
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_documentos.etapa_id)));
CREATE POLICY etapa_documentos_insert ON public.etapa_documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_documentos.etapa_id)));
CREATE POLICY etapa_documentos_update ON public.etapa_documentos
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_documentos.etapa_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_documentos.etapa_id)));
CREATE POLICY etapa_documentos_delete ON public.etapa_documentos
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_documentos.etapa_id)));

-- 5.2 etapa_responsaveis
CREATE POLICY etapa_responsaveis_select ON public.etapa_responsaveis
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_responsaveis.etapa_id)));
CREATE POLICY etapa_responsaveis_insert ON public.etapa_responsaveis
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_responsaveis.etapa_id)));
CREATE POLICY etapa_responsaveis_update ON public.etapa_responsaveis
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_responsaveis.etapa_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_responsaveis.etapa_id)));
CREATE POLICY etapa_responsaveis_delete ON public.etapa_responsaveis
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_responsaveis.etapa_id)));

-- 5.3 etapa_sistemas
CREATE POLICY etapa_sistemas_select ON public.etapa_sistemas
  FOR SELECT TO authenticated
  USING (public.mapa_cluster_visivel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_sistemas.etapa_id)));
CREATE POLICY etapa_sistemas_insert ON public.etapa_sistemas
  FOR INSERT TO authenticated
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_sistemas.etapa_id)));
CREATE POLICY etapa_sistemas_update ON public.etapa_sistemas
  FOR UPDATE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_sistemas.etapa_id)))
  WITH CHECK (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_sistemas.etapa_id)));
CREATE POLICY etapa_sistemas_delete ON public.etapa_sistemas
  FOR DELETE TO authenticated
  USING (public.mapa_cluster_gerenciavel(
    (SELECT pr.cluster_id FROM public.process_stages ps
       JOIN public.processes pr ON pr.id = ps.processo_id
      WHERE ps.id = etapa_sistemas.etapa_id)));

COMMIT;

-- =====================================================================
-- 6. VALIDAÇÃO PÓS-APLICAÇÃO (rodar após COMMIT, fora da migration)
--    Não deve sobrar nenhuma policy USING(true) nessas tabelas:
--
--   SELECT tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname='public'
--     AND tablename = ANY(ARRAY[
--       'documentos_processo','etapa_documentos','etapa_responsaveis','etapa_sistemas',
--       'gargalos','gargalo_processos','gargalo_responsaveis',
--       'melhoria_acoes_td','melhoria_processos','melhoria_responsaveis','melhoria_sistemas',
--       'sistemas_processo','sistema_clusters','sistema_responsaveis','projeto_justificativas'])
--     AND (qual = 'true' OR with_check = 'true');
--   -- Esperado: 0 linhas.
-- =====================================================================
