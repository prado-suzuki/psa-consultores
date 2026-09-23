-- FIXTURE DE SANDBOX -- APLICADA A MAO, NUNCA POR MIGRACAO
--
-- Cliente "[APR] Família Prado Agronegócios": cadastro completo de uma holding
-- familiar, ANTES de qualquer registro na junta. Serve para apresentar a
-- constituição (gravar quadro, gerar, validar, registrar) e, depois dela, as
-- alterações do quadro societário e a concentração das quotas na controladora.
--
-- Clonado do cenário Dinossauro Aposentado (o mesmo formato de bens e matrículas
-- que a demonstração de 23/09/2026 ensaiou), com pessoas, documentos e endereços
-- reescritos.
--
--   Prado Agropecuária Ltda (PR, "Contrato Social - (Agro)")
--     BS 60 Fazenda Santa Clara ........ Ricardo 100% ......... Aprovado para 2ª Instancia
--     BS 61 Fazenda Boa Esperança ...... Ricardo 50% Helena 50%  Aprovado para 2ª Instancia
--     BS 62 Sala Comercial ............. Tomás 100% ........... Aprovado para 2ª Instancia
--     BS 01 Fazenda Três Irmãos ........ Ricardo 100% ......... Pendente (reserva do aumento)
--   Prado Participações Ltda (CN, "Contrato Social - (Participações)"), sem movimento
--
-- Nenhum movimento de quota, documento ou órgão de governança: a PR ainda não tem
-- quadro gravado (a tela o propõe a partir dos bens) e a CN nasce pelo aporte.
--
-- Também põe o prefixo [APR] nos clientes usados na apresentação.
--
--   supabase db query --linked -f supabase/fixtures/cenario-apresentacao-familia-prado.sql
--
-- É também o botão de reset: apaga tudo do cliente (documentos, registros,
-- movimentos, ônus, flags, histórico de auditoria e o cadastro) e recria o
-- cadastro do zero. Se o cliente tiver dados numa tabela que o reset não cobre,
-- aborta sem apagar nada.

begin;

do $fixture$
declare
  src_cliente constant uuid := '8f9c2796-b9f3-4349-923b-b04e86bc6012';
  c_cliente   constant uuid := 'a9900000-0000-4000-8000-000000000001';
  p_ricardo   constant uuid := 'a9900000-0000-4000-8000-000000000011';
  p_helena    constant uuid := 'a9900000-0000-4000-8000-000000000012';
  p_tomas     constant uuid := 'a9900000-0000-4000-8000-000000000013';
  p_beatriz   constant uuid := 'a9900000-0000-4000-8000-000000000014';
  p_pr        constant uuid := 'a9900000-0000-4000-8000-000000000021';
  p_cn        constant uuid := 'a9900000-0000-4000-8000-000000000022';
  r record;
  v_tem boolean;
begin
  if not exists (select 1 from public.representante where email ilike '%@exemplo.dev%') then
    raise exception 'FIXTURE DE SANDBOX rodando no banco errado. Abortado sem escrever nada.';
  end if;
  if not exists (select 1 from public.cliente where id = src_cliente) then
    raise exception 'Cenário de origem (Dinossauro Aposentado) ausente. Abortado.';
  end if;

  -- RESET. O cliente volta ao "cadastro pronto, nada registrado". Tabela do cliente
  -- fora desta lista aborta, para o reset nunca deixar sobra calada.
  for r in
    select c.relname
      from information_schema.columns col
      join pg_class c on c.relname = col.table_name and c.relkind = 'r'
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where col.table_schema = 'public' and col.column_name = 'cliente_id'
       and col.table_name not in ('pessoa', 'bem', 'matricula', 'movimentacao_quotas', 'ato_societario',
         'onus_quotas', 'projeto_flag_valor', 'documento_gerado', 'documento_arquivo', 'documento_download',
         'capital_integralizacao', 'cliente_clusters')
  loop
    execute format('select exists (select 1 from public.%I where cliente_id = $1)', r.relname)
      into v_tem using c_cliente;
    if v_tem then
      raise exception 'O cliente tem dados em %, que o reset não cobre. Abortado sem apagar nada.', r.relname;
    end if;
  end loop;

end $fixture$;

-- As travas de imutabilidade do registro barram o delete; em réplica elas e as
-- cascatas não disparam, então os dependentes saem à mão, na ordem.
set local session_replication_role = replica;

do $fixture$
declare
  src_cliente constant uuid := '8f9c2796-b9f3-4349-923b-b04e86bc6012';
  c_cliente   constant uuid := 'a9900000-0000-4000-8000-000000000001';
  p_ricardo   constant uuid := 'a9900000-0000-4000-8000-000000000011';
  p_helena    constant uuid := 'a9900000-0000-4000-8000-000000000012';
  p_tomas     constant uuid := 'a9900000-0000-4000-8000-000000000013';
  p_beatriz   constant uuid := 'a9900000-0000-4000-8000-000000000014';
  p_pr        constant uuid := 'a9900000-0000-4000-8000-000000000021';
  p_cn        constant uuid := 'a9900000-0000-4000-8000-000000000022';
  r record;
  v_tem boolean;
begin

  create temp table if not exists reset_ids (id uuid primary key) on commit drop;
  truncate reset_ids;
  insert into reset_ids
  select id from public.pessoa where cliente_id = c_cliente
  union select id from public.bem where cliente_id = c_cliente
  union select id from public.matricula where cliente_id = c_cliente
  union select id from public.movimentacao_quotas where cliente_id = c_cliente
  union select id from public.ato_societario where cliente_id = c_cliente
  union select id from public.onus_quotas where cliente_id = c_cliente
  union select id from public.documento_gerado where cliente_id = c_cliente
  union select t.id from public.titularidade t join public.matricula m on m.id = t.matricula_id where m.cliente_id = c_cliente
  union select a.id from public.administracao a join public.pessoa p on p.id = a.pj_pessoa_id where p.cliente_id = c_cliente;

  delete from public.audit_logs where entity_id in (select id from reset_ids);

  delete from public.tmpl_documento_bloco where bloco_id in
    (select id from public.tmpl_bloco where escopo_documento_raiz_id in (select id from public.documento_gerado where cliente_id = c_cliente));
  delete from public.documento_override where documento_gerado_id in (select id from public.documento_gerado where cliente_id = c_cliente);
  delete from public.tmpl_bloco_flag where bloco_id in
    (select id from public.tmpl_bloco where escopo_documento_raiz_id in (select id from public.documento_gerado where cliente_id = c_cliente));
  delete from public.tmpl_bloco_versao where bloco_id in
    (select id from public.tmpl_bloco where escopo_documento_raiz_id in (select id from public.documento_gerado where cliente_id = c_cliente));
  delete from public.tmpl_bloco where escopo_documento_raiz_id in (select id from public.documento_gerado where cliente_id = c_cliente);
  delete from public.documento_notificacao_visto where documento_gerado_id in (select id from public.documento_gerado where cliente_id = c_cliente);
  delete from public.documento_download where cliente_id = c_cliente;
  delete from public.documento_arquivo where cliente_id = c_cliente;
  delete from public.projeto_flag_valor where cliente_id = c_cliente;
  delete from public.onus_quotas where cliente_id = c_cliente;
  delete from public.movimentacao_quotas where cliente_id = c_cliente;
  delete from public.ato_societario where cliente_id = c_cliente;
  delete from public.capital_integralizacao where cliente_id = c_cliente;
  delete from public.documento_gerado where cliente_id = c_cliente;

  delete from public.impedimento where matricula_id in (select id from public.matricula where cliente_id = c_cliente);
  delete from public.titularidade where matricula_id in (select id from public.matricula where cliente_id = c_cliente);
  delete from public.matricula where cliente_id = c_cliente;
  delete from public.bem where cliente_id = c_cliente;
  delete from public.quadro_societario where empresa_pessoa_id in (select id from public.pessoa where cliente_id = c_cliente)
     or socio_pessoa_id in (select id from public.pessoa where cliente_id = c_cliente);
  delete from public.administracao where pj_pessoa_id in (select id from public.pessoa where cliente_id = c_cliente)
     or administrador_pessoa_id in (select id from public.pessoa where cliente_id = c_cliente);
  delete from public.parentesco where pessoa_id in (select id from public.pessoa where cliente_id = c_cliente)
     or parente_pessoa_id in (select id from public.pessoa where cliente_id = c_cliente);
  delete from public.pessoa where cliente_id = c_cliente;

end $fixture$;

set local session_replication_role = origin;

do $fixture$
declare
  src_cliente constant uuid := '8f9c2796-b9f3-4349-923b-b04e86bc6012';
  c_cliente   constant uuid := 'a9900000-0000-4000-8000-000000000001';
  p_ricardo   constant uuid := 'a9900000-0000-4000-8000-000000000011';
  p_helena    constant uuid := 'a9900000-0000-4000-8000-000000000012';
  p_tomas     constant uuid := 'a9900000-0000-4000-8000-000000000013';
  p_beatriz   constant uuid := 'a9900000-0000-4000-8000-000000000014';
  p_pr        constant uuid := 'a9900000-0000-4000-8000-000000000021';
  p_cn        constant uuid := 'a9900000-0000-4000-8000-000000000022';
  r record;
  v_tem boolean;
begin

  update public.cliente set nome = '[APR] ' || nome
   where nome not like '[APR]%'
     and (id in (src_cliente, 'ace00000-0000-4000-8000-000000000001')
          or (ambiente = 'dev' and nome in ('Furão Notário Cartório Subterrâneo S.A.', 'Agrícola Zamo Governança')));

  insert into public.cliente (id, nome, fixo, ativo, categoria, excluido, ambiente, municipio, uf, observacoes)
  values (c_cliente, '[APR] Família Prado Agronegócios', '(65) 3624-1850', true, 'Bronze', false, 'dev',
          'Cuiabá', 'MT',
          'Cenário da apresentação das alterações contratuais: cadastro completo, nada registrado na junta. Fixture supabase/fixtures/cenario-apresentacao-familia-prado.sql.')
  on conflict (id) do nothing;

  insert into public.cliente_clusters (cliente_id, cluster_id)
  select c_cliente, cc.cluster_id from public.cliente_clusters cc
   where cc.cliente_id = src_cliente
     and not exists (select 1 from public.cliente_clusters x where x.cliente_id = c_cliente and x.cluster_id = cc.cluster_id);

  -- Pessoas: clonadas da origem para herdar colunas que o formulário exige, com
  -- toda a qualificação reescrita.
  for r in
    select * from (values
      (p_ricardo, 'd7ce85da-60ba-4197-903b-df2dcdb65afa'::uuid, jsonb_build_object(
        'denominacao', 'Ricardo Almeida Prado', 'cpf_cnpj', '534.536.730-26', 'genero', 'M',
        'estado_civil', 'Casado(a)', 'regime_bens', 'Comunhão Parcial', 'profissao', 'Agricultor',
        'filiacao_pai', 'José Carlos Prado', 'filiacao_mae', 'Maria Aparecida Almeida Prado',
        'data_nascimento', '1958-03-14', 'documento_identidade_numero', '0412876-5',
        'documento_identidade_orgao', 'SSP', 'documento_identidade_uf', 'MT', 'nacionalidade', 'Brasileira',
        'naturalidade_municipio', 'Cuiabá', 'naturalidade_uf', 'MT',
        'endereco_logradouro', 'Rua Barão de Melgaço', 'endereco_numero', '1450', 'endereco_complemento', 'Apto 1201',
        'endereco_bairro', 'Centro Sul', 'endereco_cep', '78020-800', 'endereco_municipio', 'Cuiabá', 'endereco_uf', 'MT',
        'is_fundador', true)),
      (p_helena, 'ac4de794-bb04-4d8e-bdf9-1f34632aef72'::uuid, jsonb_build_object(
        'denominacao', 'Helena Castro Prado', 'cpf_cnpj', '083.890.710-53', 'genero', 'F',
        'estado_civil', 'Casado(a)', 'regime_bens', 'Comunhão Parcial', 'profissao', 'Agricultora',
        'filiacao_pai', 'Antônio Ferreira Castro', 'filiacao_mae', 'Lúcia Helena Castro',
        'data_nascimento', '1961-07-22', 'documento_identidade_numero', '0538214-2',
        'documento_identidade_orgao', 'SSP', 'documento_identidade_uf', 'MT', 'nacionalidade', 'Brasileira',
        'naturalidade_municipio', 'Rondonópolis', 'naturalidade_uf', 'MT',
        'endereco_logradouro', 'Rua Barão de Melgaço', 'endereco_numero', '1450', 'endereco_complemento', 'Apto 1201',
        'endereco_bairro', 'Centro Sul', 'endereco_cep', '78020-800', 'endereco_municipio', 'Cuiabá', 'endereco_uf', 'MT',
        'is_fundador', true)),
      (p_tomas, 'ce46f6b2-fc7a-45e3-837b-c5befe2c82bf'::uuid, jsonb_build_object(
        'denominacao', 'Tomás Castro Prado', 'cpf_cnpj', '530.855.038-70', 'genero', 'M',
        'estado_civil', 'Casado(a)', 'regime_bens', 'Comunhão Parcial', 'profissao', 'Engenheiro Agrônomo',
        'filiacao_pai', 'Ricardo Almeida Prado', 'filiacao_mae', 'Helena Castro Prado',
        'data_nascimento', '1987-11-05', 'documento_identidade_numero', '1874302-9',
        'documento_identidade_orgao', 'SSP', 'documento_identidade_uf', 'MT', 'nacionalidade', 'Brasileira',
        'naturalidade_municipio', 'Cuiabá', 'naturalidade_uf', 'MT',
        'endereco_logradouro', 'Avenida Isaac Póvoas', 'endereco_numero', '980', 'endereco_complemento', 'Apto 502',
        'endereco_bairro', 'Centro Norte', 'endereco_cep', '78045-640', 'endereco_municipio', 'Cuiabá', 'endereco_uf', 'MT',
        'is_fundador', false)),
      (p_beatriz, '3c6533fa-661a-4d9a-8b68-11b4ee4ba862'::uuid, jsonb_build_object(
        'denominacao', 'Beatriz Moura Prado', 'cpf_cnpj', '685.969.241-32', 'genero', 'F',
        'estado_civil', 'Casado(a)', 'regime_bens', 'Comunhão Parcial', 'profissao', 'Médica Veterinária',
        'filiacao_pai', 'Roberto Lopes Moura', 'filiacao_mae', 'Sandra Regina Moura',
        'data_nascimento', '1990-02-18', 'documento_identidade_numero', '2051147-3',
        'documento_identidade_orgao', 'SSP', 'documento_identidade_uf', 'MT', 'nacionalidade', 'Brasileira',
        'naturalidade_municipio', 'Sinop', 'naturalidade_uf', 'MT',
        'endereco_logradouro', 'Avenida Isaac Póvoas', 'endereco_numero', '980', 'endereco_complemento', 'Apto 502',
        'endereco_bairro', 'Centro Norte', 'endereco_cep', '78045-640', 'endereco_municipio', 'Cuiabá', 'endereco_uf', 'MT',
        'is_fundador', false)),
      (p_pr, '29d31f73-8fbd-44c3-a856-81ddf7809378'::uuid, jsonb_build_object(
        'denominacao', 'Prado Agropecuária Ltda', 'cpf_cnpj', '48.850.422/0001-82', 'nire', '51201845231',
        'endereco_logradouro', 'Avenida Mato Grosso', 'endereco_numero', '1850', 'endereco_complemento', 'Sala 4',
        'endereco_bairro', 'Centro', 'endereco_cep', '78455-000', 'endereco_municipio', 'Lucas do Rio Verde', 'endereco_uf', 'MT')),
      (p_cn, '11c1394b-5bc7-4b93-a6f1-98a7fa64088b'::uuid, jsonb_build_object(
        'denominacao', 'Prado Participações Ltda', 'cpf_cnpj', '78.781.633/0001-71', 'nire', '51201845240',
        'endereco_logradouro', 'Rua Pedro Celestino', 'endereco_numero', '212', 'endereco_complemento', 'Sala 801',
        'endereco_bairro', 'Centro Norte', 'endereco_cep', '78005-010', 'endereco_municipio', 'Cuiabá', 'endereco_uf', 'MT'))
    ) as t(novo, origem, campos)
  loop
    insert into public.pessoa
    select (jsonb_populate_record(null::public.pessoa,
             to_jsonb(p) || r.campos || jsonb_build_object(
               'id', r.novo, 'cliente_id', c_cliente, 'contribuinte_id', null, 'conjuge_id', null,
               'filiacao_pai_pessoa_id', null, 'filiacao_mae_pessoa_id', null,
               'created_at', now(), 'updated_at', now(), 'created_by', null, 'updated_by', null))).*
      from public.pessoa p where p.id = r.origem
    on conflict (id) do nothing;
  end loop;

  update public.pessoa set conjuge_id = p_helena  where id = p_ricardo and conjuge_id is null;
  update public.pessoa set conjuge_id = p_ricardo where id = p_helena  and conjuge_id is null;
  update public.pessoa set conjuge_id = p_beatriz where id = p_tomas   and conjuge_id is null;
  update public.pessoa set conjuge_id = p_tomas   where id = p_beatriz and conjuge_id is null;
  update public.pessoa set filiacao_pai_pessoa_id = p_ricardo, filiacao_mae_pessoa_id = p_helena
   where id = p_tomas and filiacao_pai_pessoa_id is null;

  insert into public.parentesco (id, pessoa_id, parente_pessoa_id, tipo, natureza)
  values ('a9900000-0000-4000-8000-000000000071', p_tomas,   p_ricardo, 'Filho(a)',   'Consanguíneo'),
         ('a9900000-0000-4000-8000-000000000072', p_beatriz, p_ricardo, 'Genro/Nora', 'Afim')
  on conflict (id) do nothing;

  -- Administração: Ricardo e Helena nas duas sociedades, como na origem.
  for r in
    select a.*, row_number() over (order by a.pj_pessoa_id, a.administrador_pessoa_id) n
      from public.administracao a
     where a.pj_pessoa_id in ('29d31f73-8fbd-44c3-a856-81ddf7809378', '11c1394b-5bc7-4b93-a6f1-98a7fa64088b')
  loop
    insert into public.administracao
    select (jsonb_populate_record(null::public.administracao,
             to_jsonb(r) - 'n' || jsonb_build_object(
               'id', ('a9900000-0000-4000-8000-0000000000' || (60 + r.n)::text)::uuid,
               'pj_pessoa_id', case r.pj_pessoa_id when '29d31f73-8fbd-44c3-a856-81ddf7809378' then p_pr else p_cn end,
               'administrador_pessoa_id', case r.administrador_pessoa_id when 'd7ce85da-60ba-4197-903b-df2dcdb65afa' then p_ricardo else p_helena end,
               'created_at', now(), 'updated_at', now(), 'created_by', null, 'updated_by', null))).*
    on conflict (id) do nothing;
  end loop;

  -- Bens, matrículas e titularidade.
  for r in
    select * from (values
      ('BS 60', 'Fazenda Santa Clara',                 'Aprovado para 2ª Instancia', 1),
      ('BS 61', 'Fazenda Boa Esperança',               'Aprovado para 2ª Instancia', 2),
      ('BS 62', 'Sala Comercial Ed. Rio Verde Center', 'Aprovado para 2ª Instancia', 3),
      ('BS 01', 'Fazenda Três Irmãos',                 'Pendente',                   4)
    ) as t(ref, nome, status, n)
  loop
    insert into public.bem
    select (jsonb_populate_record(null::public.bem,
             to_jsonb(b) || jsonb_build_object(
               'id', ('a9900000-0000-4000-8000-00000000003' || r.n)::uuid,
               'cliente_id', c_cliente, 'denominacao', r.nome, 'status_integralizacao', r.status,
               'empresa_destino_pessoa_id', p_pr,
               'created_at', now(), 'updated_at', now(), 'created_by', null, 'updated_by', null))).*
      from public.bem b where b.cliente_id = src_cliente and b.referencia_dp = r.ref
    on conflict (id) do nothing;

    insert into public.matricula
    select (jsonb_populate_record(null::public.matricula,
             to_jsonb(m) || jsonb_build_object(
               'id', ('a9900000-0000-4000-8000-00000000004' || r.n)::uuid,
               'bem_id', ('a9900000-0000-4000-8000-00000000003' || r.n)::uuid,
               'cliente_id', c_cliente, 'matricula_anterior_id', null,
               'created_at', now(), 'updated_at', now(), 'created_by', null, 'updated_by', null))).*
      from public.matricula m join public.bem b on b.id = m.bem_id
     where b.cliente_id = src_cliente and b.referencia_dp = r.ref
    on conflict (id) do nothing;

    insert into public.titularidade
    select (jsonb_populate_record(null::public.titularidade,
             to_jsonb(t) || jsonb_build_object(
               'id', ('a9900000-0000-4000-8000-0000000005' || r.n || row_number() over (order by t.titular_pessoa_id))::uuid,
               'matricula_id', ('a9900000-0000-4000-8000-00000000004' || r.n)::uuid,
               'bem_id', case when t.bem_id is null then null else ('a9900000-0000-4000-8000-00000000003' || r.n) end,
               'titular_pessoa_id', case t.titular_pessoa_id
                 when 'd7ce85da-60ba-4197-903b-df2dcdb65afa' then p_ricardo
                 when 'ac4de794-bb04-4d8e-bdf9-1f34632aef72' then p_helena
                 else p_tomas end,
               'created_at', now(), 'updated_at', now(), 'created_by', null, 'updated_by', null))).*
      from public.titularidade t
      join public.matricula m on m.id = t.matricula_id
      join public.bem b on b.id = m.bem_id
     where b.cliente_id = src_cliente and b.referencia_dp = r.ref
    on conflict (id) do nothing;
  end loop;

  update public.matricula
     set descricao_psa_completa = replace(replace(replace(descricao_psa_completa,
           'Fazenda Pterodáctilo', 'Fazenda Santa Clara'),
           'Fazenda Ossada Boa', 'Fazenda Boa Esperança'),
           'Sala Comercial Cratera', 'Sala Comercial Ed. Rio Verde Center')
   where cliente_id = c_cliente
     and descricao_psa_completa ~ 'Pterodáctilo|Ossada Boa|Cratera';
end $fixture$;

commit;
