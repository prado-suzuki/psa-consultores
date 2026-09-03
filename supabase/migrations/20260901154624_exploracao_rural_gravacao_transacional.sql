-- Gravação transacional do cadastro de exploração rural (AGR-01)
--
-- Terceira e última migration da Migration A. Aditiva: cria uma função, não toca
-- em tabela nem coluna. Pode ir a produção a qualquer momento.
--
-- POR QUE UMA FUNÇÃO, E NÃO QUATRO CHAMADAS DO FRONT
--
-- Um instrumento rural é quatro tabelas: o cabeçalho, as partes, os imóveis e as
-- origens externas. Pelo PostgREST cada requisição é a sua própria transação, então
-- salvar em quatro chamadas deixa o instrumento pela metade quando a terceira falha
-- — e é justamente o que a RLS costuma fazer falhar. A função abaixo recebe o
-- retrato inteiro num `jsonb` e grava tudo no mesmo comando: ou entra tudo, ou nada.
-- Mesmo desenho de `criar_matricula_com_titular`, que já faz isso para matrícula +
-- titularidade.
--
-- `SECURITY INVOKER` (o padrão), de propósito: a RLS continua valendo linha por
-- linha, com o papel de quem chamou. A função não é um portão para escrever o que a
-- policy proíbe — ela só junta numa transação o que já era permitido.
--
-- AS DUAS REGRAS QUE SÓ AQUI DÃO PARA VALIDAR
--
-- 1. Soma das frações dos compossuidores. É regra ENTRE LINHAS, então `CHECK` não
--    alcança. A tolerância NÃO é fixa: cada fração é gravada com 4 casas e carrega
--    até meia unidade da última casa, logo N frações carregam até N/2 unidades de
--    0,0001. Três terços somam 99,9999 e seis sextos somam 100,0002 — as duas
--    partilhas são corretas e estão escritas assim no documento. Exigir 100,0000
--    exato recusaria as duas. A conta é feita em INTEIRO para não depender de ponto
--    flutuante.
-- 2. Área cedida × área da matrícula. `CHECK` não enxerga outra tabela. Compara na
--    unidade da matrícula, convertendo antes: 234 ha "cabem" numa matrícula de
--    2.958.600 m² se a comparação for feita nos números crus.
--
-- Espelho em TypeScript das mesmas duas regras, para a tela avisar antes de gravar:
-- `src/lib/exploracaoRuralModalModels.ts` (`statusDasFracoes`, `imoveisComAreaExcedida`).
--
-- Idempotente: `create or replace`. Este SQL roda duas vezes — `db push` no sandbox
-- e, depois, à mão em produção pelo chat do Lovable.

-- ---------------------------------------------------------------------------
-- Fator de conversão de unidade de área, em m²
-- ---------------------------------------------------------------------------
-- Espelha `fatorM2` de `areaUtils.ts`. `ha_m2` é a unidade composta da casa (parte
-- inteira em ha, decimais em m²) e, para efeito de comparação de grandeza, mede em
-- hectare — é como o `areaUtils` a trata em `unidadesEquivalentes`.
create or replace function public.osg_fator_area_m2(_unidade text)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select case coalesce(_unidade, 'ha')
           when 'm2' then 1
           else 10000
         end::numeric;
$$;

comment on function public.osg_fator_area_m2(text) is
  'Quantos m² vale 1 unidade de área. Espelha fatorM2 de areaUtils.ts, para o banco comparar área em unidades diferentes.';

-- ---------------------------------------------------------------------------
-- salvar_exploracao_rural
-- ---------------------------------------------------------------------------
-- Formato do payload:
--
-- {
--   "id": "<uuid ou null>",
--   "cabecalho": { ...colunas de exploracao_rural... },
--   "partes":  [ { "id": "<uuid|null>", "pessoa_id": "...", "papel": "...",
--                  "fracao": 25, "ordem": 0 } ],
--   "origens": [ { "localId": "origem-1", "id": "<uuid|null>", ...colunas... } ],
--   "imoveis": [ { "id": "<uuid|null>", "matricula_id": "...", "area_explorada": 234,
--                  "area_unidade": "ha", "ordem": 0, "origem_tipo": "parceria",
--                  "origem_exploracao_rural_id": null,
--                  "origemExternaLocalId": "origem-1",
--                  "origem_contraparte_pessoa_id": null } ]
-- }
--
-- `origemExternaLocalId` é o id LOCAL que o front usou antes de o banco existir:
-- uma origem serve vários imóveis (15 imóveis / 6 origens no `[BV-COM]`), então o
-- vínculo só pode ser resolvido depois de inserir as origens. É esta função que
-- traduz local → uuid.
create or replace function public.salvar_exploracao_rural(p jsonb)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_id            uuid := nullif(p->>'id', '')::uuid;
  v_cab           jsonb := p->'cabecalho';
  v_tipo          text := v_cab->>'tipo_exploracao';
  v_soma          bigint;
  v_qtd           integer;
  v_tolerancia    integer;
  v_excedido      record;
  v_mapa          jsonb := '{}'::jsonb;
  v_origem        jsonb;
  v_origem_id     uuid;
  v_imovel        jsonb;
begin
  if auth.uid() is null then
    raise exception
      'Sessão sem usuário: a exploração rural não foi gravada porque a trilha de auditoria exige quem fez.';
  end if;

  -- Parte repetida no payload, antes de escrever: a UNIQUE (exploracao_rural_id,
  -- pessoa_id, papel) barraria isso com um 23505 cru, e "duplicate key value
  -- violates unique constraint" não diz ao consultor que ele listou a mesma pessoa
  -- duas vezes no mesmo papel. A mesma pessoa em papéis DIFERENTES é permitida (no
  -- [ROS-COM] os administradores nomeados são compossuidores), então a checagem é
  -- pelo par, não pela pessoa.
  if exists (
    select 1
      from jsonb_array_elements(coalesce(p->'partes','[]'::jsonb)) x
     group by x->>'pessoa_id', x->>'papel'
    having count(*) > 1
  ) then
    raise exception
      'A mesma pessoa aparece duas vezes no mesmo papel. Cada pessoa entra uma vez por papel (a mesma pessoa pode ser compossuidora E administradora nomeada, em duas linhas).';
  end if;

  -- ── 1. Cabeçalho ────────────────────────────────────────────────────────────
  if v_id is null then
    insert into public.exploracao_rural (
      cliente_id, tipo_exploracao, referencia, outorgante_pessoa_id,
      data_assinatura, data_encerramento, data_inicio_vigencia, vigencia_prorrogavel,
      percentual_outorgante, percentual_explorador, culturas, inclui_pecuaria, modalidade_pecuaria,
      permite_penhor, prazo_indivisao_quantidade, prazo_indivisao_unidade,
      indivisao_prorrogavel, indivisao_aviso_quantidade, indivisao_aviso_unidade,
      regra_administracao, liquidacao_periodicidade, liquidacao_numero_parcelas,
      estudo_fiscal_documento_id, documento_comprobatorio_id
    )
    select
      (v_cab->>'cliente_id')::uuid, (v_cab->>'tipo_exploracao')::osg_tipo_exploracao,
      v_cab->>'referencia', nullif(v_cab->>'outorgante_pessoa_id','')::uuid,
      nullif(v_cab->>'data_assinatura','')::date, nullif(v_cab->>'data_encerramento','')::date,
      nullif(v_cab->>'data_inicio_vigencia','')::date, coalesce((v_cab->>'vigencia_prorrogavel')::boolean, false),
      nullif(v_cab->>'percentual_outorgante','')::numeric, nullif(v_cab->>'percentual_explorador','')::numeric,
      v_cab->>'culturas', coalesce((v_cab->>'inclui_pecuaria')::boolean, true),
      nullif(v_cab->>'modalidade_pecuaria',''),
      coalesce((v_cab->>'permite_penhor')::boolean, false),
      nullif(v_cab->>'prazo_indivisao_quantidade','')::integer, v_cab->>'prazo_indivisao_unidade',
      nullif(v_cab->>'indivisao_prorrogavel','')::boolean,
      nullif(v_cab->>'indivisao_aviso_quantidade','')::integer, v_cab->>'indivisao_aviso_unidade',
      v_cab->>'regra_administracao', v_cab->>'liquidacao_periodicidade',
      nullif(v_cab->>'liquidacao_numero_parcelas','')::integer,
      nullif(v_cab->>'estudo_fiscal_documento_id','')::uuid,
      nullif(v_cab->>'documento_comprobatorio_id','')::uuid
    returning id into v_id;
  else
    update public.exploracao_rural set
      tipo_exploracao = (v_cab->>'tipo_exploracao')::osg_tipo_exploracao,
      referencia = v_cab->>'referencia',
      outorgante_pessoa_id = nullif(v_cab->>'outorgante_pessoa_id','')::uuid,
      data_assinatura = nullif(v_cab->>'data_assinatura','')::date,
      data_encerramento = nullif(v_cab->>'data_encerramento','')::date,
      data_inicio_vigencia = nullif(v_cab->>'data_inicio_vigencia','')::date,
      vigencia_prorrogavel = coalesce((v_cab->>'vigencia_prorrogavel')::boolean, false),
      percentual_outorgante = nullif(v_cab->>'percentual_outorgante','')::numeric,
      percentual_explorador = nullif(v_cab->>'percentual_explorador','')::numeric,
      culturas = v_cab->>'culturas',
      inclui_pecuaria = coalesce((v_cab->>'inclui_pecuaria')::boolean, true),
      modalidade_pecuaria = nullif(v_cab->>'modalidade_pecuaria',''),
      permite_penhor = coalesce((v_cab->>'permite_penhor')::boolean, false),
      prazo_indivisao_quantidade = nullif(v_cab->>'prazo_indivisao_quantidade','')::integer,
      prazo_indivisao_unidade = v_cab->>'prazo_indivisao_unidade',
      indivisao_prorrogavel = nullif(v_cab->>'indivisao_prorrogavel','')::boolean,
      indivisao_aviso_quantidade = nullif(v_cab->>'indivisao_aviso_quantidade','')::integer,
      indivisao_aviso_unidade = v_cab->>'indivisao_aviso_unidade',
      regra_administracao = v_cab->>'regra_administracao',
      liquidacao_periodicidade = v_cab->>'liquidacao_periodicidade',
      liquidacao_numero_parcelas = nullif(v_cab->>'liquidacao_numero_parcelas','')::integer,
      estudo_fiscal_documento_id = nullif(v_cab->>'estudo_fiscal_documento_id','')::uuid,
      documento_comprobatorio_id = nullif(v_cab->>'documento_comprobatorio_id','')::uuid
    where id = v_id;

    if not found then
      raise exception 'Exploração rural % não encontrada (ou fora do seu cluster).', v_id;
    end if;
  end if;

  -- ── 2. Partes ───────────────────────────────────────────────────────────────
  -- Apaga o que saiu da tela antes de inserir o que entrou: a UNIQUE
  -- (exploracao_rural_id, pessoa_id, papel) recusaria a mesma parte duas vezes se a
  -- ordem fosse inversa.
  delete from public.exploracao_rural_parte
   where exploracao_rural_id = v_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(coalesce(p->'partes','[]'::jsonb)) x
        where nullif(x->>'id','') is not null
     );

  insert into public.exploracao_rural_parte (
    id, exploracao_rural_id, pessoa_id, papel, fracao, ordem
  )
  select
    coalesce(nullif(x->>'id','')::uuid, gen_random_uuid()),
    v_id, (x->>'pessoa_id')::uuid, x->>'papel',
    nullif(x->>'fracao','')::numeric, coalesce((x->>'ordem')::integer, 0)
  from jsonb_array_elements(coalesce(p->'partes','[]'::jsonb)) x
  on conflict (id) do update set
    pessoa_id = excluded.pessoa_id,
    papel = excluded.papel,
    fracao = excluded.fracao,
    ordem = excluded.ordem;

  -- ── 3. Origens externas, guardando o mapa local → uuid ──────────────────────
  delete from public.exploracao_rural_origem_externa
   where exploracao_rural_id = v_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(coalesce(p->'origens','[]'::jsonb)) x
        where nullif(x->>'id','') is not null
     );

  for v_origem in select value from jsonb_array_elements(coalesce(p->'origens','[]'::jsonb))
  loop
    if nullif(v_origem->>'id','') is null then
      insert into public.exploracao_rural_origem_externa (
        exploracao_rural_id, titulo_instrumento, data_assinatura, outorgante_pessoa_id,
        outorgante_capital_social_na_assinatura, outorgante_representante
      ) values (
        v_id, v_origem->>'titulo_instrumento', nullif(v_origem->>'data_assinatura','')::date,
        nullif(v_origem->>'outorgante_pessoa_id','')::uuid,
        nullif(v_origem->>'outorgante_capital_social_na_assinatura','')::numeric,
        v_origem->>'outorgante_representante'
      ) returning id into v_origem_id;
    else
      v_origem_id := (v_origem->>'id')::uuid;
      update public.exploracao_rural_origem_externa set
        titulo_instrumento = v_origem->>'titulo_instrumento',
        data_assinatura = nullif(v_origem->>'data_assinatura','')::date,
        outorgante_pessoa_id = nullif(v_origem->>'outorgante_pessoa_id','')::uuid,
        outorgante_capital_social_na_assinatura =
          nullif(v_origem->>'outorgante_capital_social_na_assinatura','')::numeric,
        outorgante_representante = v_origem->>'outorgante_representante'
      where id = v_origem_id and exploracao_rural_id = v_id;
    end if;

    v_mapa := v_mapa || jsonb_build_object(v_origem->>'localId', v_origem_id::text);
  end loop;

  -- ── 4. Imóveis ──────────────────────────────────────────────────────────────
  delete from public.exploracao_rural_imovel
   where exploracao_rural_id = v_id
     and id not in (
       select (x->>'id')::uuid from jsonb_array_elements(coalesce(p->'imoveis','[]'::jsonb)) x
        where nullif(x->>'id','') is not null
     );

  for v_imovel in select value from jsonb_array_elements(coalesce(p->'imoveis','[]'::jsonb))
  loop
    insert into public.exploracao_rural_imovel (
      id, exploracao_rural_id, matricula_id, area_explorada, area_unidade, ordem,
      origem_tipo, origem_exploracao_rural_id, origem_externa_id,
      origem_contraparte_pessoa_id
    ) values (
      coalesce(nullif(v_imovel->>'id','')::uuid, gen_random_uuid()),
      v_id, (v_imovel->>'matricula_id')::uuid,
      nullif(v_imovel->>'area_explorada','')::numeric,
      coalesce(nullif(v_imovel->>'area_unidade',''), 'ha'),
      coalesce((v_imovel->>'ordem')::integer, 0),
      nullif(v_imovel->>'origem_tipo',''),
      nullif(v_imovel->>'origem_exploracao_rural_id','')::uuid,
      -- Aqui o id local vira uuid, pelo mapa montado no passo 3.
      nullif(v_mapa->>(v_imovel->>'origemExternaLocalId'), '')::uuid,
      nullif(v_imovel->>'origem_contraparte_pessoa_id','')::uuid
    )
    on conflict (id) do update set
      matricula_id = excluded.matricula_id,
      area_explorada = excluded.area_explorada,
      area_unidade = excluded.area_unidade,
      ordem = excluded.ordem,
      origem_tipo = excluded.origem_tipo,
      origem_exploracao_rural_id = excluded.origem_exploracao_rural_id,
      origem_externa_id = excluded.origem_externa_id,
      origem_contraparte_pessoa_id = excluded.origem_contraparte_pessoa_id;
  end loop;

  -- ── 5. Regras que só aqui dão para validar ──────────────────────────────────
  -- Depois da gravação, antes do fim da transação: erro aqui desfaz tudo, e a
  -- mensagem sai com o número que o consultor vê na tela.
  if v_tipo = 'composse' then
    select coalesce(sum(round(fracao * 10000)), 0), count(*)
      into v_soma, v_qtd
      from public.exploracao_rural_parte
     where exploracao_rural_id = v_id and papel = 'compossuidor';

    if v_qtd = 0 then
      raise exception 'A composse precisa de pelo menos um compossuidor.';
    end if;

    -- Meia unidade da última casa por fração, arredondada para cima.
    v_tolerancia := ceil(v_qtd::numeric / 2);
    if abs(v_soma - 1000000) > v_tolerancia then
      -- `%` aqui é placeholder do RAISE, então a palavra "por cento" entra escrita:
      -- `%%` (percentual literal) e `%` (argumento) na mesma frase é armadilha.
      -- `trim_scale` tira o zero à direita que a divisão numeric produz.
      raise exception
        'As frações dos compossuidores somam % por cento, e precisam somar 100.',
        trim_scale(round(v_soma / 10000.0, 4))::text;
    end if;
  end if;

  for v_excedido in
    select m.numero as matricula, i.area_explorada, i.area_unidade,
           m.area_documento, m.area_unidade as unidade_matricula
      from public.exploracao_rural_imovel i
      join public.matricula m on m.id = i.matricula_id
     where i.exploracao_rural_id = v_id
       and i.area_explorada is not null
       and m.area_documento is not null
       and i.area_explorada * osg_fator_area_m2(i.area_unidade)
             > m.area_documento * osg_fator_area_m2(m.area_unidade)
  loop
    raise exception
      'A área cedida da matrícula % (% %) é maior que a área do próprio imóvel (% %).',
      v_excedido.matricula, v_excedido.area_explorada, v_excedido.area_unidade,
      v_excedido.area_documento, v_excedido.unidade_matricula;
  end loop;

  return v_id;
end;
$$;

comment on function public.salvar_exploracao_rural(jsonb) is
  'Grava cabeçalho + partes + imóveis + origens externas de uma exploração rural numa transação só, traduz o id local da origem externa para uuid, e valida a soma das frações e a área cedida × área da matrícula. Espelho em TS: src/lib/exploracaoRuralModalModels.ts.';
