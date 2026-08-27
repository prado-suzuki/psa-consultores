-- 20260824213938_solicitacoes_a_cobrar.sql
-- GES-04: a lista de quem deve ser cobrado hoje.
--
-- Responde UMA pergunta -- quais solicitacoes vencidas seguem sem nenhum documento
-- recebido -- e devolve uma lista. Nao envia, nao escreve, nao decide mais nada.
--
-- POR QUE NO BANCO E NAO NA BORDA
--    O cron roda dentro do banco e precisa de algo para chamar. E a passada seca
--    vira `select * from solicitacoes_a_cobrar()`: da para ver quem receberia sem
--    envolver a borda e sem risco de mandar mensagem.
--
-- AS DUAS METADES DO "30", QUE SAO COISAS DIFERENTES
--    PRAZO: `enviada_em + 30 dias` e quando o prazo vence. E regra de negocio de
--    11/08/2026, sem coluna, igual para todo cliente e produto, e o mesmo numero que
--    o texto da mensagem imprime. Fica como constante aqui, e mudar exige mudar o
--    texto junto -- por isso NAO e parametro.
--    INTERVALO: de quanto em quanto tempo se cobra DEPOIS de vencido. Esse e
--    parametro, com 30 de padrao, porque a periodicidade nunca foi homologada pela
--    coordenacao (pergunta de 17/08 sem resposta). Muda sem migracao.
--
-- O QUE O `ciclo` E, E O QUE ELE NAO E
--    E o numero da cobranca: 1 e a primeira depois do vencimento, 2 a segunda, e
--    assim por diante. Ancorado em `enviada_em`, por decisao do tech lead em
--    24/08/2026 -- a agenda de cada solicitacao fica fixa desde a abertura e nao
--    deriva quando um ciclo falha, ao contrario de contar a partir da ultima
--    cobranca que saiu.
--
--    Serve para duas coisas: definir a janela do filtro abaixo, e dar leitura ao job
--    e a passada seca ("este cliente esta na terceira cobranca"). NAO vai para a
--    chave de idempotencia -- a chave continua terminando na data, igual aos outros
--    tres avisos. Chegou-se a considerar grava-lo la, e foi descartado em 24/08: a
--    coluna `created_at` passou a responder "ja cobrei neste ciclo?" de forma direta,
--    e mudar o formato da chave criaria um aviso diferente dos outros por ganho
--    marginal.
--
-- COMO A REGUA DE 30 DIAS E GARANTIDA, EM DUAS CAMADAS
--    1. Este filtro, que tira da lista quem ja foi cobrado dentro do ciclo corrente.
--    2. A mesma checagem na borda, sobre o mesmo campo (`created_at`), porque a
--       borda pode ser chamada de fora do job.
--    A chave de idempotencia NAO participa disso: ela impede dois envios no mesmo
--    DIA, que e outro problema -- duas execucoes simultaneas do job geram a mesma
--    chave e a segunda e recusada pela unicidade.
--
--    Linha anterior a 24/08/2026 tem `created_at` nulo (a coluna nasceu naquele dia,
--    sem backfill) e por isso nao entra no filtro. Efeito pratico: uma solicitacao
--    cobrada antes daquela data poderia ser cobrada de novo uma vez. Nao ha nenhuma
--    em producao nem em dev -- este aviso nunca rodou antes de hoje.
--
-- IDEMPOTENTE: create or replace function.

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

     -- ja cobrado dentro do ciclo corrente. Primeira das duas camadas da regua (ver
     -- cabecalho); a segunda e a mesma checagem na borda.
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

-- ── Conferencia depois de rodar ────────────────────────────────────────────
-- select * from public.solicitacoes_a_cobrar();          -- padrao de 30 dias
-- select * from public.solicitacoes_a_cobrar(15);        -- e se a coordenacao disser 15
