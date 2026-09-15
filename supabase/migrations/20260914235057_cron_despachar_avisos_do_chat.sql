-- 20260914235057_cron_despachar_avisos_do_chat.sql
-- Avisos no Google Chat, parte 4: o job que chama a borda.
--
-- NASCE DESATIVADO, e nao e cautela decorativa: a migracao roda nos DOIS bancos,
-- e este job PUBLICA em espaco de gente. Mesma decisao da GES-01A
-- (20260831204310) e da GES-04 (20260825140358), pelo mesmo motivo.
--
-- Para ligar, em cada banco, quando os segredos estiverem gravados:
--   UPDATE cron.job SET active = true WHERE jobname = 'despachar-avisos-do-chat';
--
-- PRECISA DE VAULT, ao contrario da varredura de prazo da GES-01A. Aquela so
-- escreve no sino, que e tabela deste mesmo banco; esta fala com uma borda por
-- HTTP, e URL e token mudam por banco. Os dois segredos:
--
--   1. select vault.create_secret('<url do projeto>', 'notificar_url');
--      -- ja existe se a GES-04 foi armada: e a mesma URL base, e serve para
--      -- qualquer funcao. Nao crie um segundo com outro nome.
--   2. select vault.create_secret('<token do cron>', 'cron_chat_token');
--      -- o mesmo valor que o segredo CRON_CHAT_TOKEN da edge function. E por
--      -- ele que a borda reconhece o cron, no `x-api-key`.
--
-- Sem os segredos o job nao quebra o banco: o `coalesce` manda a chamada para um
-- host invalido e ela falha sozinha, sem tocar em `notificacao_envio`. Barulhento
-- no log e inofensivo nos dados, que e o que se quer de um job mal configurado.
--
-- A CADA 15 MINUTOS, e nao uma vez por dia. Os avisos tem duas origens com
-- ritmos diferentes: os de prazo nascem todos as 11h UTC, do cron da GES-01A, e
-- os de atribuicao e revisao nascem de trigger, ao longo do dia. Uma passada
-- diaria daria ate 24 horas de atraso para quem acabou de receber uma tarefa --
-- e o aviso que chega no dia seguinte ja nao e aviso. O custo e um POST a cada
-- 15 minutos, que devolve "nada a enviar" quase sempre.
--
-- A JANELA DE 90 MINUTOS, com o job a cada 15, faz cada aviso ser oferecido umas
-- seis vezes. Isso e de proposito: a trava contra repetir e a chave de
-- idempotencia em `notificacao_envio`, nao a janela, e as repetidas custam uma
-- consulta que nao devolve nada. A janela existe para que um job parado por dias
-- nao desove o acumulado no espaco ao voltar.
--
-- NAO PASSA `ambiente`: a borda usa 'prod' por padrao, que e o unico que faz
-- sentido para o job de verdade. Teste com dados de `dev` se faz chamando a borda
-- a mao com `{"ambiente":"dev","simular":true}`.
--
-- Reversao: SELECT cron.unschedule('despachar-avisos-do-chat').

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- pg_cron pode nao estar instalado num banco novo; sem ele a migracao nao deve
  -- abortar, so deixar de agendar.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ausente: job nao agendado. Agende a mao depois.';
    RETURN;
  END IF;

  -- Reagendar e seguro: sem o unschedule, reaplicar a migracao duplicaria o job.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'despachar-avisos-do-chat') THEN
    PERFORM cron.unschedule('despachar-avisos-do-chat');
  END IF;

  v_jobid := cron.schedule(
    'despachar-avisos-do-chat',
    '*/15 * * * *',
    $cron$
    select net.http_post(
             url     := coalesce(
                          (select decrypted_secret from vault.decrypted_secrets
                            where name = 'notificar_url'),
                          'SEGREDO_AUSENTE_notificar_url'
                        ) || '/functions/v1/notificar-equipe',
             headers := jsonb_build_object(
                          'Content-Type', 'application/json',
                          'x-api-key', coalesce(
                                         (select decrypted_secret from vault.decrypted_secrets
                                           where name = 'cron_chat_token'),
                                         'SEGREDO_AUSENTE_cron_chat_token'
                                       )
                        ),
             body    := jsonb_build_object('janela_minutos', 90)
           )
    $cron$
  );

  PERFORM cron.alter_job(job_id := v_jobid, active := false);
END $$;
