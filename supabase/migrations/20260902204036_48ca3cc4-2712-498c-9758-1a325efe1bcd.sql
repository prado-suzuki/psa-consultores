-- 20260901144842_ges01a_ativar_cron_por_banco.sql
DO $$
DECLARE
  v_cluster text;
  v_ambiente text;
  v_jobid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ausente: nada a ativar.';
    RETURN;
  END IF;

  SELECT system_identifier::text INTO v_cluster FROM pg_control_system();

  v_ambiente := CASE v_cluster
    WHEN '7575202818581710058' THEN 'prod'
    WHEN '7666007964130682852' THEN 'dev'
    ELSE NULL
  END;

  IF v_ambiente IS NULL THEN
    RAISE NOTICE 'Cluster % nao reconhecido: job NAO ativado, de proposito.', v_cluster;
    RETURN;
  END IF;

  -- Reagenda para carimbar o ambiente deste banco no comando, e so entao liga.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario') THEN
    PERFORM cron.unschedule('alertar-tarefas-prazo-diario');
  END IF;

  PERFORM cron.schedule(
    'alertar-tarefas-prazo-diario',
    '0 11 * * *',
    format('SELECT public.alertar_tarefas_por_prazo(NULL, %L);', v_ambiente)
  );

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario';

  -- Via cron.alter_job e nao UPDATE direto: a conta que aplica migration cria
  -- job mas nao escreve na tabela da extensao (42501 em 31/08/2026).
  PERFORM cron.alter_job(v_jobid, active := true);

  RAISE NOTICE 'Job ativado no cluster % varrendo ambiente %.', v_cluster, v_ambiente;
END $$;

-- GATE: em banco conhecido, o job tem de ficar ATIVO e com o ambiente do proprio
-- banco no comando. Em banco desconhecido, nao pode ter ativado.
DO $$
DECLARE
  v_cluster  text;
  v_esperado text;
  v_ativo    boolean;
  v_comando  text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT system_identifier::text INTO v_cluster FROM pg_control_system();
  v_esperado := CASE v_cluster
    WHEN '7575202818581710058' THEN 'prod'
    WHEN '7666007964130682852' THEN 'dev'
    ELSE NULL
  END;

  SELECT active, command INTO v_ativo, v_comando
    FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario';

  IF v_esperado IS NULL THEN
    IF COALESCE(v_ativo, false) THEN
      RAISE EXCEPTION 'GATE: cluster desconhecido % e o job ficou ATIVO', v_cluster;
    END IF;
    RETURN;
  END IF;

  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'GATE: o job alertar-tarefas-prazo-diario nao existe';
  END IF;
  IF NOT v_ativo THEN
    RAISE EXCEPTION 'GATE: o job continua desativado no cluster %', v_cluster;
  END IF;
  IF v_comando NOT LIKE '%' || v_esperado || '%' THEN
    RAISE EXCEPTION 'GATE: o comando nao varre o ambiente % deste banco: %',
      v_esperado, v_comando;
  END IF;
END $$;