-- Marca o produto que e o Canal de Chamados.
--
-- REGRA: existe UM produto que e o canal de chamados, e e ele que o trigger
-- delegar_chamado_gera_tarefa (EDU-11) usa para achar o projeto do cliente onde
-- a tarefa do chamado delegado nasce.
--
-- POR QUE FALTAVA
--    A EDU-10 criou a coluna produto_segmento.is_canal_chamados e o indice unico
--    parcial uq_produto_segmento_canal_chamados, e deixou escrito no comentario
--    da coluna que ela e "preenchida por carga de dado, nunca por esta
--    migracao". A carga nunca aconteceu. Consequencia medida em 18/08/2026:
--    352 chamados delegados, 0 tarefas criadas. O trigger roda, nao acha projeto
--    de canal, grava RAISE WARNING e segue -- como foi projetado para fazer.
--
--    Nenhum arquivo de src/ le ou escreve essa coluna: a tela de Cadastro de
--    Categorias grava apenas codigo, nome e cluster_id. Ou seja, nao existe
--    caminho de tela para por a marca, e por isso ela vem por migracao.
--
-- POR QUE RESOLVE POR NOME, E NAO POR CODIGO
--    Os codigos DIVERGEM entre os bancos: producao usa '01-CHA' (renomeado em
--    17/08/2026) e o dev compartilhado ainda usa 'CHA'. Migracao que resolvesse
--    por codigo abortaria em um dos dois. O nome 'Canal de Chamados' e igual nos
--    dois, e conferido unico nos dois.
--
-- ESTADO DE PARTIDA CONFERIDO NOS DOIS BANCOS EM 18/08/2026
--    producao (Lovable Cloud):     1 produto 'Canal de Chamados' (01-CHA), 0 marcados
--    dev compartilhado (vgzomuw…): 1 produto 'Canal de Chamados' (CHA),    0 marcados
--
-- IDEMPOTENTE: o UPDATE tem `and not is_canal_chamados`, entao a segunda
-- execucao nao toca linha nenhuma. As travas aceitam o estado ja correto e
-- abortam so quando ha OUTRO produto marcado -- caso em que a decisao e humana,
-- nao automatica.
--
-- EFEITO NA TELA, e ele e o motivo de existir: a partir daqui, delegar um
-- chamado de cliente que TENHA projeto desse produto cria a tarefa. Cliente que
-- nao tem continua sem tarefa, agora com o aviso da ALE-5 dizendo isso.

BEGIN;

-- ── Passo 0 · trava de entrada ─────────────────────────────────────────────
do $$
declare
  v_alvo    integer;
  v_marcado text;
begin
  select count(*) into v_alvo
    from public.produto_segmento
   where nome = 'Canal de Chamados';

  if v_alvo <> 1 then
    raise exception
      'Abortada: esperava 1 produto chamado "Canal de Chamados", encontrei %.', v_alvo;
  end if;

  select string_agg(codigo, ', ') into v_marcado
    from public.produto_segmento
   where is_canal_chamados
     and nome <> 'Canal de Chamados';

  if v_marcado is not null then
    raise exception
      'Abortada: outro produto ja esta marcado como canal de chamados (%). Decidir a mao qual fica.',
      v_marcado;
  end if;

  raise notice 'entrada ok: 1 produto alvo, nenhum outro marcado';
end $$;

-- ── Passo 1 · a marca. Resolve por NOME, nunca por codigo (ver cabecalho). ──
update public.produto_segmento
   set is_canal_chamados = true
 where nome = 'Canal de Chamados'
   and not is_canal_chamados;

-- ── Passo 2 · trava de saida ───────────────────────────────────────────────
do $$
declare
  v_total  integer;
  v_codigo text;
begin
  select count(*), string_agg(codigo, ', ')
    into v_total, v_codigo
    from public.produto_segmento
   where is_canal_chamados;

  if v_total <> 1 then
    raise exception 'Abortada: esperava exatamente 1 produto marcado, tenho % (%).',
      v_total, coalesce(v_codigo, 'nenhum');
  end if;

  if not exists (select 1 from public.produto_segmento
                  where is_canal_chamados and nome = 'Canal de Chamados') then
    raise exception 'Abortada: o produto marcado (%) nao e o Canal de Chamados.', v_codigo;
  end if;

  raise notice 'saida ok: % marcado como canal de chamados', v_codigo;
end $$;

COMMIT;

-- ── Conferencia depois de rodar ────────────────────────────────────────────
-- select codigo, nome, is_canal_chamados
--   from public.produto_segmento where is_canal_chamados;   -- 1 linha
--
-- Quantos clientes com chamado delegado passam a ter projeto de canal:
-- select count(distinct t.cliente_id)
--   from public.tickets t
--  where t.assigned_to is not null
--    and exists (select 1 from public.org_projects op
--                join public.produto_segmento ps on ps.id = op.produto_segmento_id
--               where op.external_client_id = t.cliente_id and ps.is_canal_chamados);
-- Medido em 18/08/2026: 4 de 11 nos dois bancos. Os outros 7 veem o aviso da ALE-5.
