-- 20260819183206_carga_catalogo_servicos_osg.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Carga do catalogo de servicos da OSG: 40 servicos, 41 vinculos, 7 produtos.
-- Espelha supabase/migrations/20260819183108_carga_catalogo_servicos_osg.sql.
-- Resolve produto por NOME: os codigos divergem entre os bancos (producao usa
-- '02-ES', dev usa 'ES'), mas os nomes sao identicos.
-- 41 vinculos para 40 servicos: '2.01.Diagnostico Patrimonial' e um registro so,
-- ligado a Estruturacao Societaria e a Constituicao de Fundos.

do $$
declare v_prod integer; v_cluster integer;
begin
  select count(*) into v_prod from public.produto_segmento
   where nome in ('Diagnóstico Societário, Sucessório e Governança','Estruturação Societária',
                  'Organização Societária','Planejamento Sucessório','Governança',
                  'Mediação de Conflitos','Constituição de Fundos de Investimento');
  if v_prod <> 7 then
    raise exception 'Abortada: esperava os 7 produtos da OSG por nome, encontrei %.', v_prod;
  end if;
  select count(*) into v_cluster from public.estrutura_clusters where name = 'OSG';
  if v_cluster <> 1 then
    raise exception 'Abortada: esperava 1 cluster OSG, encontrei %.', v_cluster;
  end if;
  raise notice 'entrada ok';
end $$;

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

do $$
declare v_vinculos integer; v_por text;
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
      coalesce(v_vinculos,0), coalesce(v_por,'nenhum');
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