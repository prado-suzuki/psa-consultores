-- O EVENTO DE GOVERNANÇA E A CHAVE ENTRE AS DUAS ADMINISTRAÇÕES
--
-- Frente C de docs/planos/ac-de-governanca-no-contrato-social.md.
--
-- ── O QUE ESTA MIGRATION RESOLVE ───────────────────────────────────────────
--
-- O contrato social tem UM capítulo de Administração. Ou ele diz "a sociedade é
-- administrada isoladamente por Fulano", com os dois parágrafos de poderes e a
-- vedação à substituição, ou ele diz "a administração compete ao Conselho e à
-- Diretoria", com o capítulo de órgãos. Nunca os dois, e nunca nenhum.
--
-- As flags de composição são AND simples, sem negação (src/lib/templates/
-- flags.ts), então não dá para escrever "e_alteracao E NÃO governança". A saída
-- é a que o motor já usa em `membrosFixo`/`membrosEmFaixa` e em
-- `jaAssinado`/`aindaNaoAssinado`: publicar os DOIS lados e deixar cada bloco
-- pedir o seu.
--
-- ── ORDEM DE APLICAÇÃO EM PRODUÇÃO: O INVERSO DA REGRA USUAL ───────────────
--
-- A regra da casa é "produção recebe a mudança de schema ANTES do código que a
-- usa chegar na main", porque coluna aditiva parada é inofensiva. AQUI É O
-- CONTRÁRIO, e ignorar isto quebra o app publicado:
--
--   Se o retag chegar a produção antes do código, os seis blocos da
--   administração simples passam a exigir uma flag que o código de lá não sabe
--   acender, e TODO contrato social gerado sai com o cabeçalho "Capítulo IV —
--   Administração" e NADA embaixo dele.
--
-- O código primeiro é seguro: sem o retag, a flag nova simplesmente não é
-- exigida por bloco nenhum, e o contrato continua saindo como hoje. Portanto:
-- `develop → main` PRIMEIRO, e só então esta migration pelo chat do Lovable.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS: `tmpl_flag` (uma manual e quatro declarativas) e `tmpl_bloco_flag`
-- (o vínculo dos seis blocos que já existem). Nenhum DDL, nenhuma coluna nova,
-- `types.ts` intocado. VAI PARA PRODUÇÃO: é o mesmo catálogo de modelos.
--
-- ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
--
-- `on conflict do nothing` nas três inserções, e a busca do bloco confere o
-- estado antes de agir. Reaplicar não muda nada.

-- ---------------------------------------------------------------------------
-- 1. O evento: um só, para instalar e para alterar
-- ---------------------------------------------------------------------------
-- UM evento e não dois, porque instalar a governança e mudar as alçadas depois
-- reescrevem o MESMO capítulo, e os dois precisam da matriz viva passar pelo
-- estado proposto. A evidência derivada diz ao consultor qual dos dois foi; as
-- duas redações de resolução se separam pelas declarativas do passo 2.
--
-- Escopo `pj`, que é o das outras nove `evento_*`, e não `documento`: a
-- governança é fato da sociedade, não da folha.
insert into public.tmpl_flag (nome, tipo, escopo, descricao, ativo)
values (
  'evento_governanca',
  'manual',
  'pj',
  'Instalação ou mudança nos órgãos de governança e nas alçadas',
  true
)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------------
-- 2. As quatro declarativas, sobre a fonte `governanca`
-- ---------------------------------------------------------------------------
-- A fonte NÃO é o cadastro: é a decisão que `fonteDaGovernanca`
-- (src/lib/osg/estadoProposto.ts) toma, a mesma que o estado proposto usa para
-- decidir se a lista de órgãos entra viva ou vazia. Ler o cadastro cru foi o
-- desenho anterior, e ele quebrava a AC de sede de quem tinha a matriz
-- preenchida sem ter deliberado governança nenhuma: a flag acendia, a
-- administração simples saía do documento, o capítulo de governança entrava com
-- a lista vazia e era descartado por falta de dado, e o contrato ia à junta SEM
-- ADMINISTRAÇÃO NENHUMA.
--
-- `administracao_simples` guarda `valor = ''` DE PROPÓSITO: ela é o lado vazio
-- do par, e é assim que o motor escreve uma negação que ele não tem.
insert into public.tmpl_flag (nome, tipo, escopo, entidade, campo, valor, descricao, ativo)
values
  ('governanca_por_orgaos', 'derivada', 'pj', 'governanca', 'noContrato', 'sim',
   'O contrato desta peça tem capítulo de governança (Conselho, Diretoria e alçadas).', true),
  ('administracao_simples', 'derivada', 'pj', 'governanca', 'noContrato', '',
   'O contrato desta peça tem a administração simples, sem órgãos de governança.', true),
  ('governanca_instalada', 'derivada', 'pj', 'governanca', 'instalada', 'sim',
   'Esta peça INSTALA a governança: a peça registrada anterior não a publicava.', true),
  ('governanca_alterada', 'derivada', 'pj', 'governanca', 'alterada', 'sim',
   'Esta peça ALTERA a governança já publicada pela peça registrada anterior.', true)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Os seis blocos da administração simples passam a pedir a flag
-- ---------------------------------------------------------------------------
-- A versão anterior deste plano via só as duas cláusulas. São SEIS blocos:
-- retaguear só as cláusulas deixaria os dois parágrafos de poderes e a cláusula
-- de vedação (com o parágrafo dela) órfãos dentro do capítulo de governança, e
-- o contrato sairia com o regramento simples e o de órgãos ao mesmo tempo.
--
-- O "Capítulo — Administração" FICA SEM FLAG e compartilhado: os dois
-- regramentos moram no mesmo capítulo, e um segundo cabeçalho daria dois
-- "Capítulo IV". A "Resolução: mudança na administração" e o desimpedimento
-- continuam com `evento_mudanca_administracao`, que é matéria diferente (troca
-- de administrador, não troca de regime).
--
-- A busca é por NOME + CATEGORIA, e não por UUID, pela razão que a frente da
-- doação documentou: há dois documentos `tipo = 'societario'` e o catálogo tem
-- blocos criados fora do repositório. Conferido em 15/09/2026 nos dois bancos:
-- os seis nomes existem uma vez cada, com os mesmos ids nos dois lados. Bloco
-- que não aparecer derruba a migration de propósito — sair calado produziria um
-- contrato com duas administrações.
--
-- As flags são AND: as duas cláusulas SOMAM `administracao_simples` à que já
-- têm (`e_constituicao` e `e_alteracao`), e passam a exigir as duas. Os outros
-- quatro são `obrigatorio = true` no vínculo com o documento, e isso não os
-- isenta: `comporBlocos` dá precedência às flags sobre o `obrigatorio`,
-- justamente para que marcar uma flag num bloco obrigatório tenha efeito.
do $$
declare
  nomes text[] := array[
    'Cláusula — Administração e poderes',
    'Cláusula — Administração e poderes (consolidação)',
    'Parágrafo — Administração e poderes (1)',
    'Parágrafo — Administração e poderes (2)',
    'Cláusula — Vedação à substituição do administrador',
    'Parágrafo — Vedação à substituição do administrador'
  ];
  nome_do_bloco text;
  v_flag uuid;
  v_bloco uuid;
  v_quantos integer;
begin
  select id into v_flag from public.tmpl_flag where nome = 'administracao_simples';
  if v_flag is null then
    raise exception 'flag administracao_simples ausente: o passo 2 desta migration não rodou';
  end if;

  foreach nome_do_bloco in array nomes loop
    select count(*) into v_quantos
      from public.tmpl_bloco
     where nome = nome_do_bloco and categoria = 'contrato-social';
    if v_quantos <> 1 then
      raise exception 'esperava 1 bloco "%" na categoria contrato-social, achei %',
        nome_do_bloco, v_quantos;
    end if;

    select id into v_bloco
      from public.tmpl_bloco
     where nome = nome_do_bloco and categoria = 'contrato-social';

    insert into public.tmpl_bloco_flag (bloco_id, flag_id)
    values (v_bloco, v_flag)
    on conflict (bloco_id, flag_id) do nothing;
  end loop;
end $$;
