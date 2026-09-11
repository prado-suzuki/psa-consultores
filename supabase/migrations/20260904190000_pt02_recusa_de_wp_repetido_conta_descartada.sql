-- PT-02: a recusa de WP repetido passa a contar a revisão descartada.
--
-- O problema, medido em 04/09/2026: um WP importado e depois descartado não
-- podia ser importado de novo, o que está correto, mas quem recusava era a
-- constraint `wp_importacao_checksum_unico`, e a pessoa via
-- `duplicate key value violates unique constraint` num toast vermelho. Pior:
-- a recusa vinha depois do upload, deixando o binário órfão no bucket.
--
-- A regra NÃO muda: arquivo idêntico continua recusado no mesmo estudo, descarte
-- continua sendo marca e não exclusão. O que muda é quem recusa e com que texto.
--
-- Única alteração em relação a 20260902144754: a checagem de repetido perdeu o
-- filtro `excluido = false` e ganhou mensagem por caso. O resto do corpo é cópia.

create or replace function public.importar_wp(
  _cliente_id uuid,
  _ordem_servico_id uuid,
  _gcs_uri text,
  _nome_original text,
  _mime text,
  _tamanho bigint,
  _checksum text,
  _versao_do_mapa text,
  _conteudo jsonb,
  _descricao text default null
)
returns jsonb
language plpgsql
set search_path to 'public'
as $$
declare
  v_estudo_id uuid;
  v_importacao_id uuid;
  v_versao integer;
  v_repetida_versao integer;
  v_repetida_excluida boolean;
  v_cabecalho jsonb;
  v_contagem jsonb := '{}'::jsonb;
  v_n integer;
begin
  if _conteudo is null or jsonb_typeof(_conteudo) <> 'object' then
    raise exception 'importar_wp: `_conteudo` precisa ser um objeto jsonb com uma chave por bloco.';
  end if;

  if jsonb_typeof(coalesce(_conteudo->'valores', '[]'::jsonb)) <> 'array' then
    raise exception 'importar_wp: `_conteudo.valores` precisa ser um array.';
  end if;

  if _checksum is null or btrim(_checksum) = '' then
    raise exception 'importar_wp: o checksum do arquivo é obrigatório, é ele que impede subir o mesmo WP duas vezes.';
  end if;

  v_cabecalho := coalesce(_conteudo->'cabecalho', '{}'::jsonb);

  select id into v_estudo_id
  from public.wp_estudo
  where cliente_id = _cliente_id
    and ordem_servico_id is not distinct from _ordem_servico_id
    and excluido = false
  for update;

  if v_estudo_id is null then
    insert into public.wp_estudo (cliente_id, ordem_servico_id, descricao, criado_por)
    values (_cliente_id, _ordem_servico_id, _descricao, auth.uid())
    returning id into v_estudo_id;
  end if;

  -- A revisão descartada também ocupa o checksum, porque a unique
  -- `(estudo_id, checksum)` não sabe o que é descarte. Enquanto esta
  -- conferência filtrava `excluido = false`, o caso da descartada escapava dela
  -- e ia bater na constraint, que devolve o texto cru do Postgres.
  select versao, excluido into v_repetida_versao, v_repetida_excluida
  from public.wp_importacao
  where estudo_id = v_estudo_id and checksum = _checksum;

  if found then
    raise exception '%',
      case when v_repetida_excluida
        then format(
          'Este arquivo já foi importado neste estudo, na revisão %s, que depois foi descartada. '
          'Descartar tira a revisão da lista, mas não libera o arquivo: para importar de novo, '
          'altere a planilha e suba a versão nova.', v_repetida_versao)
        else format(
          'Este arquivo já foi importado neste estudo, na revisão %s. '
          'Para gerar uma revisão nova, altere a planilha e suba de novo.', v_repetida_versao)
      end
      using errcode = 'unique_violation';
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao
  from public.wp_importacao where estudo_id = v_estudo_id;

  insert into public.wp_importacao (
    estudo_id, versao, gcs_uri, nome_original, mime, tamanho,
    checksum, versao_do_mapa, importado_por, problemas,
    cliente_no_wp, ano_inicial, ano_final, preparado_por_wp, revisado_por_wp,
    ano_base, crescimento_anual
  )
  values (
    v_estudo_id, v_versao, _gcs_uri, _nome_original, _mime, _tamanho,
    _checksum, _versao_do_mapa, auth.uid(),
    coalesce(_conteudo->'problemas', '[]'::jsonb),
    nullif(v_cabecalho->>'clienteNoWp', ''),
    nullif(v_cabecalho->>'anoInicial', '')::integer,
    nullif(v_cabecalho->>'anoFinal', '')::integer,
    nullif(v_cabecalho->>'preparadoPor', ''),
    nullif(v_cabecalho->>'revisadoPor', ''),
    nullif(v_cabecalho->>'anoBase', '')::integer,
    nullif(v_cabecalho->>'crescimentoAnual', '')::numeric
  )
  returning id into v_importacao_id;

  -- Resumo, DRE e apuração.
  insert into public.wp_valor (
    importacao_id, bloco, rotulo, nivel, cenario, contribuinte, ano,
    valor_numerico, valor_texto, unidade, origem_celula
  )
  select
    v_importacao_id,
    (v->>'bloco')::public.wp_bloco,
    v->>'rotulo',
    nullif(v->>'nivel', '')::smallint,
    v->>'cenario',
    nullif(v->>'contribuinte', ''),
    (v->>'ano')::integer,
    case when jsonb_typeof(v->'valor') = 'number' then (v->>'valor')::numeric end,
    case when jsonb_typeof(v->'valor') <> 'number' then v->>'valor' end,
    (v->>'unidade')::public.wp_unidade,
    v->>'origemCelula'
  from jsonb_array_elements(coalesce(_conteudo->'valores', '[]'::jsonb)) as v;
  get diagnostics v_n = row_count;
  v_contagem := v_contagem || jsonb_build_object('valores', v_n);

  -- Carga Tributária.
  insert into public.wp_farol (
    importacao_id, bloco, rotulo, regime, pessoa,
    valor_numerico, valor_texto, unidade, origem_celula
  )
  select
    v_importacao_id,
    f->>'bloco',
    f->>'rotulo',
    (f->>'regime')::public.wp_regime,
    (f->>'pessoa')::public.wp_pessoa,
    case when jsonb_typeof(f->'valor') = 'number' then (f->>'valor')::numeric end,
    case when jsonb_typeof(f->'valor') <> 'number' then f->>'valor' end,
    (f->>'unidade')::public.wp_unidade,
    f->>'origemCelula'
  from jsonb_array_elements(coalesce(_conteudo->'farol', '[]'::jsonb)) as f;
  get diagnostics v_n = row_count;
  v_contagem := v_contagem || jsonb_build_object('farol', v_n);

  -- Caixas de texto e notas de rodapé.
  insert into public.wp_comentario (
    importacao_id, cenario, tributo, ordem, texto, origem_celula
  )
  select
    v_importacao_id,
    nullif(c->>'cenario', ''),
    c->>'tributo',
    (c->>'ordem')::integer,
    c->>'texto',
    c->>'origemCelula'
  from jsonb_array_elements(coalesce(_conteudo->'comentarios', '[]'::jsonb)) as c;
  get diagnostics v_n = row_count;
  v_contagem := v_contagem || jsonb_build_object('comentarios', v_n);

  -- Bens da atividade rural.
  insert into public.wp_bem (
    importacao_id, ordem, contribuinte, categoria, descricao, valor, origem_linha
  )
  select
    v_importacao_id,
    (b->>'ordem')::integer,
    nullif(b->>'contribuinte', ''),
    b->>'categoria',
    nullif(b->>'descricao', ''),
    nullif(b->>'valor', '')::numeric,
    b->>'origemLinha'
  from jsonb_array_elements(coalesce(_conteudo->'bens', '[]'::jsonb)) as b;
  get diagnostics v_n = row_count;
  v_contagem := v_contagem || jsonb_build_object('bens', v_n);

  -- Dívidas da atividade rural.
  insert into public.wp_divida (
    importacao_id, ordem, titularidade, instituicao, vencimento_final,
    saldo_devedor, por_ano, origem_linha
  )
  select
    v_importacao_id,
    (d->>'ordem')::integer,
    d->>'titularidade',
    nullif(d->>'instituicao', ''),
    nullif(d->>'vencimentoFinal', '')::date,
    nullif(d->>'saldoDevedor', '')::numeric,
    coalesce(d->'porAno', '{}'::jsonb),
    d->>'origemLinha'
  from jsonb_array_elements(coalesce(_conteudo->'dividas', '[]'::jsonb)) as d;
  get diagnostics v_n = row_count;
  v_contagem := v_contagem || jsonb_build_object('dividas', v_n);

  return jsonb_build_object(
    'estudo_id', v_estudo_id,
    'importacao_id', v_importacao_id,
    'versao', v_versao,
    'gravados', v_contagem
  );
end;
$$;

comment on function public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, text) is
  'Grava uma importação do WP inteira ou nenhuma. Recebe um `_conteudo` com uma chave por bloco (cabecalho, valores, farol, comentarios, bens, dividas, problemas), cria o estudo se preciso, abre a importação seguinte e devolve a contagem por bloco. Recusa arquivo já importado.';

grant execute on function public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, text) to authenticated;
