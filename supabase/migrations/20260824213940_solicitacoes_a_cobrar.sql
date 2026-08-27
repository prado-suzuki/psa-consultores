-- 20260824213940_solicitacoes_a_cobrar.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

create or replace function public.solicitacoes_a_cobrar(_intervalo_dias integer default 30)
returns table (
  solicitacao_id uuid,
  cliente_id     uuid,
  enviada_em     timestamptz,
  prazo          date,
  ciclo          integer
)
language sql
stable
set search_path to 'public'
as $function$
  select s.id,
         s.cliente_id,
         s.enviada_em,
         (s.enviada_em::date + 30)                                              as prazo,
         floor((current_date - s.enviada_em::date) / _intervalo_dias)::integer  as ciclo
    from public.solicitacao s
   where s.enviada_em   is not null
     and s.encerrada_em is null
     and current_date > s.enviada_em::date + 30
     and exists (
       select 1 from public.solicitacao_item i
        where i.solicitacao_id = s.id and i.status = 'ativo')
     and not exists (
       select 1 from public.documento_arquivo da
        where da.cliente_id          = s.cliente_id
          and da.fonte               = 'cliente'
          and da.excluido            = false
          and da.documento_gerado_id is null
          and da.created_at         >= s.enviada_em)
     and not exists (
       select 1 from public.notificacao_envio ne
        where ne.tipo          = 'solicitacao_vencida'
          and ne.entidade_tipo = 'solicitacao'
          and ne.entidade_id   = s.id
          and ne.created_at   >= s.enviada_em
                                 + (floor((current_date - s.enviada_em::date) / _intervalo_dias)
                                    * _intervalo_dias) * interval '1 day');
$function$;

comment on function public.solicitacoes_a_cobrar(integer) is
  'GES-04: solicitacoes vencidas que seguem sem nenhum documento recebido do cliente. Devolve o ciclo de cobranca (ancorado em enviada_em), que e o mesmo numero usado na chave de idempotencia. Nao envia nada -- select * from solicitacoes_a_cobrar() e a passada seca. O parametro e o intervalo entre cobrancas, em dias; o prazo de 30 dias e regra fixa e nao e parametro, porque o texto da mensagem o imprime.';
