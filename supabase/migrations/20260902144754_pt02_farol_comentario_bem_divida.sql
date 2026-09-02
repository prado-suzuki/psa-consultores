-- PT-02: as quatro tabelas que faltavam para os slides saírem completos.
--
-- A primeira migration cobriu Resumo, DRE e apuração do IRPF, que são valores
-- endereçados por rótulo, cenário, contribuinte e ano. Estes quatro blocos não
-- cabem nesse formato:
--
--   wp_farol       a Carga Tributária, que não tem ano nem cenário: cruza regime
--                  (presumido ou real) com tipo de pessoa (PF ou PJ)
--   wp_comentario  o texto por tributo, que vira as caixas do slide de Resumo, e
--                  também as seis notas de rodapé da Carga Tributária
--   wp_bem         os bens da atividade rural, um por linha na planilha
--   wp_divida      os contratos, com a amortização de cada ano
--
-- Uma tabela por aba, decisão do Bernardo em 02/09/2026. Ele aprovou estas quatro
-- e deixou de fora a `wp_imovel`: a relação de imóveis vai ganhar um uso maior
-- depois, provavelmente fora da PT-02, e não vale criar uma tabela agora só para
-- o cartão de hectares. Consequência aceita: o cartão de hectares do slide de
-- Premissas e a tabela de áreas do anexo ficam sem fonte.
--
-- O cabeçalho do estudo e a taxa de crescimento entram na `wp_importacao`, e não
-- na `wp_estudo`, porque são lidos daquele arquivo: o nome do cliente na planilha, a data-base e quem
-- preparou podem mudar de uma versão para a outra, e a versão anterior tem de
-- continuar dizendo o que dizia.

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

-- ------------------------------------------------------------------- enums

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wp_regime') then
    create type public.wp_regime as enum ('presumido', 'real');
  end if;
  if not exists (select 1 from pg_type where typname = 'wp_pessoa') then
    create type public.wp_pessoa as enum ('pf', 'pj');
  end if;
end $$;

-- ------------------------------------------- o cabeçalho lido de cada arquivo

alter table public.wp_importacao add column if not exists cliente_no_wp text;
alter table public.wp_importacao add column if not exists ano_inicial integer;
alter table public.wp_importacao add column if not exists ano_final integer;
alter table public.wp_importacao add column if not exists preparado_por_wp text;
alter table public.wp_importacao add column if not exists revisado_por_wp text;
-- Da aba `DRE Projetada`: a projeção parte de um ano real e cresce por uma taxa.
-- Os dois aparecem no slide, na nota ao lado da DRE ("aplicando uma taxa de
-- correção anual correspondente à 5%").
alter table public.wp_importacao add column if not exists ano_base integer;
alter table public.wp_importacao add column if not exists crescimento_anual numeric;

comment on column public.wp_importacao.cliente_no_wp is
  'O nome do cliente como está escrito na planilha, para conferir contra o cadastro.';
comment on column public.wp_importacao.ano_inicial is
  'Da linha "Data-base: 2026 a 2028". É contra estes dois anos que o validador confere se o ano de um valor faz sentido.';
comment on column public.wp_importacao.preparado_por_wp is
  'Quem preparou, digitado na planilha. Não é o usuário do portal, que está em `importado_por`.';
comment on column public.wp_importacao.ano_base is
  'O ano real de onde a projeção parte, do cabeçalho da aba `DRE Projetada`.';
comment on column public.wp_importacao.crescimento_anual is
  'A taxa que projeta os anos seguintes, como fração: 0,05 para 5%.';

-- --------------------------------------------------- a Carga Tributária

create table if not exists public.wp_farol (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,
  -- IRPF/IRPJ/CSLL, PIS/Cofins, IBS e CBS, FUNRURAL.
  bloco text not null,
  rotulo text not null,
  regime public.wp_regime not null,
  pessoa public.wp_pessoa not null,
  -- A célula traz alíquota OU marcador de sim e não. No modelo o marcador é a
  -- letra `P` ou `O` em fonte de símbolo, que no slide vira ícone de certo e
  -- errado, então ele chega aqui como texto.
  valor_numerico numeric,
  valor_texto text,
  unidade public.wp_unidade not null,
  origem_celula text not null
);

comment on table public.wp_farol is
  'A aba `Farol`: o quadro comparativo de alíquotas por regime e tipo de pessoa. Origem do slide de Carga Tributária.';

-- --------------------------------------------------- as caixas de texto

create table if not exists public.wp_comentario (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,
  -- Nulo nas notas de rodapé da Carga Tributária, que não pertencem a cenário.
  cenario text,
  -- `IRPF`, `PIS/Cofins`, `CBS`, `FUNRURAL`, ou `Notas da Carga Tributária`.
  tributo text not null,
  ordem integer not null,
  texto text not null,
  origem_celula text not null
);

comment on table public.wp_comentario is
  'O bloco "Comentários" das abas de cenário e as notas de rodapé do `Farol`. No slide viram parágrafo, reescrito pelo consultor: o texto daqui é ponto de partida.';

-- --------------------------------------------------- bens e dívidas

create table if not exists public.wp_bem (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,
  ordem integer not null,
  contribuinte text,
  -- A categoria da declaração de IRPF. O slide agrupa por ela e soma: a aba traz
  -- um bem por linha, com número de série, e o slide traz uma linha por categoria.
  categoria text not null,
  descricao text,
  valor numeric,
  origem_linha text not null
);

comment on table public.wp_bem is
  'A aba `Bens da Atv. Rural`, um bem por linha. O slide agrupa por categoria e soma.';

create table if not exists public.wp_divida (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,
  ordem integer not null,
  titularidade text not null,
  instituicao text,
  vencimento_final date,
  saldo_devedor numeric,
  -- A amortização de cada ano, `{"2026": 25847491, "2027": 11444807}`. Vai em
  -- jsonb porque os anos aqui são de vencimento de parcela, não a data-base do
  -- estudo: no Bahia Potrich vão até 2032, e outro cliente vai até outro ano.
  -- Uma coluna por ano exigiria migration a cada cliente novo.
  por_ano jsonb not null default '{}'::jsonb,
  origem_linha text not null
);

comment on table public.wp_divida is
  'A aba `Dívidas da Atv. Rural`, um contrato por linha. O total do slide é a soma das amortizações ano a ano, e não a coluna de saldo devedor, que dá outro número.';

-- ---------------------------------------------------------------- restrições

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wp_farol_celula_unica') then
    alter table public.wp_farol
      add constraint wp_farol_celula_unica unique (importacao_id, origem_celula);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wp_farol_tem_um_valor') then
    alter table public.wp_farol
      add constraint wp_farol_tem_um_valor check (
        (valor_numerico is not null and valor_texto is null)
        or (valor_numerico is null and valor_texto is not null)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wp_comentario_celula_unica') then
    alter table public.wp_comentario
      add constraint wp_comentario_celula_unica unique (importacao_id, origem_celula);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wp_bem_linha_unica') then
    alter table public.wp_bem
      add constraint wp_bem_linha_unica unique (importacao_id, origem_linha);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'wp_divida_linha_unica') then
    alter table public.wp_divida
      add constraint wp_divida_linha_unica unique (importacao_id, origem_linha);
  end if;

  -- `por_ano` precisa ser objeto: uma lista ou um número passariam calados e
  -- quebrariam na hora de desenhar a tabela de dívidas.
  if not exists (select 1 from pg_constraint where conname = 'wp_divida_por_ano_objeto') then
    alter table public.wp_divida
      add constraint wp_divida_por_ano_objeto check (jsonb_typeof(por_ano) = 'object');
  end if;

  -- A data-base é um intervalo, não dois números soltos.
  if not exists (select 1 from pg_constraint where conname = 'wp_importacao_data_base_coerente') then
    alter table public.wp_importacao
      add constraint wp_importacao_data_base_coerente check (
        (ano_inicial is null and ano_final is null)
        or (ano_inicial is not null and ano_final is not null and ano_final >= ano_inicial)
      );
  end if;
end $$;

create index if not exists wp_farol_importacao_idx on public.wp_farol (importacao_id, bloco);
create index if not exists wp_comentario_importacao_idx on public.wp_comentario (importacao_id, cenario, ordem);
create index if not exists wp_bem_importacao_idx on public.wp_bem (importacao_id, categoria);
create index if not exists wp_divida_importacao_idx on public.wp_divida (importacao_id, ordem);

-- ---------------------------------------------------------------------- RLS

alter table public.wp_farol enable row level security;
alter table public.wp_comentario enable row level security;
alter table public.wp_bem enable row level security;
alter table public.wp_divida enable row level security;

-- As mesmas duas regras das outras filhas de `wp_importacao`: quem enxerga o
-- estudo lê, e `team_member+` que enxerga o estudo grava. Sem UPDATE e sem
-- DELETE, porque estas tabelas são retrato e morrem com a importação, pelo
-- `on delete cascade`.
do $$
declare
  t text;
begin
  foreach t in array array['wp_farol', 'wp_comentario', 'wp_bem', 'wp_divida']
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'quem ve a importacao le ' || t, t);
    execute format($f$
      create policy %I on public.%I for select
      using (exists (
        select 1 from public.wp_importacao i
        where i.id = importacao_id and i.excluido = false
          and public.wp_estudo_visivel(i.estudo_id)
      ))$f$, 'quem ve a importacao le ' || t, t);

    execute format(
      'drop policy if exists %I on public.%I',
      'team_member+ grava ' || t, t);
    execute format($f$
      create policy %I on public.%I for insert
      with check (
        public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
        and exists (
          select 1 from public.wp_importacao i
          where i.id = importacao_id and public.wp_estudo_visivel(i.estudo_id)
        )
      )$f$, 'team_member+ grava ' || t, t);
  end loop;
end $$;

-- ------------------------------------------ a gravação passa a levar tudo

-- A assinatura muda de forma, e não só de tamanho. Antes eram parâmetros soltos
-- por bloco; com seis blocos isso passaria de vinte parâmetros. Agora vai um
-- `_conteudo` só, com uma chave por bloco, que é exatamente o formato que a
-- leitura devolve. A versão anterior é derrubada em vez de conviver, porque duas
-- funções de mesmo nome deixariam o PostgREST escolhendo uma por engano.
drop function if exists public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, jsonb, text);
drop function if exists public.importar_wp(uuid, uuid, text, text, text, bigint, text, text, jsonb, jsonb, jsonb, text);

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
