-- Exploração rural: as modalidades da pecuária saem de FLAG e viram COLUNA
--
-- Migration nova: a `20260901230122` (que criou as flags) e a `20260902123000`
-- (transcrição) já foram aplicadas. Correção entra por arquivo próprio.
--
-- ── QUAL PERGUNTA CADA CAMPO RESPONDE ───────────────────────────────────────
--
-- `inclui_pecuaria` é um sim/não: "este contrato envolve gado?". Ele governa duas
-- coisas — o documento dizer AGROPECUÁRIA em vez de AGRÍCOLA, e entrar a
-- autorização genérica da Cláusula Terceira ("poderão fazer uso das terras para
-- cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves").
--
-- A MODALIDADE governa a Cláusula QUINTA, e define O QUE SE MEDE na partilha —
-- porque "fruto" de gado não é evidente como a saca de soja:
--
--   · recria_engorda → o GANHO DE PESO, apurado entre o peso de aquisição e o da
--     alienação, com os animais já existentes pesados em até 30 dias;
--   · cria           → os BEZERROS NASCIDOS, entregues em cabeças proporcionais;
--   · ciclo_completo → o PESO APURADO A CADA 12 MESES, por nota fiscal.
--
-- Três formas distintas de medir e de pagar. Um booleano tem dois estados; esta
-- pergunta tem oito (nenhuma, cada uma das três, e as quatro combinações).
--
-- ── POR QUE NÃO É FLAG (e por que era, até agora) ───────────────────────────
--
-- A `20260901230122` criou `pecuaria_recria_engorda`, `pecuaria_cria` e
-- `pecuaria_ciclo_completo` como flags manuais de escopo `documento`. O MECANISMO
-- funcionava — `comporBlocos` filtra e `numeracao.ts` renumera depois do filtro —,
-- mas o LUGAR da resposta estava errado, e o índice do banco mostra por quê:
--
--   uq_projeto_flag_valor_escopo_documento ON (documento_base_id, flag_id)
--     WHERE documento_base_id IS NOT NULL
--
-- O escopo `documento` exige `documento_base_id`, que é o documento REGISTRADO
-- que uma ALTERAÇÃO CONTRATUAL substitui (ver o cabeçalho de
-- useDomainFlagsManuais.ts). Uma parceria rural nova não sucede documento nenhum:
-- sem essa coluna, a resposta cai no índice de CLIENTE e passa a valer para todas
-- as parcerias dele. Duas parcerias do mesmo cliente — uma de ciclo completo,
-- outra só de cria — se atropelariam em silêncio.
--
-- E há a razão mais simples: qual modalidade o contrato explora é fato DAQUELE
-- contrato, como o prazo, o percentual e as culturas — todos colunas de
-- `exploracao_rural`. A escolha num painel de flags (painel que existe para
-- perguntar "houve aumento de capital?") é o dado no lugar errado.
--
-- ── SOBRE A COLUNA QUE EXISTIU ANTES ────────────────────────────────────────
--
-- A `20260901144006` criou `modalidade_pecuaria` (singular) e a `20260901230122`
-- a derrubou. O defeito dela nunca foi ser coluna: era ser UM valor, porque a
-- modelagem supunha escolha entre três variantes exclusivas. O contrato assinado
-- do MMS traz os três parágrafos juntos, e o do Bela Vista traz dois — então o
-- certo é a mesma ideia aceitando VÁRIOS valores.
--
-- Idempotente: `add column if not exists`, constraint criada sob `if not exists`
-- semântico, e os deletes de flag só agem se a flag existir.

-- ---------------------------------------------------------------------------
-- 1. A coluna
-- ---------------------------------------------------------------------------
-- `text[]` e não três booleanos: a pergunta é "quais destas", a lista de valores
-- válidos é do domínio (e o CHECK a guarda), e uma modalidade nova amanhã não
-- pede coluna nova. Default `'{}'` para a linha nascer com "nenhuma escolhida" em
-- vez de nulo — a ausência de escolha não é desconhecimento, é o caso da parceria
-- só agrícola.
alter table public.exploracao_rural
  add column if not exists pecuaria_modalidades text[] not null default '{}'::text[];

comment on column public.exploracao_rural.pecuaria_modalidades is
  'Modalidades de pecuária que ESTE contrato explora: recria_engorda, cria, '
  'ciclo_completo — em qualquer combinação. Define o que conta como "fruto" na '
  'partilha da Cláusula Quinta, e por isso é outra pergunta que inclui_pecuaria '
  '(que diz apenas SE há gado). Vazio em contrato sem pecuária.';

-- Só valores do domínio. `<@` é "contido em": recusa a lista com termo estranho
-- sem precisar enumerar combinação.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.exploracao_rural'::regclass
       and conname = 'chk_expr_pecuaria_modalidades'
  ) then
    alter table public.exploracao_rural
      add constraint chk_expr_pecuaria_modalidades
      check (pecuaria_modalidades <@ array['recria_engorda','cria','ciclo_completo']::text[]);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Os três parágrafos passam a depender do CADASTRO, não da flag
-- ---------------------------------------------------------------------------
-- O conteúdo inteiro entra numa condicional de campo, e o bloco volta a ser
-- obrigatório. É o mesmo desenho dos blocos do penhor, que já são obrigatórios
-- com o corpo dentro de `{{#instrumento.penhor}}`: sem a modalidade, o bloco
-- renderiza vazio, o motor o descarta e o descarte se anuncia no painel — que é
-- como o resto da oficina trata dado que falta.
do $$
declare
  r         record;
  v_bloco   uuid;
  v_atual   text;
  v_proxima integer;
begin
  for r in
    select * from (values
      ('Parágrafo — Frutos da pecuária na recria e engorda', 'pecuariaRecriaEngorda'),
      ('Parágrafo — Frutos da pecuária na cria',            'pecuariaCria'),
      ('Parágrafo — Frutos da pecuária no ciclo completo',  'pecuariaCicloCompleto')
    ) as t(nome, campo)
  loop
    select id into v_bloco from public.tmpl_bloco where nome = r.nome;
    if v_bloco is null then
      raise exception 'Bloco "%" não encontrado. A 20260901230122 (renomeação) rodou?', r.nome;
    end if;

    -- A flag sai do bloco. O vínculo é o que fazia `comporBlocos` exigir a
    -- resposta que não tinha onde ser gravada.
    delete from public.tmpl_bloco_flag
     where bloco_id = v_bloco
       and flag_id in (select id from public.tmpl_flag
                        where nome in ('pecuaria_recria_engorda','pecuaria_cria','pecuaria_ciclo_completo'));

    -- Volta a obrigatório: quem decide agora é a condicional dentro do texto.
    update public.tmpl_documento_bloco
       set obrigatorio = true
     where bloco_id = v_bloco;

    -- O corpo entra na condicional, e a versão nova só nasce se o texto mudar —
    -- reaplicar a migration não empilha versão idêntica.
    select conteudo into v_atual
      from public.tmpl_bloco_versao where bloco_id = v_bloco and atual;

    if v_atual is not null and v_atual not like '{{#instrumento.' || r.campo || '}}%' then
      select coalesce(max(numero_versao), 0) + 1 into v_proxima
        from public.tmpl_bloco_versao where bloco_id = v_bloco;

      update public.tmpl_bloco_versao set atual = false where bloco_id = v_bloco and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
      values (
        v_bloco, v_proxima,
        '{{#instrumento.' || r.campo || '}}' || v_atual || '{{/instrumento.' || r.campo || '}}',
        true,
        'A modalidade passou a vir do cadastro (exploracao_rural.pecuaria_modalidades) em vez de flag manual.'
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. As flags são apagadas
-- ---------------------------------------------------------------------------
-- Depois de soltos os vínculos, elas não governam nada. Deixá-las no catálogo
-- ofereceria ao consultor três interruptores sem efeito — pior que não existir.
-- As respostas já gravadas caem com o `on delete cascade` de projeto_flag_valor;
-- se alguma existisse, ela apontava para o escopo errado de qualquer forma.
delete from public.projeto_flag_valor
 where flag_id in (select id from public.tmpl_flag
                    where nome in ('pecuaria_recria_engorda','pecuaria_cria','pecuaria_ciclo_completo'));

delete from public.tmpl_flag
 where nome in ('pecuaria_recria_engorda','pecuaria_cria','pecuaria_ciclo_completo');

-- ---------------------------------------------------------------------------
-- 4. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_flags      integer;
  v_sem_guarda integer;
  v_opcionais  integer;
begin
  select count(*) into v_flags from public.tmpl_flag
   where nome like 'pecuaria_%';
  if v_flags > 0 then
    raise exception 'Sobraram % flag(s) de pecuária no catálogo.', v_flags;
  end if;

  -- Todo parágrafo de modalidade tem de abrir com a condicional dele: sem isso o
  -- texto entraria em contrato que não explora aquela modalidade.
  select count(*) into v_sem_guarda
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.nome like 'Parágrafo — Frutos da pecuária%'
     and v.conteudo not like '{{#instrumento.pecuaria%';
  if v_sem_guarda > 0 then
    raise exception '% parágrafo(s) de pecuária sem a condicional do cadastro.', v_sem_guarda;
  end if;

  select count(*) into v_opcionais
    from public.tmpl_bloco b
    join public.tmpl_documento_bloco db on db.bloco_id = b.id
   where b.nome like 'Parágrafo — Frutos da pecuária%' and db.obrigatorio is not true;
  if v_opcionais > 0 then
    raise exception '% parágrafo(s) de pecuária ainda opcional(is) por flag.', v_opcionais;
  end if;

  raise notice 'Modalidades da pecuária: coluna criada, 3 flags removidas, 3 parágrafos guardados pelo cadastro.';
end $$;
