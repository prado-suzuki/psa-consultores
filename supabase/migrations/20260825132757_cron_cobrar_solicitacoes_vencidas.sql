-- 20260825132757_cron_cobrar_solicitacoes_vencidas.sql
-- GES-04: agenda a cobranca de solicitacao vencida sem nenhum documento recebido.
--
-- E o gatilho que este aviso nao tem. Os outros tres nascem de um ato -- clique do
-- analista, encerramento da solicitacao -- e o ato carrega o id. No dia 31 nao
-- acontece ato nenhum: o que aconteceu foi o tempo passar. Por isso aqui existe um
-- relogio, e nos outros nao.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE UMA INSTRUCAO SO, SEM FUNCAO EMBRULHANDO
--
--    O `from solicitacoes_a_cobrar()` faz o laco sozinho: uma chamada por linha da
--    lista. E o mesmo molde do `check-ticket-deadlines-daily`, que ja roda em
--    producao como um `select net.http_post(...)` solto. Funcao embrulhando compraria
--    log de quantas foram chamadas, e custaria mais um objeto -- fica para quando o
--    log fizer falta.
--
--    A divisao de responsabilidade continua a mesma: a `solicitacoes_a_cobrar` diz
--    QUEM (so le, nao causa nada) e a borda `notificar` ENVIA. Este cron so liga uma
--    na outra. Nada de regra de negocio mora aqui.
--
-- POR QUE VAULT, E NAO VALOR NO TEXTO
--
--    A URL e o token mudam por ambiente, e esta migracao tem de ser o MESMO arquivo
--    nos dois bancos. Valor no texto obrigaria dois arquivos diferentes (quebra a
--    replicabilidade) ou colocaria um segredo vivo no git. O cron de producao que ja
--    existe carrega a chave anon em texto puro no proprio comando -- aqui nao se
--    repete isso.
--
--    Se algum dos dois segredos faltar, a URL sai como `SEGREDO_AUSENTE_...` e a
--    chamada falha de forma legivel em `cron.job_run_details`. E de proposito: falha
--    silenciosa numa cobranca automatica significa cliente nunca cobrado sem ninguem
--    saber.
--
-- O HORARIO: 13h UTC = 09h em Cuiaba (MT e UTC-4, sem horario de verao)
--
--    Os dois crons que ja existem rodam 11h e 11h15 UTC, ou seja 07h e 07h15 locais.
--    Aqueles sao rotina INTERNA; este manda mensagem para CLIENTE, e as 07h e cedo
--    para WhatsApp de cobranca. 09h cai em horario comercial e nao disputa janela com
--    os outros dois.
--
-- NASCE DESATIVADO, E ISSO NAO E CAUTELA EXCESSIVA
--
--    Migracao roda nos DOIS bancos. Ativo, o job comecaria a cobrar em dev no dia
--    seguinte -- e o cenario 4 de teste aponta para o e-mail real do Alexandre. Em
--    producao, armar uma cobranca automatica a cliente deve ser ato consciente, nao
--    efeito colateral de um deploy.
--
--    Para ARMAR, em cada ambiente:
--      1. select vault.create_secret('<url do projeto>',   'notificar_url');
--         select vault.create_secret('<token do callback>', 'n8n_callback_token');
--      2. update cron.job set active = true where jobname = 'cobrar-solicitacoes-vencidas-diario';
--
--    Para conferir depois de armar:
--      select * from public.solicitacoes_a_cobrar();          -- quem receberia
--      select jobname, schedule, active from cron.job;        -- estado do agendamento
--      select * from cron.job_run_details order by start_time desc limit 5;
--
-- ⚠️ TUDO PELAS FUNCOES DA API DO pg_cron, NUNCA POR DML EM `cron.job`
--
--    Medido em 24/08/2026: como `postgres` da para fazer SELECT em `cron.job`, mas
--    UPDATE e INSERT sao NEGADOS -- a tabela e do `supabase_admin`. Um
--    `update cron.job set active = false` falha com "permission denied for table
--    job". As funcoes (`schedule`, `unschedule`, `alter_job`) tem EXECUTE liberado e
--    rodam como o dono, entao e por elas que se mexe no agendamento.
--
-- IDEMPOTENTE: `cron.unschedule` guardado antes de agendar.

do $$
declare
  v_jobid bigint;
begin
  -- `cron.unschedule` levanta excecao quando o job nao existe, entao o guarda e o
  -- `where exists` -- e o SELECT em `cron.job` e permitido.
  if exists (select 1 from cron.job where jobname = 'cobrar-solicitacoes-vencidas-diario') then
    perform cron.unschedule('cobrar-solicitacoes-vencidas-diario');
  end if;

  v_jobid := cron.schedule(
    'cobrar-solicitacoes-vencidas-diario',
    '0 13 * * *',
    $cron$
  select net.http_post(
           url     := coalesce(
                        (select decrypted_secret from vault.decrypted_secrets
                          where name = 'notificar_url'),
                        'SEGREDO_AUSENTE_notificar_url'
                      ) || '/functions/v1/notificar',
           headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'x-api-key', coalesce(
                                       (select decrypted_secret from vault.decrypted_secrets
                                         where name = 'n8n_callback_token'),
                                       'SEGREDO_AUSENTE_n8n_callback_token'
                                     )
                      ),
           body    := jsonb_build_object(
                        'event_type',     'solicitacao_vencida',
                        'solicitacao_id', f.solicitacao_id
                      )
         )
      from public.solicitacoes_a_cobrar() f;
    $cron$
  );

  -- Nasce desativado. Ver "NASCE DESATIVADO" no cabecalho.
  perform cron.alter_job(job_id := v_jobid, active := false);
end $$;

comment on function public.solicitacoes_a_cobrar(integer) is
  'GES-04: solicitacoes vencidas que seguem sem nenhum documento recebido do cliente. Devolve o numero da cobranca (ciclo), ancorado em enviada_em. Nao envia nada -- select * from solicitacoes_a_cobrar() e a passada seca. O parametro e o intervalo entre cobrancas, em dias; o prazo de 30 dias e regra fixa e nao e parametro, porque o texto da mensagem o imprime. A regua e garantida pelo filtro de created_at aqui e pela mesma checagem na borda; a chave de idempotencia cuida de outro problema, o de dois envios no mesmo dia. Agendada em cron.job como cobrar-solicitacoes-vencidas-diario, 13h UTC, e NASCE DESATIVADA -- armar exige gravar os segredos no vault e ligar o job.';
