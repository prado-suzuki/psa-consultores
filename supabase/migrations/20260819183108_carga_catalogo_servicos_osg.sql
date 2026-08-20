-- Carga do catalogo de servicos da OSG: 40 servicos, 41 vinculos, 7 produtos.
--
-- REGRA: no portal, servico E a tarefa-pai do projeto. Este arquivo e o catalogo
-- da OSG, na ordem de execucao real: diagnostico -> estruturacao -> organizacao
-- (reorganizacao) -> sucessorio -> governanca -> mediacao -> fundos.
--
-- POR QUE EXISTE
--    O catalogo foi cadastrado A MAO pela tela (Cadastro de Categorias ->
--    Produtos x Servicos) direto em producao, em 18/08/2026, pela ALE-6. Logo ele
--    existe em producao e NAO existe no banco de desenvolvimento, onde os
--    produtos da OSG estao com zero servico. Consequencia pratica: a geracao
--    automatica de tarefas nao pode ser testada com produto da OSG fora de
--    producao. Esta migracao replica o estado de producao.
--
-- POR QUE RESOLVE POR NOME, E NAO POR CODIGO
--    Os codigos DIVERGEM entre os bancos: producao renomeou em 17/08/2026 e usa
--    prefixo ('02-ES', '07-CFI'); o desenvolvimento ainda usa o antigo ('ES',
--    'CFI'). Os NOMES dos 7 produtos sao identicos nos dois, conferido em
--    19/08/2026. Resolver por codigo abortaria em um dos lados.
--
-- A ORDEM VIVE NO NOME
--    Nao existe coluna de ordem em servicos_prestados nem em produto_servico, e
--    as telas listam com .order('nome'). Por isso o prefixo numerico faz parte do
--    nome, e o zero a esquerda e obrigatorio: no alfabeto '2.10' vem antes de
--    '2.2'. A Estruturacao Societaria tem 16 servicos, entao isso importa.
--
-- 41 VINCULOS PARA 40 SERVICOS: '2.01.Diagnostico Patrimonial' e UM registro
-- vinculado a DOIS produtos (Estruturacao Societaria e Constituicao de Fundos).
-- Nao e duplicata: servicos_prestados.nome e unico no sistema todo, entao servico
-- usado por dois produtos e obrigatoriamente o mesmo registro.
--
-- IDEMPOTENTE: os dois inserts tem ON CONFLICT DO NOTHING, no unico de
-- servicos_prestados.nome e no unico (produto_segmento_id, servico_prestado_id).
-- Rodar de novo nao insere nada e as travas aceitam o estado ja correto.
--
-- Estado de partida conferido em 19/08/2026:
--    producao        41 vinculos de produto OSG (este mesmo conteudo)
--    desenvolvimento  0 vinculos de produto OSG

BEGIN;

-- ── Passo 0 · trava de entrada ─────────────────────────────────────────────
do $$
declare
  v_prod    integer;
  v_cluster integer;
begin
  select count(*) into v_prod
    from public.produto_segmento
   where nome in ('Diagnóstico Societário, Sucessório e Governança',
                  'Estruturação Societária', 'Organização Societária',
                  'Planejamento Sucessório', 'Governança',
                  'Mediação de Conflitos', 'Constituição de Fundos de Investimento');

  if v_prod <> 7 then
    raise exception 'Abortada: esperava os 7 produtos da OSG por nome, encontrei %.', v_prod;
  end if;

  select count(*) into v_cluster from public.estrutura_clusters where name = 'OSG';
  if v_cluster <> 1 then
    raise exception 'Abortada: esperava 1 cluster chamado OSG, encontrei %.', v_cluster;
  end if;

  raise notice 'entrada ok: 7 produtos e o cluster OSG resolvidos por nome';
end $$;

-- ── Passo 1 · os 40 servicos, no cluster OSG ───────────────────────────────
insert into public.servicos_prestados (nome, cluster_id)
select v.nome, (select id from public.estrutura_clusters where name = 'OSG')
  from (values
    ('1.01.Levantar a estrutura societária atual (organograma)'),
    ('1.02.Analisar aspectos societários, patrimoniais, sucessórios e da atividade rural'),
    ('1.03.Propor estruturas societárias sugeridas'),
    ('1.04.Elaborar o relatório de Diagnóstico'),
    ('1.05.Apresentar o diagnóstico ao cliente'),
    ('2.01.Diagnóstico Patrimonial'),
    ('2.02.Qualificação dos Sócios'),
    ('2.03.Regularização da situação Matrimonial'),
    ('2.04.Digitação de Matrícula'),
    ('2.05.Planejamento Tributário Rural'),
    ('2.06.Constituição da Agro'),
    ('2.07.Distrato de Arrendamento Pré-existente'),
    ('2.08.Contrato de Composse'),
    ('2.09.Contrato de Parceria Rural'),
    ('2.10.Constituição da Participações'),
    ('2.11.Holdings Individuais'),
    ('2.12.AC de Integralização, Concentração de Cotas e Ata nas controladas'),
    ('2.13.AC Imóvel Adicional (2º momento)'),
    ('2.14.Revisão da Parceria e da Composse'),
    ('2.15.AC por Exigência Cartorial'),
    ('2.16.Atos Societários de Manutenção'),
    ('3.01.Cisão (parcial)'),
    ('3.02.Incorporação'),
    ('3.03.Fusão'),
    ('3.04.Aquisição (M&A / Compra e Venda de Participação)'),
    ('3.05.Transformação do Tipo Societário'),
    ('4.01.Planejamento Tributário ITCMD'),
    ('4.02.Doação + AC Reflexo (unificado)'),
    ('4.03.Testamento (alternativa à doação)'),
    ('5.01.Diagnóstico de Governança - Matriz de alçadas'),
    ('5.02.Acordo de Quotistas'),
    ('5.03.Protocolo de Remuneração'),
    ('5.04.Regimento Interno do Conselho'),
    ('5.05.AC Reflexo da Governança (Participações)'),
    ('5.06.Instalação do Conselho de Administração e Diretoria'),
    ('6.01.Elaborar contratos, acordos e protocolos familiares'),
    ('7.01.Laudo de avaliação dos bens'),
    ('7.02.Elaboração de regulamentos'),
    ('7.03.Instrumentos de exploração dos bens imóveis'),
    ('7.04.Elaboração de instrumentos de Governança')
  ) as v(nome)
on conflict (nome) do nothing;

-- ── Passo 2 · os 41 vinculos. Produto por NOME (ver cabecalho). ─────────────
insert into public.produto_servico (produto_segmento_id, servico_prestado_id)
select ps.id, sp.id
  from (values
    ('Diagnóstico Societário, Sucessório e Governança', '1.01.Levantar a estrutura societária atual (organograma)'),
    ('Diagnóstico Societário, Sucessório e Governança', '1.02.Analisar aspectos societários, patrimoniais, sucessórios e da atividade rural'),
    ('Diagnóstico Societário, Sucessório e Governança', '1.03.Propor estruturas societárias sugeridas'),
    ('Diagnóstico Societário, Sucessório e Governança', '1.04.Elaborar o relatório de Diagnóstico'),
    ('Diagnóstico Societário, Sucessório e Governança', '1.05.Apresentar o diagnóstico ao cliente'),
    ('Estruturação Societária', '2.01.Diagnóstico Patrimonial'),
    ('Estruturação Societária', '2.02.Qualificação dos Sócios'),
    ('Estruturação Societária', '2.03.Regularização da situação Matrimonial'),
    ('Estruturação Societária', '2.04.Digitação de Matrícula'),
    ('Estruturação Societária', '2.05.Planejamento Tributário Rural'),
    ('Estruturação Societária', '2.06.Constituição da Agro'),
    ('Estruturação Societária', '2.07.Distrato de Arrendamento Pré-existente'),
    ('Estruturação Societária', '2.08.Contrato de Composse'),
    ('Estruturação Societária', '2.09.Contrato de Parceria Rural'),
    ('Estruturação Societária', '2.10.Constituição da Participações'),
    ('Estruturação Societária', '2.11.Holdings Individuais'),
    ('Estruturação Societária', '2.12.AC de Integralização, Concentração de Cotas e Ata nas controladas'),
    ('Estruturação Societária', '2.13.AC Imóvel Adicional (2º momento)'),
    ('Estruturação Societária', '2.14.Revisão da Parceria e da Composse'),
    ('Estruturação Societária', '2.15.AC por Exigência Cartorial'),
    ('Estruturação Societária', '2.16.Atos Societários de Manutenção'),
    ('Organização Societária', '3.01.Cisão (parcial)'),
    ('Organização Societária', '3.02.Incorporação'),
    ('Organização Societária', '3.03.Fusão'),
    ('Organização Societária', '3.04.Aquisição (M&A / Compra e Venda de Participação)'),
    ('Organização Societária', '3.05.Transformação do Tipo Societário'),
    ('Planejamento Sucessório', '4.01.Planejamento Tributário ITCMD'),
    ('Planejamento Sucessório', '4.02.Doação + AC Reflexo (unificado)'),
    ('Planejamento Sucessório', '4.03.Testamento (alternativa à doação)'),
    ('Governança', '5.01.Diagnóstico de Governança - Matriz de alçadas'),
    ('Governança', '5.02.Acordo de Quotistas'),
    ('Governança', '5.03.Protocolo de Remuneração'),
    ('Governança', '5.04.Regimento Interno do Conselho'),
    ('Governança', '5.05.AC Reflexo da Governança (Participações)'),
    ('Governança', '5.06.Instalação do Conselho de Administração e Diretoria'),
    ('Mediação de Conflitos', '6.01.Elaborar contratos, acordos e protocolos familiares'),
    ('Constituição de Fundos de Investimento', '2.01.Diagnóstico Patrimonial'),
    ('Constituição de Fundos de Investimento', '7.01.Laudo de avaliação dos bens'),
    ('Constituição de Fundos de Investimento', '7.02.Elaboração de regulamentos'),
    ('Constituição de Fundos de Investimento', '7.03.Instrumentos de exploração dos bens imóveis'),
    ('Constituição de Fundos de Investimento', '7.04.Elaboração de instrumentos de Governança')
  ) as v(produto, servico)
  join public.produto_segmento   ps on ps.nome = v.produto
  join public.servicos_prestados sp on sp.nome = v.servico
on conflict (produto_segmento_id, servico_prestado_id) do nothing;

-- ── Passo 3 · trava de saida ───────────────────────────────────────────────
do $$
declare
  v_vinculos integer;
  v_por      text;
begin
  select count(*), string_agg(ps.codigo || '=' || c, ', ' order by ps.codigo)
    into v_vinculos, v_por
    from (select pv.produto_segmento_id, count(*) as c
            from public.produto_servico pv
            join public.produto_segmento p2 on p2.id = pv.produto_segmento_id
            join public.estrutura_clusters e2 on e2.id = p2.cluster_id and e2.name = 'OSG'
           group by 1) t
    join public.produto_segmento ps on ps.id = t.produto_segmento_id;

  if v_vinculos is distinct from 7 then
    raise exception 'Abortada: esperava 7 produtos OSG com vinculo, tenho % (%).',
      coalesce(v_vinculos, 0), coalesce(v_por, 'nenhum');
  end if;

  select count(*) into v_vinculos
    from public.produto_servico pv
    join public.produto_segmento ps on ps.id = pv.produto_segmento_id
    join public.estrutura_clusters ec on ec.id = ps.cluster_id and ec.name = 'OSG';

  if v_vinculos <> 41 then
    raise exception 'Abortada: esperava 41 vinculos de produto OSG, tenho %.', v_vinculos;
  end if;

  raise notice 'saida ok: 41 vinculos em 7 produtos (%)', v_por;
end $$;

COMMIT;

-- ── Conferencia depois de rodar ────────────────────────────────────────────
-- select ps.codigo, count(*) from public.produto_servico pv
--   join public.produto_segmento ps on ps.id = pv.produto_segmento_id
--   join public.estrutura_clusters ec on ec.id = ps.cluster_id and ec.name = 'OSG'
--  group by 1 order by 1;
-- Esperado: DSSG=5, ES=16, RS=5, PS=3, GOV=6, MC=1, CFI=5  (codigos do dev;
-- em producao os mesmos produtos aparecem como 05-DSSG, 02-ES, 02-RS, 03-PS,
-- 04-GOV, 06-MC, 07-CFI)
