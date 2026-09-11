-- PT-02: gravar a importação do WP numa transação só.
--
-- Importar um WP não é uma escrita, são três: cria a revisão, grava as dezenas de
-- valores e liga o arquivo. Pelo PostgREST cada requisição é a sua própria
-- transação, então três chamadas separadas deixariam, na falha da segunda, uma
-- revisão sem valores no banco ou um arquivo no storage sem revisão apontando
-- para ele. É o "arquivo órfão" que o enunciado da PT-02 nomeia.
--
-- Uma função plpgsql é atômica: erro em qualquer insert desfaz os anteriores sem
-- ninguém pedir.
--
-- SECURITY INVOKER (o padrão), de propósito, como na gravação transacional do
-- ITCD: a RLS continua valendo linha por linha, com o papel de quem chamou. Esta
-- função não é portão para escrever o que a policy proíbe; ela só junta numa
-- transação o que já era permitido.
--
-- A VERSÃO é calculada aqui dentro, e isso conserta um segundo problema: se a tela
-- lesse o `max(versao)` numa consulta e gravasse em outra, duas abas abertas
-- gerariam a mesma versão. Dentro da função, leitura e escrita estão na mesma
-- transação, e o índice único de `(estudo_id, versao)` recusa o empate que
-- sobrasse.

-- ── O QUE ESTA MIGRAÇÃO PRESSUPÕE, CONFERIDO ANTES ───────────────────────────
--
-- Produção não roda esta pasta em ordem: quem aplica é uma pessoa, pelo chat do
-- Lovable, uma migração por vez. Sem as linhas abaixo o desalinho seria SILENCIOSO
-- no pior lugar, porque `create or replace function` não valida o corpo em
-- plpgsql: a função seria criada com sucesso citando tabela que não existe, e o
-- erro apareceria na cara de quem clicasse em importar.
do $$
declare
  t text;
begin
  foreach t in array array['wp_estudo', 'wp_importacao', 'wp_valor']
  loop
    if to_regclass('public.' || t) is null then
      raise exception
        'public.% não existe. Aplique antes a 20260901203113_pt02_estudo_importacao_valor_do_wp.', t;
    end if;
  end loop;
end $$;

-- Um estudo por cliente e OS. O índice não é enfeite: sem ele, duas importações
-- simultâneas do primeiro WP criariam dois estudos e as revisões se dividiriam
-- entre os dois, cada tela mostrando metade do histórico.
--
-- Parcial em `excluido = false` para que o admin possa apagar um estudo e o
-- trabalho recomeçar do zero para aquele cliente e aquela OS.
create unique index if not exists wp_estudo_cliente_os_unico
  on public.wp_estudo (cliente_id, ordem_servico_id)
  where excluido = false;

create or replace function public.importar_wp(
  _cliente_id uuid,
  _ordem_servico_id uuid,
  _gcs_uri text,
  _nome_original text,
  _mime text,
  _tamanho bigint,
  _checksum text,
  _versao_do_mapa text,
  _valores jsonb,
  _problemas jsonb default '[]'::jsonb,
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
  v_gravados integer;
begin
  if _valores is null or jsonb_typeof(_valores) <> 'array' then
    raise exception 'importar_wp: `_valores` precisa ser um array jsonb.';
  end if;

  if _checksum is null or btrim(_checksum) = '' then
    raise exception 'importar_wp: o checksum do arquivo é obrigatório, é ele que impede subir o mesmo WP duas vezes.';
  end if;

  -- Acha o estudo daquele cliente naquela OS, ou abre um. O `for update` serializa
  -- duas importações concorrentes do MESMO estudo; a corrida no primeiro upload,
  -- em que ainda não há linha para travar, é barrada pelo índice único acima.
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

  -- A regra combinada em 01/09: o mesmo arquivo não sobe duas vezes. A restrição
  -- de banco também garante isso, mas aqui a mensagem diz o que fazer, e é ela que
  -- chega na tela.
  if exists (
    select 1 from public.wp_importacao
    where estudo_id = v_estudo_id and checksum = _checksum and excluido = false
  ) then
    raise exception
      'Este arquivo já foi importado neste estudo. Para gerar uma revisão nova, altere a planilha e suba de novo.'
      using errcode = 'unique_violation';
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao
  from public.wp_importacao where estudo_id = v_estudo_id;

  insert into public.wp_importacao (
    estudo_id, versao, gcs_uri, nome_original, mime, tamanho,
    checksum, versao_do_mapa, importado_por, problemas
  )
  values (
    v_estudo_id, v_versao, _gcs_uri, _nome_original, _mime, _tamanho,
    _checksum, _versao_do_mapa, auth.uid(), coalesce(_problemas, '[]'::jsonb)
  )
  returning id into v_importacao_id;

  -- O valor chega como número OU como texto no mesmo campo do jsonb, porque a
  -- planilha mistura: a linha de opção de apuração devolve `Presumido` e o `Farol`
  -- traz alíquota ao lado de marcador de sim e não. Aqui ele se separa em duas
  -- colunas, e a restrição da tabela garante que caia em exatamente uma.
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
  from jsonb_array_elements(_valores) as v;

  get diagnostics v_gravados = row_count;

  return jsonb_build_object(
    'estudo_id', v_estudo_id,
    'importacao_id', v_importacao_id,
    'versao', v_versao,
    'valores_gravados', v_gravados
  );
end;
$$;

comment on function public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, jsonb, text) is
  'Grava uma importação do WP inteira ou nenhuma: cria o estudo se preciso, abre a importação seguinte e insere os valores. Recusa arquivo já importado.';

grant execute on function public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, jsonb, text) to authenticated;
