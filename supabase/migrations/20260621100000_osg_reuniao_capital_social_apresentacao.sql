-- ============================================================================
-- OSG — Ajustes de estrutura decididos na reunião de 18/06/2026
-- ----------------------------------------------------------------------------
-- Aplica as decisões da reunião (docs/reuniao/*) que AINDA não estavam no banco.
-- A reorganização de projetos (Reorg. Societária, Sucessão, Governança e
-- Apresentações já como projetos próprios; doação já na Sucessão; ordem do
-- P2-Contratos; remoção da revisão sênior da Qualificação) JÁ havia sido feita
-- em rodada anterior. Restavam três pontos:
--
--   1) Capital Social → PROCESSO separado (era a 3ª etapa da Qualificação dos
--      Sócios). A etapa é MOVIDA (UPDATE process_id), preservando as junções
--      etapa_sistemas / etapa_responsaveis (que apontam para etapa_id).
--      A Qualificação passa a ter só "Coletar documentos" + "Montar WP".
--
--   2) "Apresentação Inicial" → novo processo no P5-Apresentações. Consolida e
--      apresenta a estrutura ao cliente (após o Planejamento Tributário Rural);
--      encerra a produção de contratos.
--
--   3) "Relatório de Itens Faltantes do DP" (dor forte da equipe) → registrado
--      como MELHORIA (process_improvement) vinculada ao DP Inicial.
--
--   (+) Consistência: projetos OSG P3/P5/P6 com area NULL recebem area='OSG'.
--
-- VALIDAÇÕES DE CAMPO (cruzadas com o front do MAPA + schema):
--   • processes.frequency ∈ {Diária,Semanal,Quinzenal,Mensal,Trimestral,Anual}
--   • processes.evaluation_status ∈ {Não avaliado,Em avaliação,Avaliado}
--   • processes.complexity_level ∈ {Baixa,Média,Alta,NULL}
--   • process_stages.execution ∈ {manual,semi_automatica,automatica}
--   • process_stages.scenario  ∈ {AS-IS,TO-BE}; rework_rate/error_rate ∈ [0,1]
--   • process_improvements.improvement_status ∈
--        {Não iniciado,Em progresso,Concluído,Backlog}  (usado: 'Não iniciado')
--   • melhoria↔processo via tabela de junção melhoria_processos
--
-- SEGURANÇA: tudo escopado ao cluster OSG por id/code. Idempotente — reexecução
-- é no-op (guardas por NOT EXISTS / IS NULL). Nenhum outro cluster é tocado.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_osg            uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';
  v_contratos      uuid := '70c8b198-ff14-400a-a78f-659c41897a17'; -- P2 - Contratos
  v_apresentacoes  uuid := '29580f4a-39d8-46db-9748-6d464bcfb832'; -- P5 - Apresentações
  v_sucessao       uuid := '4b217513-1993-4ae5-a0ec-50137deb930e'; -- P3 - Sucessão
  v_governanca     uuid := 'cf38325f-4e17-6a7d-55ff-c32ee5e68419'; -- P4 - Governança
  v_reorg          uuid := '6b6f309c-cd6c-487e-b81b-ca8124967052'; -- P6 - Reorganização Societária
  v_qualificacao   uuid := '588f3ee5-da46-489f-e45f-e43ca1d55259'; -- proc Qualificação dos Sócios
  v_dp_inicial     uuid := '6e6ee166-8b5d-0168-9462-5f31b1074b20'; -- proc DP Inicial
  v_etapa_capital  uuid := '882597ca-7c1d-a727-22ce-e74c77a73994'; -- etapa "Montar Planilha de Capital Social"
  -- ids fixos das novas linhas (idempotência / rastreabilidade)
  v_proc_capital   uuid := '0c5ca100-0000-4000-8000-000000000035';
  v_proc_apres     uuid := '0a17e100-0000-4000-8000-000000000036';
  v_etapa_apres    uuid := '0a17e100-0000-4000-8000-000000000136';
  v_mel_relatorio  uuid := '0d9fa100-0000-4000-8000-000000000037';
  v_mp_relatorio   uuid := '0d9fa100-0000-4000-8000-000000000137';
  v_n              int;
BEGIN
  -- 0. PRÉ-CONDIÇÕES --------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_contratos     AND cluster_id = v_osg)
     OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_apresentacoes) THEN
    RAISE EXCEPTION 'Pré-condição falhou: projetos base OSG (Contratos/Apresentações) ausentes.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE id = v_qualificacao AND cluster_id = v_osg)
     OR NOT EXISTS (SELECT 1 FROM public.processes WHERE id = v_dp_inicial   AND cluster_id = v_osg) THEN
    RAISE EXCEPTION 'Pré-condição falhou: processos base (Qualificação/DP) ausentes no OSG.';
  END IF;

  -- ========================================================================
  -- 1. CAPITAL SOCIAL → PROCESSO SEPARADO
  -- ========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = 'PROC-GERAL-035') THEN

    -- 1.1 Abre o slot de ordenação logo após "Digitação de Matrícula" (order 2):
    --     desloca +1 todos os processos do Contratos com order_index >= 3.
    UPDATE public.processes
       SET order_index = order_index + 1
     WHERE project_id = v_contratos
       AND cluster_id = v_osg
       AND order_index >= 3;

    -- 1.2 Cria o processo "Planilha de Capital Social".
    INSERT INTO public.processes
      (id, name, description, project_id, cluster_id, code, frequency,
       stage, priority, evaluation_status, complexity_level,
       people_involved, order_index, evaluation_period_days)
    VALUES
      (v_proc_capital,
       'Planilha de Capital Social',
       'Elaboração da planilha de capital social — composição e integralização do '
       || 'capital de cada sócio, base para os atos societários. Desmembrado da '
       || 'Qualificação dos Sócios (que passa a tratar apenas da coleta de documentos '
       || 'pessoais e da montagem do WP), conforme decisão da reunião de 18/06/2026.',
       v_contratos, v_osg, 'PROC-GERAL-035', 'Quinzenal',
       'discovery', 'medium', 'Não avaliado', 'Baixa',
       1, 3, 30);

    -- 1.3 MOVE a etapa "Montar Planilha de Capital Social" da Qualificação para o
    --     novo processo (preserva etapa_sistemas / etapa_responsaveis por etapa_id).
    UPDATE public.process_stages
       SET process_id = v_proc_capital,
           stage_order = 1
     WHERE id = v_etapa_capital
       AND process_id = v_qualificacao;

    RAISE NOTICE '1) Capital Social: processo PROC-GERAL-035 criado e etapa movida.';
  ELSE
    RAISE NOTICE '1) Capital Social: já existe (PROC-GERAL-035) — pulado.';
  END IF;

  -- ========================================================================
  -- 2. APRESENTAÇÃO INICIAL → NOVO PROCESSO NO P5-APRESENTAÇÕES
  -- ========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = 'PROC-GERAL-036') THEN

    INSERT INTO public.processes
      (id, name, description, project_id, cluster_id, code, frequency,
       stage, priority, evaluation_status, complexity_level,
       people_involved, order_index, evaluation_period_days)
    VALUES
      (v_proc_apres,
       'Apresentação Inicial',
       'Consolidação e apresentação ao cliente da estrutura societária e patrimonial '
       || 'sugerida, reunindo os dados do DP e do Planejamento Tributário Rural, para '
       || 'aprovação. Marca o encerramento da produção de contratos: aprovada a '
       || 'estrutura, a equipe parte para o registro dos instrumentos.',
       v_apresentacoes, v_osg, 'PROC-GERAL-036', 'Quinzenal',
       'discovery', 'medium', 'Não avaliado', 'Média',
       1, 0, 30);

    -- Etapa única inicial (responsáveis/horas serão preenchidos depois via formulário).
    INSERT INTO public.process_stages
      (id, process_id, stage_order, name, description, scenario, execution,
       volume_per_process, error_rate, rework_rate,
       inputs, outputs, systems, related_projects)
    VALUES
      (v_etapa_apres, v_proc_apres, 1,
       'Consolidar e apresentar estrutura ao cliente',
       'Monta a apresentação com a estrutura sugerida (DP + planejamento tributário) '
       || 'e apresenta ao cliente para aprovação.',
       'AS-IS', 'manual',
       1, 0, 0,
       '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);

    RAISE NOTICE '2) Apresentação Inicial: processo PROC-GERAL-036 criado no P5.';
  ELSE
    RAISE NOTICE '2) Apresentação Inicial: já existe (PROC-GERAL-036) — pulado.';
  END IF;

  -- ========================================================================
  -- 3. RELATÓRIO DE ITENS FALTANTES DO DP → MELHORIA (vinculada ao DP Inicial)
  -- ========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.process_improvements WHERE id = v_mel_relatorio) THEN

    INSERT INTO public.process_improvements
      (id, process_id, cluster_id, improvement_description, improvement_status,
       evaluation_status, evaluation_period_days,
       system_savings_monthly, build_vs_buy_savings, other_savings_monthly)
    VALUES
      (v_mel_relatorio, v_dp_inicial, v_osg,
       'Relatório de Itens Faltantes do DP', 'Não iniciado',
       'Não avaliado', 30, 0, 0, 0);

    INSERT INTO public.melhoria_processos (id, melhoria_id, processo_id)
    VALUES (v_mp_relatorio, v_mel_relatorio, v_dp_inicial)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '3) Melhoria "Relatório de Itens Faltantes do DP" criada e vinculada ao DP.';
  ELSE
    RAISE NOTICE '3) Melhoria do relatório do DP: já existe — pulada.';
  END IF;

  -- ========================================================================
  -- 4. CONSISTÊNCIA — area='OSG' nos projetos que estavam com area NULL
  -- ========================================================================
  UPDATE public.projects
     SET area = 'OSG'
   WHERE id IN (v_sucessao, v_apresentacoes, v_reorg)
     AND cluster_id = v_osg
     AND area IS NULL;

  -- ========================================================================
  -- 5. PÓS-VALIDAÇÃO (idempotente — vale após 1ª execução e em reexecuções)
  -- ========================================================================
  -- 5.1 Qualificação dos Sócios deve ter exatamente 2 etapas AS-IS.
  SELECT count(*) INTO v_n
  FROM public.process_stages
  WHERE process_id = v_qualificacao AND scenario = 'AS-IS';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'Pós-validação: Qualificação deveria ter 2 etapas, tem %.', v_n;
  END IF;

  -- 5.2 Capital Social: processo com exatamente 1 etapa (a movida).
  SELECT count(*) INTO v_n
  FROM public.process_stages
  WHERE process_id = v_proc_capital AND id = v_etapa_capital;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Pós-validação: etapa de Capital Social não está sob o novo processo (% achadas).', v_n;
  END IF;

  -- 5.3 Apresentação Inicial existe no P5.
  IF NOT EXISTS (SELECT 1 FROM public.processes
                 WHERE id = v_proc_apres AND project_id = v_apresentacoes) THEN
    RAISE EXCEPTION 'Pós-validação: Apresentação Inicial ausente do P5.';
  END IF;

  -- 5.4 Melhoria do relatório do DP existe e está vinculada ao DP Inicial.
  IF NOT EXISTS (SELECT 1 FROM public.melhoria_processos
                 WHERE melhoria_id = v_mel_relatorio AND processo_id = v_dp_inicial) THEN
    RAISE EXCEPTION 'Pós-validação: vínculo melhoria↔DP ausente.';
  END IF;

  -- 5.5 OSG passa a ter 34 processos (32 + Capital Social + Apresentação Inicial).
  SELECT count(*) INTO v_n FROM public.processes WHERE cluster_id = v_osg;
  IF v_n <> 34 THEN
    RAISE EXCEPTION 'Pós-validação: esperados 34 processos OSG, há %.', v_n;
  END IF;

  RAISE NOTICE 'OSG (reunião 18/06) aplicado OK — Capital Social + Apresentação Inicial + Melhoria DP.';
END $$;

COMMIT;
