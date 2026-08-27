-- 20260825140358_cron_cobrar_solicitacoes_vencidas.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- 20260825132757_cron_cobrar_solicitacoes_vencidas.sql
-- GES-04: agenda a cobranca de solicitacao vencida sem nenhum documento recebido.
--
-- E o gatilho que este aviso nao tem. Os outros tres nascem de um ato -- clique do
-- analista, encerramento da solicitacao -- e o ato carrega o id. No dia 31 nao
-- acontece ato nenhum: o que aconteceu foi o tempo passar.
--
-- UMA INSTRUCAO SO: o `from solicitacoes_a_cobrar()` faz o laco, uma chamada por
-- linha. Mesmo molde do `check-ticket-deadlines-daily` de producao. A funcao diz
-- QUEM, a borda ENVIA, o cron so liga uma na outra.
--
-- VAULT E NAO VALOR NO TEXTO: URL e token mudam por ambiente e esta migracao tem de
-- ser o MESMO arquivo nos dois bancos. Segredo ausente faz a URL sair como
-- `SEGREDO_AUSENTE_...` e falhar legivel em `cron.job_run_details`.
--
-- 13h UTC = 09h em Cuiaba. Os dois crons de producao rodam 07h locais, mas sao
-- rotina INTERNA; este manda mensagem para CLIENTE.
--
-- NASCE DESATIVADO: migracao roda nos DOIS bancos, e ativo o job cobraria em dev
-- amanha -- o cenario 4 aponta para o e-mail real do Alexandre.
--
-- PARA ARMAR, em cada ambiente:
--   1. select vault.create_secret('<url do projeto>',   'notificar_url');
--      select vault.create_secret('<token do callback>', 'n8n_callback_token');
--   2. select cron.alter_job(job_id := (select jobid from cron.job
--             where jobname = 'cobrar-solicitacoes-vencidas-diario'), active := true);
--
-- TUDO PELAS FUNCOES DA API DO pg_cron, NUNCA POR DML EM `cron.job`: medido em
-- 24/08/2026, como `postgres` da SELECT mas UPDATE e INSERT sao NEGADOS (a tabela e
-- do `supabase_admin`). As funcoes tem EXECUTE liberado e rodam como o dono.
--
-- IDEMPOTENTE: `cron.unschedule` guardado antes de agendar.

do $$
declare
  v_jobid bigint;
begin
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

  perform cron.alter_job(job_id := v_jobid, active := false);
end $$;

comment on function public.solicitacoes_a_cobrar(integer) is
  'GES-04: solicitacoes vencidas que seguem sem nenhum documento recebido do cliente. Devolve o numero da cobranca (ciclo), ancorado em enviada_em. Nao envia nada -- select * from solicitacoes_a_cobrar() e a passada seca. O parametro e o intervalo entre cobrancas, em dias; o prazo de 30 dias e regra fixa e nao e parametro, porque o texto da mensagem o imprime. A regua e garantida pelo filtro de created_at aqui e pela mesma checagem na borda; a chave de idempotencia cuida de outro problema, o de dois envios no mesmo dia. Agendada em cron.job como cobrar-solicitacoes-vencidas-diario, 13h UTC, e NASCE DESATIVADA -- armar exige gravar os segredos no vault e ligar o job.';
