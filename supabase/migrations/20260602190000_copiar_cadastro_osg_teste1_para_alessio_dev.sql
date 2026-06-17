-- Copia todo o cadastro do cliente "Ÿ Osg - Teste 1" (ambiente=prod) para o
-- cliente "Alessio Sansão" (ambiente=dev), DENTRO DO MESMO BANCO.
--
-- "dev"/"prod" não são projetos Supabase distintos: é a coluna `ambiente` em
-- cliente/contribuinte. As tabelas filhas (pessoa/bem/matricula/...) não têm
-- `ambiente` — herdam o ambiente via cliente_id. Logo a cópia é só reinserir as
-- linhas filhas com cliente_id do destino e UUIDs novos, preservando os FKs
-- internos (cônjuge, filiação, bem↔matrícula, titularidade, parentesco).
--
-- Origem  (prod): dab60768-ec57-48b6-ba76-12ea5c7463e4
-- Destino (dev) : 63289a75-6320-4ecb-80e1-0c4c6eced8fa
--
-- Escopo: pessoa (11), bem (3), matricula (3), titularidade (4), parentesco (7).
-- Fora de escopo: cartório (global — reaproveitado pelo cartorio_id), impedimento
-- (0), capital_integralizacao (0), administracao/quadro_societario (sem cliente_id).

-- Guarda: aborta se o destino já tiver cadastro, evitando duplicar numa reaplicação.
do $$
begin
  if exists (select 1 from pessoa where cliente_id = '63289a75-6320-4ecb-80e1-0c4c6eced8fa'::uuid)
     or exists (select 1 from bem where cliente_id = '63289a75-6320-4ecb-80e1-0c4c6eced8fa'::uuid) then
    raise exception 'Destino (Alessio Sansão dev) já possui cadastro — abortando para não duplicar.';
  end if;
end $$;

-- Mapas old_id -> new_id (UUIDs novos para cada linha da origem).
create temporary table _map_pessoa as
  select id as old_id, gen_random_uuid() as new_id
  from pessoa where cliente_id = 'dab60768-ec57-48b6-ba76-12ea5c7463e4'::uuid;

create temporary table _map_bem as
  select id as old_id, gen_random_uuid() as new_id
  from bem where cliente_id = 'dab60768-ec57-48b6-ba76-12ea5c7463e4'::uuid;

create temporary table _map_matricula as
  select id as old_id, gen_random_uuid() as new_id
  from matricula where bem_id in (select old_id from _map_bem);

-- ----------------------------------------------------------------------------
-- PESSOA — auto-referências (conjuge/filiação) entram como NULL e são religadas
-- depois, evitando violação de FK por ordem de inserção dentro do mesmo INSERT.
-- ----------------------------------------------------------------------------
insert into pessoa (
  id, cliente_id,
  contribuinte_id, conjuge_id, filiacao_mae_pessoa_id, filiacao_pai_pessoa_id,
  cpf_cnpj, data_constituicao, data_nascimento, denominacao,
  documento_identidade_numero, documento_identidade_orgao, documento_identidade_tipo, documento_identidade_uf,
  endereco_bairro, endereco_cep, endereco_complemento, endereco_logradouro,
  endereco_municipio, endereco_numero, endereco_uf,
  estado_civil, filiacao_mae, filiacao_pai, genero, is_fundador, junta_comercial_uf,
  nacionalidade, naturalidade_municipio, naturalidade_uf, nire, objeto_social, profissao,
  regime_bens, status_constituicao, tipo_pessoa
)
select
  m.new_id, '63289a75-6320-4ecb-80e1-0c4c6eced8fa'::uuid,
  p.contribuinte_id, null, null, null,
  p.cpf_cnpj, p.data_constituicao, p.data_nascimento, p.denominacao,
  p.documento_identidade_numero, p.documento_identidade_orgao, p.documento_identidade_tipo, p.documento_identidade_uf,
  p.endereco_bairro, p.endereco_cep, p.endereco_complemento, p.endereco_logradouro,
  p.endereco_municipio, p.endereco_numero, p.endereco_uf,
  p.estado_civil, p.filiacao_mae, p.filiacao_pai, p.genero, p.is_fundador, p.junta_comercial_uf,
  p.nacionalidade, p.naturalidade_municipio, p.naturalidade_uf, p.nire, p.objeto_social, p.profissao,
  p.regime_bens, p.status_constituicao, p.tipo_pessoa
from pessoa p
join _map_pessoa m on m.old_id = p.id
where p.cliente_id = 'dab60768-ec57-48b6-ba76-12ea5c7463e4'::uuid;

-- Religa as auto-referências de pessoa usando o mapa.
update pessoa np set
  conjuge_id             = mc.new_id,
  filiacao_mae_pessoa_id = mm.new_id,
  filiacao_pai_pessoa_id = mp.new_id
from pessoa op
join _map_pessoa link on link.old_id = op.id
left join _map_pessoa mc on mc.old_id = op.conjuge_id
left join _map_pessoa mm on mm.old_id = op.filiacao_mae_pessoa_id
left join _map_pessoa mp on mp.old_id = op.filiacao_pai_pessoa_id
where np.id = link.new_id
  and (op.conjuge_id is not null
       or op.filiacao_mae_pessoa_id is not null
       or op.filiacao_pai_pessoa_id is not null);

-- ----------------------------------------------------------------------------
-- BEM — empresa_destino_pessoa_id referencia pessoa (já inserida).
-- ----------------------------------------------------------------------------
insert into bem (
  id, cliente_id, empresa_destino_pessoa_id,
  ccir_codigo, denominacao, descricao_outros, imposto_anual_exercicio, inscricao_municipal,
  motivo_nao_integralizacao, observacao, participa_estruturacao, referencia_dp,
  status_integralizacao, tipo_bem,
  vlr_benfeitorias, vlr_contabil, vlr_contabil_ajustado, vlr_imposto_anual, vlr_mercado
)
select
  mb.new_id, '63289a75-6320-4ecb-80e1-0c4c6eced8fa'::uuid, ed.new_id,
  b.ccir_codigo, b.denominacao, b.descricao_outros, b.imposto_anual_exercicio, b.inscricao_municipal,
  b.motivo_nao_integralizacao, b.observacao, b.participa_estruturacao, b.referencia_dp,
  b.status_integralizacao, b.tipo_bem,
  b.vlr_benfeitorias, b.vlr_contabil, b.vlr_contabil_ajustado, b.vlr_imposto_anual, b.vlr_mercado
from bem b
join _map_bem mb on mb.old_id = b.id
left join _map_pessoa ed on ed.old_id = b.empresa_destino_pessoa_id
where b.cliente_id = 'dab60768-ec57-48b6-ba76-12ea5c7463e4'::uuid;

-- ----------------------------------------------------------------------------
-- MATRICULA — cartorio_id é global (reaproveitado). matricula_anterior_id é
-- auto-referência: entra NULL e é religada depois.
-- ----------------------------------------------------------------------------
insert into matricula (
  id, bem_id, cartorio_id, matricula_anterior_id,
  area_documento, area_explorada, area_real, area_unidade, confrontacoes_texto, data_matricula,
  descricao_psa_completa, folha, georref_prejudica_transferencia, georreferenciado, imposto_anual_exercicio,
  livro, matricula_anterior_texto, municipio_imovel, numero, origem_descricao, tipo_bem, tipo_exploracao_posse,
  uf_imovel, vlr_benfeitorias, vlr_contabil, vlr_contabil_ajustado, vlr_imposto_anual, vlr_mercado
)
select
  mm.new_id, mb.new_id, m.cartorio_id, null,
  m.area_documento, m.area_explorada, m.area_real, m.area_unidade, m.confrontacoes_texto, m.data_matricula,
  m.descricao_psa_completa, m.folha, m.georref_prejudica_transferencia, m.georreferenciado, m.imposto_anual_exercicio,
  m.livro, m.matricula_anterior_texto, m.municipio_imovel, m.numero, m.origem_descricao, m.tipo_bem, m.tipo_exploracao_posse,
  m.uf_imovel, m.vlr_benfeitorias, m.vlr_contabil, m.vlr_contabil_ajustado, m.vlr_imposto_anual, m.vlr_mercado
from matricula m
join _map_matricula mm on mm.old_id = m.id
join _map_bem mb on mb.old_id = m.bem_id;

-- Religa matricula_anterior_id (quando a anterior também foi copiada).
update matricula nm set matricula_anterior_id = ma.new_id
from matricula om
join _map_matricula link on link.old_id = om.id
join _map_matricula ma on ma.old_id = om.matricula_anterior_id
where nm.id = link.new_id and om.matricula_anterior_id is not null;

-- ----------------------------------------------------------------------------
-- TITULARIDADE — liga pessoa (titular) a matrícula ou bem copiados.
-- ----------------------------------------------------------------------------
insert into titularidade (id, titular_pessoa_id, matricula_id, bem_id, fracao, tipo)
select gen_random_uuid(), mp.new_id, mm.new_id, mb.new_id, t.fracao, t.tipo
from titularidade t
join _map_pessoa mp on mp.old_id = t.titular_pessoa_id
left join _map_matricula mm on mm.old_id = t.matricula_id
left join _map_bem mb on mb.old_id = t.bem_id
where t.titular_pessoa_id in (select old_id from _map_pessoa)
  and (t.matricula_id in (select old_id from _map_matricula)
       or t.bem_id in (select old_id from _map_bem));

-- ----------------------------------------------------------------------------
-- PARENTESCO — ambos os lados precisam ter sido copiados.
-- ----------------------------------------------------------------------------
insert into parentesco (id, pessoa_id, parente_pessoa_id, natureza, tipo)
select gen_random_uuid(), mp.new_id, mpp.new_id, pa.natureza, pa.tipo
from parentesco pa
join _map_pessoa mp on mp.old_id = pa.pessoa_id
join _map_pessoa mpp on mpp.old_id = pa.parente_pessoa_id
where pa.pessoa_id in (select old_id from _map_pessoa)
  and pa.parente_pessoa_id in (select old_id from _map_pessoa);

drop table _map_pessoa;
drop table _map_bem;
drop table _map_matricula;
