-- Duas validações de "fecha 100%" na gravação da exploração rural (AGR-01)
--
-- Aditiva: só substitui o corpo de `salvar_exploracao_rural` por `create or replace`.
-- Não cria, não altera e não remove tabela ou coluna.
--
-- As duas regras vêm da mesma reunião de validação com a OSG, em 19/08/2026, e nenhuma
-- delas existia — dava para gravar as duas situações erradas sem nenhum aviso:
--
-- 1. A PARTILHA DA PARCERIA FECHA 100%.
--    "Na parceria é de forma geral" — o corte é entre os dois LADOS (quem cede a terra
--    e quem explora), não por pessoa. Por isso são duas colunas do instrumento e não
--    fração por parte. Mas continua sendo partilha: o que não vai para um lado vai para
--    o outro, e não existe terceiro destino. Antes desta migration, 30% + 30% gravava.
--
-- 2. A ÁREA CEDIDA DO MESMO IMÓVEL, SOMADA ENTRE INSTRUMENTOS, NÃO PASSA DA ÁREA DELE.
--    "o imóvel ele pode ter duas parcerias associadas a ele com áreas diferentes.
--    Nunca pode ultrapassar 100%". O `CHECK` da tabela não alcança isso por dois
--    motivos: a área da matrícula está em outra tabela, e a soma envolve LINHAS DE
--    OUTROS INSTRUMENTOS. Antes desta migration, duas parcerias podiam ceder 400 ha
--    cada de uma fazenda de 500 ha.
--
-- Duas restrições no que entra na soma do item 2, e as duas mudam o resultado:
--
--   · Só instrumento ATIVO (`data_encerramento` nula ou futura). A frase da OSG é
--     "duas parcerias ATIVAS": uma parceria encerrada devolveu a área, e contá-la
--     impediria de cadastrar a que a substitui.
--   · Só o MESMO `tipo_exploracao`. A parceria dá a posse sobre uma área; a composse
--     organiza a exploração de áreas que já vieram de parcerias. Somar as duas contaria
--     a mesma terra duas vezes e acusaria excesso onde não há.
--
-- Espelho em TypeScript, para a tela avisar antes de a requisição sair:
-- `statusDaPartilha` e `areaCedidaPorOutrosInstrumentos` em
-- `src/lib/exploracaoRuralModalModels.ts`, com 16 testes.
--
-- A comparação de área é feita em m² (via `osg_fator_area_m2`), nunca nos números
-- crus: o item pode estar em ha e o vizinho em m².
--
-- Idempotente (`create or replace`), porque este SQL roda duas vezes — sandbox e,
-- depois, produção pelo chat do Lovable.

create or replace function public.salvar_exploracao_rural(p jsonb)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_id            uuid := nullif(p->>'id', '')::uuid;
  v_cab           jsonb := p->'cabecalho';
  v_tipo          text := p->'cabecalho'->>'tipo_exploracao';
  v_soma          bigint;
  v_qtd           integer;
  v_tolerancia    integer;
  v_pct_out       numeric;
  v_pct_exp       numeric;
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

  if exists (
    select 1
      from jsonb_array_elements(coalesce(p->'partes','[]'::jsonb)) x
     group by x->>'pessoa_id', x->>'papel'
    having count(*) > 1
  ) then
    raise exception
      'A mesma pessoa aparece duas vezes no mesmo papel. Cada pessoa entra uma vez por papel (a mesma pessoa pode ser compossuidora E administradora nomeada, em duas linhas).';
  end if;

  -- ── Partilha da parceria: os dois lados fecham 100% ─────────────────────────
  -- Antes de escrever qualquer linha: é regra do cabeçalho, dá para conferir já.
  -- Só avalia com os DOIS preenchidos — com um lado só é formulário pela metade,
  -- não erro. Tolerância de 1 centésimo de milésimo, o mesmo arredondamento de 4
  -- casas que as frações da composse carregam.
  if v_tipo = 'parceria' then
    v_pct_out := nullif(v_cab->>'percentual_outorgante','')::numeric;
    v_pct_exp := nullif(v_cab->>'percentual_explorador','')::numeric;
    if v_pct_out is not null and v_pct_exp is not null then
      if abs(round(v_pct_out * 10000) + round(v_pct_exp * 10000) - 1000000) > 1 then
        raise exception
          'A partilha da parceria soma % por cento, e precisa somar 100.',
          trim_scale(round(v_pct_out + v_pct_exp, 4))::text;
      end if;
    end if;
  end if;

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

  -- ── Frações dos compossuidores fecham 100% ──────────────────────────────────
  if v_tipo = 'composse' then
    select coalesce(sum(round(fracao * 10000)), 0), count(*)
      into v_soma, v_qtd
      from public.exploracao_rural_parte
     where exploracao_rural_id = v_id and papel = 'compossuidor';

    if v_qtd = 0 then
      raise exception 'A composse precisa de pelo menos um compossuidor.';
    end if;

    v_tolerancia := ceil(v_qtd::numeric / 2);
    if abs(v_soma - 1000000) > v_tolerancia then
      raise exception
        'As frações dos compossuidores somam % por cento, e precisam somar 100.',
        trim_scale(round(v_soma / 10000.0, 4))::text;
    end if;
  end if;

  -- ── Área cedida do imóvel: sozinha e somada entre instrumentos ──────────────
  -- A soma percorre os instrumentos ATIVOS do MESMO tipo, do MESMO cliente, e inclui
  -- este (que já foi gravado acima). Comparação em m², via `osg_fator_area_m2`.
  for v_excedido in
    select m.numero                                    as matricula,
           m.area_documento * osg_fator_area_m2(m.area_unidade)  as disponivel_m2,
           sum(i.area_explorada * osg_fator_area_m2(i.area_unidade)) as cedida_m2,
           m.area_documento                            as area_matricula,
           m.area_unidade                              as unidade_matricula
      from public.exploracao_rural_imovel i
      join public.exploracao_rural e on e.id = i.exploracao_rural_id
      join public.matricula m on m.id = i.matricula_id
     where i.area_explorada is not null
       and m.area_documento is not null
       and e.tipo_exploracao = (v_cab->>'tipo_exploracao')::osg_tipo_exploracao
       and e.cliente_id = (
             select cliente_id from public.exploracao_rural where id = v_id
           )
       -- Só instrumento ativo: encerrado devolveu a área.
       and (e.data_encerramento is null or e.data_encerramento >= current_date)
       -- Só as matrículas tocadas por esta gravação: instrumento antigo que já estoura
       -- não pode impedir de salvar um instrumento novo que não tem nada com aquilo.
       and i.matricula_id in (
             select ii.matricula_id from public.exploracao_rural_imovel ii
              where ii.exploracao_rural_id = v_id
           )
     group by m.id, m.numero, m.area_documento, m.area_unidade
    having sum(i.area_explorada * osg_fator_area_m2(i.area_unidade))
             > m.area_documento * osg_fator_area_m2(m.area_unidade)
  loop
    raise exception
      'A área cedida da matrícula %, somada entre os instrumentos ativos deste cliente, passa da área do próprio imóvel (% %).',
      v_excedido.matricula, trim_scale(v_excedido.area_matricula)::text,
      v_excedido.unidade_matricula;
  end loop;

  return v_id;
end;
$$;

comment on function public.salvar_exploracao_rural(jsonb) is
  'Grava cabeçalho + partes + imóveis + origens externas de uma exploração rural numa transação só, traduz o id local da origem externa para uuid, e valida as três regras de fechamento: partilha da parceria = 100%, frações da composse = 100%, e área cedida do imóvel (somada entre instrumentos ativos do mesmo tipo) <= área da matrícula. Espelho em TS: src/lib/exploracaoRuralModalModels.ts.';
