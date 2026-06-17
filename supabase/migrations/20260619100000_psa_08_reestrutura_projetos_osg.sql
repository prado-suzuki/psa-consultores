-- ============================================================================
-- PSA 08 — Reestruturação de Projetos OSG (definição da coordenadora)
-- ----------------------------------------------------------------------------
-- Reagrupa os 33 processos do cluster PSA OSG, hoje distribuídos em 6 projetos
-- (P1..P6), nos 3 projetos da nova estrutura:
--
--   P1 - Contratos                  (19) — elaboração/revisão de contratos e instrumentos
--   P2 - Gestão                     (6)  — ciclo de gestão do projeto OSG (ex-P6, idêntico)
--   P3 - Planejamento & Diagnóstico (8)  — diagnósticos/planejamentos que antecedem o contrato
--
-- Estratégia (decidida com o solicitante):
--   • "Contratos" já foi criado pela coordenadora como "P10 - Contratos"
--     (cluster_id = NULL → invisível no MAPA). Aqui ele é ENRIQUECIDO, não recriado.
--   • "Gestão" reaproveita o ex-P6 (já contém exatamente os 6 processos P6.*).
--   • "Planejamento & Diagnóstico" reaproveita o ex-P1 (repropósito + nova descrição).
--   • Os ex-P2, P3, P4, P5 ficam vazios após o re-aponte e são removidos.
--
-- GARANTIAS (verificadas + asseguradas por asserções abaixo):
--   • Nenhum outro cluster é tocado — tudo escopado por id/código OSG.
--   • Nenhuma etapa é tocada — process_stages liga-se a process_id; nenhum
--     processo é deletado nem tem o id alterado. A contagem de etapas OSG é
--     conferida antes/depois (deve permanecer idêntica).
--   • Processos: apenas project_id e order_index mudam. Nenhum outro campo
--     (name, code, cluster_id, métricas, etc.) é alterado.
--   • Daily/Sprint não quebram: sprints/org_tasks/process_improvements não
--     referenciam nenhum projeto OSG (verificado); a migração re-checa e aborta
--     se houver qualquer referência remanescente nos 4 projetos a remover.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_osg           uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';
  -- projetos reaproveitados
  v_contratos     uuid := '70c8b198-ff14-400a-a78f-659c41897a17'; -- ex "P10 - Contratos" (cluster NULL)
  v_gestao        uuid := 'a406e6bc-9a51-a0f7-daf7-eede537dd4b9'; -- ex "P6 - Gestão de Projeto OSG"
  v_planejamento  uuid := 'cf38325f-4e17-6a7d-55ff-c32ee5e68419'; -- ex "P1 - Organização Patrimonial"
  -- projetos a remover (vazios após o re-aponte)
  v_del           uuid[] := ARRAY[
    '3a94562c-8626-a778-1b9d-1f26ae18f4dc', -- ex "P2 - Organização Societária"
    '60c89016-f9fd-131a-6f4c-05d2a74cc327', -- ex "P3 - Instrumentos Agrários"
    '60900644-df65-c5c4-d2dd-01f9bf7743b8', -- ex "P4 - Sucessão"
    '48080f2f-9fec-2dff-bb43-33f0aa57114b'  -- ex "P5 - Governança"
  ]::uuid[];
  v_proc_total    int;
  v_etapas_antes  int;
  v_etapas_depois int;
  v_orfaos        int;
  v_refs          int;
BEGIN
  -- 0. PRÉ-CONDIÇÕES --------------------------------------------------------

  -- 0.1 Existem exatamente 33 processos no cluster OSG.
  SELECT count(*) INTO v_proc_total FROM public.processes WHERE cluster_id = v_osg;
  IF v_proc_total <> 33 THEN
    RAISE EXCEPTION 'Pré-condição falhou: esperados 33 processos OSG, encontrados %.', v_proc_total;
  END IF;

  -- 0.2 Os 3 projetos reaproveitados existem (Gestão/Planejamento já no OSG; Contratos pode estar NULL).
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_contratos)
     OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_gestao        AND cluster_id = v_osg)
     OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_planejamento  AND cluster_id = v_osg) THEN
    RAISE EXCEPTION 'Pré-condição falhou: projeto base ausente (Contratos/Gestão/Planejamento).';
  END IF;

  -- 0.3 Snapshot de etapas OSG (NÃO devem ser tocadas por esta migração).
  SELECT count(*) INTO v_etapas_antes
  FROM      public.process_stages s
  JOIN      public.processes      p  ON  p.id = s.process_id
  WHERE     p.cluster_id = v_osg;

  -- 0.4 Os 4 projetos a remover não podem estar referenciados por sprints/tasks/etc.
  --     (FKs RESTRICT/SET NULL — fonte de quebra de Daily/Sprint). Aborta se houver.
  SELECT
      (SELECT count(*) FROM public.sprints                 WHERE project_id = ANY(v_del))
    + (SELECT count(*) FROM public.process_improvements    WHERE project_id = ANY(v_del))
    + (SELECT count(*) FROM public.process_scenarios       WHERE project_id = ANY(v_del))
    + (SELECT count(*) FROM public.org_tasks               WHERE project_id = ANY(v_del))
    + (SELECT count(*) FROM public.client_visible_projects WHERE project_id = ANY(v_del))
    INTO v_refs;
  IF v_refs <> 0 THEN
    RAISE EXCEPTION 'Pré-condição falhou: % referência(s) a projetos a remover (sprint/task/etc.) — abortando.', v_refs;
  END IF;

  -- 1. ENRIQUECER "Contratos" (ex P10 — tinha cluster_id NULL) --------------
  UPDATE public.projects SET
    name          = 'P1 - Contratos',
    cluster_id    = v_osg,
    status        = 'Mapeamento',
    area          = 'OSG',
    equipe_id     = NULL,
    project_front = NULL,
    description   = 'Pilar de elaboração e revisão de todos os contratos e instrumentos jurídicos do OSG. '
                 || 'Concentra a produção documental do projeto: digitação de matrícula; constituição societária '
                 || '(Agro, Participações e holdings individuais); alterações contratuais de integralização, cessão '
                 || 'de cotas, imóvel adicional (2º momento), reorganização societária (cisão/fusão/incorporação) e '
                 || 'exigência cartorial; instrumentos agrários (distrato de arrendamento, parceria rural, composse '
                 || 'e encerramento de safra); doação com AC reflexo; e os instrumentos de governança (acordo de '
                 || 'quotistas, protocolo de remuneração, matriz de alçadas, regimento do conselho e AC reflexo). '
                 || 'Reúne os 19 processos de elaboração/revisão antes dispersos entre Organização Patrimonial, '
                 || 'Societária, Instrumentos Agrários, Sucessão e Governança.'
  WHERE id = v_contratos;

  -- 2. RENOMEAR "Gestão" (ex P6) — já contém exatamente os 6 processos P6.* --
  UPDATE public.projects SET name = 'P2 - Gestão' WHERE id = v_gestao;

  -- 3. REPROPÓSITO "Planejamento & Diagnóstico" (ex P1) ---------------------
  UPDATE public.projects SET
    name        = 'P3 - Planejamento & Diagnóstico',
    description = 'Pilar de diagnóstico e planejamento que antecede a produção dos contratos. Reúne o DP inicial '
               || 'e suas atualizações, a qualificação dos sócios, o planejamento tributário rural e de ITCMD, a '
               || 'apresentação final de sucessão, o testamento (alternativa à doação) e o diagnóstico de governança '
               || '— as análises estruturantes que definem a estratégia e alimentam os instrumentos elaborados no '
               || 'projeto Contratos.'
  WHERE id = v_planejamento;

  -- Justificativas antigas (de "Organização Patrimonial") não se aplicam ao novo pilar.
  DELETE FROM public.projeto_justificativas WHERE projeto_id = v_planejamento;

  -- 4. RE-APONTAR PROCESSOS — somente project_id e order_index --------------
  --    (identificados por `code`, estável; nenhum outro campo é alterado).
  UPDATE public.processes AS p
  SET    project_id  = m.proj,
         order_index = m.ord
  FROM (VALUES
    -- Projeto 1 — Contratos (19)
    ('PROC-GERAL-004', v_contratos,     1),  -- P1.03 Digitação de Matrícula
    ('PROC-GERAL-006', v_contratos,     2),  -- P2.01 Constituição da Agro
    ('PROC-GERAL-007', v_contratos,     3),  -- P2.02 Constituição da Participações
    ('PROC-GERAL-008', v_contratos,     4),  -- P2.03 Holdings Individuais
    ('PROC-GERAL-009', v_contratos,     5),  -- P2.04 AC Integralização Agro
    ('PROC-GERAL-010', v_contratos,     6),  -- P2.05 AC Cessão de Cotas
    ('PROC-GERAL-011', v_contratos,     7),  -- P2.06 AC Imóvel Adicional
    ('PROC-GERAL-012', v_contratos,     8),  -- P2.07 Reorganização Societária
    ('PROC-GERAL-013', v_contratos,     9),  -- P2.08 AC por Exigência Cartorial
    ('PROC-GERAL-015', v_contratos,    10),  -- P3.02 Distrato de Arrendamento
    ('PROC-GERAL-016', v_contratos,    11),  -- P3.03 Contrato de Parceria Rural
    ('PROC-GERAL-017', v_contratos,    12),  -- P3.04 Contrato de Composse
    ('PROC-GERAL-018', v_contratos,    13),  -- P3.05 Termo de Encerramento de Safra
    ('PROC-GERAL-021', v_contratos,    14),  -- P4.03 Doação + AC Reflexo
    ('PROC-GERAL-024', v_contratos,    15),  -- P5.02 Acordo de Quotistas
    ('PROC-GERAL-025', v_contratos,    16),  -- P5.03 Protocolo de Remuneração
    ('PROC-GERAL-026', v_contratos,    17),  -- P5.04 Matriz de Alçadas
    ('PROC-GERAL-027', v_contratos,    18),  -- P5.05 Regimento Interno do Conselho
    ('PROC-GERAL-028', v_contratos,    19),  -- P5.06 AC Reflexo da Governança
    -- Projeto 2 — Gestão (6)
    ('PROC-GERAL-029', v_gestao,        1),  -- P6.01 Solicitações Preliminares
    ('PROC-GERAL-030', v_gestao,        2),  -- P6.02 Kickoff / Entrevista Preliminar
    ('PROC-GERAL-031', v_gestao,        3),  -- P6.03 Apresentação do Projeto
    ('PROC-GERAL-032', v_gestao,        4),  -- P6.04 Formalização do Projeto
    ('PROC-GERAL-033', v_gestao,        5),  -- P6.05 Acompanhamento
    ('PROC-GERAL-034', v_gestao,        6),  -- P6.06 Finalização do Projeto
    -- Projeto 3 — Planejamento & Diagnóstico (8)
    ('PROC-GERAL-002', v_planejamento,  1),  -- P1.01 DP Inicial
    ('PROC-GERAL-003', v_planejamento,  2),  -- P1.02 Atualização do DP
    ('PROC-GERAL-005', v_planejamento,  3),  -- P1.04 Qualificação dos Sócios
    ('PROC-GERAL-014', v_planejamento,  4),  -- P3.01 Planejamento Tributário Rural
    ('PROC-GERAL-019', v_planejamento,  5),  -- P4.01 Planejamento Tributário ITCMD
    ('PROC-GERAL-020', v_planejamento,  6),  -- P4.02 Apresentação Final de Sucessão
    ('PROC-GERAL-022', v_planejamento,  7),  -- P4.04 Testamento
    ('PROC-GERAL-023', v_planejamento,  8)   -- P5.01 Diagnóstico de Governança
  ) AS m(code, proj, ord)
  WHERE p.code = m.code
    AND p.cluster_id = v_osg;   -- trava de segurança: jamais tocar processo de outro cluster

  -- 5. REMOVER os projetos antigos, agora vazios ----------------------------
  --    (processes.project_id já foi re-apontado; só resta CASCADE em
  --     projeto_justificativas, que remove justificativas obsoletas.)
  DELETE FROM public.projects WHERE id = ANY(v_del);

  -- 6. PÓS-VALIDAÇÃO --------------------------------------------------------

  -- 6.1 Distribuição final 19 / 6 / 8.
  IF (SELECT count(*) FROM public.processes WHERE project_id = v_contratos)    <> 19
     OR (SELECT count(*) FROM public.processes WHERE project_id = v_gestao)       <> 6
     OR (SELECT count(*) FROM public.processes WHERE project_id = v_planejamento) <> 8 THEN
    RAISE EXCEPTION 'Pós-validação falhou: distribuição final ≠ 19/6/8.';
  END IF;

  -- 6.2 Nenhum processo OSG órfão (todos sob um dos 3 projetos).
  SELECT count(*) INTO v_orfaos
  FROM   public.processes
  WHERE  cluster_id = v_osg
    AND  (project_id IS NULL OR project_id NOT IN (v_contratos, v_gestao, v_planejamento));
  IF v_orfaos <> 0 THEN
    RAISE EXCEPTION 'Pós-validação falhou: % processo(s) OSG órfão(s).', v_orfaos;
  END IF;

  -- 6.3 Etapas intactas (contagem idêntica ao snapshot).
  SELECT count(*) INTO v_etapas_depois
  FROM      public.process_stages s
  JOIN      public.processes      p  ON  p.id = s.process_id
  WHERE     p.cluster_id = v_osg;
  IF v_etapas_depois <> v_etapas_antes THEN
    RAISE EXCEPTION 'Pós-validação falhou: etapas alteradas (antes=%, depois=%).', v_etapas_antes, v_etapas_depois;
  END IF;

  -- 6.4 Projetos antigos removidos.
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = ANY(v_del)) THEN
    RAISE EXCEPTION 'Pós-validação falhou: projetos antigos não removidos.';
  END IF;

  RAISE NOTICE 'OSG reestruturado OK — Contratos=19, Gestão=6, Planejamento=8; etapas intactas=%.', v_etapas_depois;
END $$;

COMMIT;
