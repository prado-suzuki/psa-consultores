-- 20260831204310_ges01a_cron_varredura_de_prazo.sql
-- GES-01A, parte 3 de 3: o job diario que roda a varredura.
--
-- NASCE DESATIVADO, e isto nao e cautela decorativa. A migracao roda nos DOIS
-- bancos, e este e o primeiro objeto desta frente que ESCREVE sozinho, todo dia,
-- na caixa de gente real. Um job ativo em dev tocaria o sino de verdade. Mesma
-- decisao da GES-04 (20260825140358_cron_cobrar_solicitacoes_vencidas.sql), que
-- tambem nasceu desativada pelo mesmo motivo.
--
-- Para ligar, em cada banco, quando for a hora:
--   UPDATE cron.job SET active = true WHERE jobname = 'alertar-tarefas-prazo-diario';
--
-- SEM HTTP, SEM VAULT, SEM BORDA. A GES-04 precisou de edge function porque
-- manda e-mail e WhatsApp para o CLIENTE, e URL e token mudam por ambiente.
-- Aqui o canal e so o sino, que e uma tabela deste mesmo banco: o cron chama a
-- funcao direto, no molde do `fechar-chamados-resolvidos-diario`, que ja roda em
-- producao como `SELECT public.fechar_chamados_resolvidos_sem_resposta();`.
-- Menos peca, menos segredo, e nada que possa falhar por rede.
--
-- 11h UTC = 07h em Cuiaba, o mesmo horario dos dois crons INTERNOS de producao
-- (`check-ticket-deadlines-daily` e `fechar-chamados-resolvidos-diario`). O da
-- GES-04 roda 13h UTC porque manda mensagem para cliente, o que e outro caso.
-- Rodar de manha faz o aviso chegar antes do dia de trabalho comecar, que e o
-- unico horario em que "vence hoje" ainda serve para alguma coisa.
--
-- ORDEM IMPORTA: este arquivo depende da parte 2 (as funcoes) e, por tabela, da
-- parte 1 (os valores de enum). As versoes garantem a ordem.
--
-- Reversao: SELECT cron.unschedule('alertar-tarefas-prazo-diario');

DO $$
BEGIN
  -- pg_cron pode nao estar instalado num banco novo; sem ele a migracao nao
  -- deve abortar e levar as funcoes junto.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ausente: job nao agendado. Rode o agendamento a mao depois.';
    RETURN;
  END IF;

  -- Reagendar e seguro: unschedule antes evita duplicar o job se a migracao for
  -- reaplicada num banco que ja a tenha.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario') THEN
    PERFORM cron.unschedule('alertar-tarefas-prazo-diario');
  END IF;

  PERFORM cron.schedule(
    'alertar-tarefas-prazo-diario',
    '0 11 * * *',
    $cron$SELECT public.alertar_tarefas_por_prazo();$cron$
  );

  -- Desativado ate decisao humana, em cada banco.
  -- Via cron.alter_job e nao UPDATE direto: a conta que aplica migration cria job
  -- (cron.schedule) mas nao escreve na tabela da extensao, e o UPDATE cru voltou
  -- 42501 "permission denied for table job" em 31/08/2026. A funcao da propria
  -- extensao faz a alteracao com o privilegio dela, e funciona igual nos dois
  -- bancos, sob qualquer papel que aplique. Ler cron.job segue permitido, e por
  -- isso o GATE abaixo nao muda.
  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario'),
    active := false
  );
END $$;

-- GATE: se o pg_cron existe, o job tem de existir e estar DESATIVADO. Um job
-- nascendo ativo e o unico jeito de esta migracao causar dano, entao falha aqui.
DO $$
DECLARE
  v_ativo boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT active INTO v_ativo FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario';

  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'GATE: o job alertar-tarefas-prazo-diario nao foi criado';
  END IF;
  IF v_ativo THEN
    RAISE EXCEPTION 'GATE: o job nasceu ATIVO e dispararia avisos reais sem aval';
  END IF;
END $$;