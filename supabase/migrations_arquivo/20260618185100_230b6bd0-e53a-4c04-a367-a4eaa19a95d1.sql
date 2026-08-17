-- OSG — Reunião 18/06/2026: Capital Social como processo, Apresentação Inicial no P5, Melhoria DP
BEGIN;

DO $$
DECLARE
  v_osg            uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';
  v_contratos      uuid := '70c8b198-ff14-400a-a78f-659c41897a17';
  v_apresentacoes  uuid := '29580f4a-39d8-46db-9748-6d464bcfb832';
  v_sucessao       uuid := '4b217513-1993-4ae5-a0ec-50137deb930e';
  v_governanca     uuid := 'cf38325f-4e17-6a7d-55ff-c32ee5e68419';
  v_reorg          uuid := '6b6f309c-cd6c-487e-b81b-ca8124967052';
  v_qualificacao   uuid := '588f3ee5-da46-489f-e45f-e43ca1d55259';
  v_dp_inicial     uuid := '6e6ee166-8b5d-0168-9462-5f31b1074b20';
  v_etapa_capital  uuid := '882597ca-7c1d-a727-22ce-e74c77a73994';
  v_proc_capital   uuid := '0c5ca100-0000-4000-8000-000000000035';
  v_proc_apres     uuid := '0a17e100-0000-4000-8000-000000000036';
  v_etapa_apres    uuid := '0a17e100-0000-4000-8000-000000000136';
  v_mel_relatorio  uuid := '0d9fa100-0000-4000-8000-000000000037';
  v_mp_relatorio   uuid := '0d9fa100-0000-4000-8000-000000000137';
  v_n              int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_contratos AND cluster_id = v_osg)
     OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_apresentacoes) THEN
    RAISE EXCEPTION 'Pré-condição falhou: projetos base OSG ausentes.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE id = v_qualificacao AND cluster_id = v_osg)
     OR NOT EXISTS (SELECT 1 FROM public.processes WHERE id = v_dp_inicial AND cluster_id = v_osg) THEN
    RAISE EXCEPTION 'Pré-condição falhou: processos base ausentes no OSG.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = 'PROC-GERAL-035') THEN
    UPDATE public.processes SET order_index = order_index + 1
     WHERE project_id = v_contratos AND cluster_id = v_osg AND order_index >= 3;

    INSERT INTO public.processes
      (id, name, description, project_id, cluster_id, code, frequency,
       stage, priority, evaluation_status, complexity_level,
       people_involved, order_index, evaluation_period_days)
    VALUES
      (v_proc_capital,
       'Planilha de Capital Social',
       'Elaboração da planilha de capital social — composição e integralização do capital de cada sócio, base para os atos societários. Desmembrado da Qualificação dos Sócios (que passa a tratar apenas da coleta de documentos pessoais e da montagem do WP), conforme decisão da reunião de 18/06/2026.',
       v_contratos, v_osg, 'PROC-GERAL-035', 'Quinzenal',
       'discovery', 'medium', 'Não avaliado', 'Baixa',
       1, 3, 30);

    UPDATE public.process_stages
       SET process_id = v_proc_capital, stage_order = 1
     WHERE id = v_etapa_capital AND process_id = v_qualificacao;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = 'PROC-GERAL-036') THEN
    INSERT INTO public.processes
      (id, name, description, project_id, cluster_id, code, frequency,
       stage, priority, evaluation_status, complexity_level,
       people_involved, order_index, evaluation_period_days)
    VALUES
      (v_proc_apres,
       'Apresentação Inicial',
       'Consolidação e apresentação ao cliente da estrutura societária e patrimonial sugerida, reunindo os dados do DP e do Planejamento Tributário Rural, para aprovação. Marca o encerramento da produção de contratos: aprovada a estrutura, a equipe parte para o registro dos instrumentos.',
       v_apresentacoes, v_osg, 'PROC-GERAL-036', 'Quinzenal',
       'discovery', 'medium', 'Não avaliado', 'Média',
       1, 0, 30);

    INSERT INTO public.process_stages
      (id, process_id, stage_order, name, description, scenario, execution,
       volume_per_process, error_rate, rework_rate)
    VALUES
      (v_etapa_apres, v_proc_apres, 1,
       'Consolidar e apresentar estrutura ao cliente',
       'Monta a apresentação com a estrutura sugerida (DP + planejamento tributário) e apresenta ao cliente para aprovação.',
       'AS-IS', 'manual', 1, 0, 0);
  END IF;

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
  END IF;

  UPDATE public.projects SET area = 'OSG'
   WHERE id IN (v_sucessao, v_apresentacoes, v_reorg)
     AND cluster_id = v_osg AND area IS NULL;

  SELECT count(*) INTO v_n FROM public.process_stages
   WHERE process_id = v_qualificacao AND scenario = 'AS-IS';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'Pós-validação: Qualificação deveria ter 2 etapas, tem %.', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.process_stages
   WHERE process_id = v_proc_capital AND id = v_etapa_capital;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Pós-validação: etapa Capital Social não está no novo processo (%).', v_n;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.processes WHERE id = v_proc_apres AND project_id = v_apresentacoes) THEN
    RAISE EXCEPTION 'Pós-validação: Apresentação Inicial ausente do P5.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.melhoria_processos WHERE melhoria_id = v_mel_relatorio AND processo_id = v_dp_inicial) THEN
    RAISE EXCEPTION 'Pós-validação: vínculo melhoria↔DP ausente.';
  END IF;

  SELECT count(*) INTO v_n FROM public.processes WHERE cluster_id = v_osg;
  IF v_n <> 34 THEN
    RAISE EXCEPTION 'Pós-validação: esperados 34 processos OSG, há %.', v_n;
  END IF;
END $$;

COMMIT;