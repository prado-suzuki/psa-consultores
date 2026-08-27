-- 20260824214408_solicitacoes_a_cobrar_corrige_comentarios.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Reaplica a `solicitacoes_a_cobrar` com os comentarios corretos.
--
-- Duas divergencias corrigidas de uma vez:
--   1. Os comentarios descreviam o desenho da chave por periodo (`:p1`), descartado
--      em 24/08/2026 -- a chave continua terminando na data, e quem garante a regua
--      e o filtro de `created_at` aqui mais a mesma checagem na borda.
--   2. A primeira aplicacao subiu o corpo SEM os comentarios internos, entao banco e
--      repo diziam coisas diferentes. Agora sao iguais.
--
-- O CORPO NAO MUDA: so comentario.

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
   where s.enviada_em   is not null                 -- rascunho nunca chegou ao cliente
     and s.encerrada_em is null                     -- encerrada nao se cobra
     and current_date > s.enviada_em::date + 30     -- primeiro disparo no dia SEGUINTE ao vencimento

     -- sem pendencia nao se cobra
     and exists (
       select 1 from public.solicitacao_item i
        where i.solicitacao_id = s.id and i.status = 'ativo')

     -- nada recebido. `fonte = 'cliente'` e NAO o vinculo com a solicitacao: o
     -- `solicitacao_id` so e gravado pelo upload do proprio cliente dentro do portal
     -- (ColetaDocumentosCliente.tsx), entao documento que ele mandou por e-mail e o
     -- analista anexou entraria sem vinculo -- e cobrar quem enviou e o pior erro
     -- possivel neste aviso.
     -- `documento_gerado_id is null` blinda contra a fatia 2 do plano de storage, que
     -- vai fazer documento GERADO pela casa cair nesta tabela; o default da coluna
     -- `fonte` no banco e 'cliente', entao sem esta guarda um documento que a PSA
     -- produziu silenciaria a cobranca.
     and not exists (
       select 1 from public.documento_arquivo da
        where da.cliente_id          = s.cliente_id
          and da.fonte               = 'cliente'
          and da.excluido            = false
          and da.documento_gerado_id is null
          and da.created_at         >= s.enviada_em)

     -- ja cobrado dentro do ciclo corrente. Primeira das duas camadas da regua; a
     -- segunda e a mesma checagem na borda.
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
  'GES-04: solicitacoes vencidas que seguem sem nenhum documento recebido do cliente. Devolve o numero da cobranca (ciclo), ancorado em enviada_em. Nao envia nada -- select * from solicitacoes_a_cobrar() e a passada seca. O parametro e o intervalo entre cobrancas, em dias; o prazo de 30 dias e regra fixa e nao e parametro, porque o texto da mensagem o imprime. A regua e garantida pelo filtro de created_at aqui e pela mesma checagem na borda; a chave de idempotencia cuida de outro problema, o de dois envios no mesmo dia.';
