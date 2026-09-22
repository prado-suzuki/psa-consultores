-- 20260922145129_feed_carimbo_de_leitura_por_cliente.sql
-- Feed: a marca de "ate onde eu li", por CLIENTE, e a atividade que alimenta a
-- barra lateral de clientes com novidade.
--
-- O feed responde "o que aconteceu", nunca "o que aconteceu DESDE QUE EU SAI".
-- Quem abre a tela tres vezes por dia releu o mesmo topo tres vezes e foi
-- caçar o que mudou no olho. A barra lateral resolve isso listando os clientes
-- com movimento novo, e para existir ela precisa de um carimbo de leitura, que
-- o banco nunca teve.
--
-- POR QUE O CARIMBO E POR CLIENTE, e nao a linha unica por usuario que o
-- `docs/planos/plano-comentarios-mencoes-feed.md` §3.7 desenhou. Aquele desenho
-- e de um feed que se le inteiro, de cima a baixo: um `visto_em` por pessoa.
-- A barra pede outra coisa. No instante em que alguem le o Cliente A e nao o
-- Cliente B, um carimbo unico ou marca os dois como vistos (e o B some da barra
-- sem ter sido lido) ou nao marca nenhum (e o A fica "novidade" para sempre).
-- E o mesmo motivo por que o Slack carimba por CANAL e nao por workspace. O §3.7
-- fica obsoleto por esta migration, e a tabela nasce aqui com a chave composta.
--
-- CLIENTE NULO E UMA CHAVE, nao uma ausencia. Projeto sem cliente (sem
-- `external_client_id` e sem ordem de servico) existe, aparece no feed e precisa
-- de carimbo proprio, senao ele seria o unico bloco eternamente nao lido. O
-- lugar dele e a sentinela `00000000-0000-0000-0000-000000000000`, que e por que
-- `client_id` NAO tem FK para `cliente` (ver tambem a RLS, logo abaixo).
--
-- Fora de escopo de proposito: nao mexe em `org_comments`, na view, na
-- `feed_org_comments` nem na RLS de nada que ja existe. Quem ve o que continua
-- vindo da RLS de `org_comments`, e as funcoes daqui sao SECURITY INVOKER
-- lendo a view `security_invoker` — o carimbo nao abre nenhuma porta nova.
--
-- Reversao: `drop function marcar_feed_visto_tudo, marcar_feed_visto,
-- feed_atividade_por_cliente; drop table org_feed_visto;`. Nenhum dado de
-- conversa depende deles: perder o carimbo faz a barra recomeçar do piso de 7
-- dias, e nada mais.

-- ─── 1. A tabela do carimbo ──────────────────────────────────────────────────
--
-- Uma linha por (usuario, cliente). `visto_ate` e um instante do feed, nao
-- "quando eu olhei": e ate onde a leitura chegou naquele cliente, e e por isso
-- que ele so anda para a frente (ver o GREATEST em `marcar_feed_visto`).
CREATE TABLE IF NOT EXISTS public.org_feed_visto (
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid        NOT NULL,
  visto_ate timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

COMMENT ON TABLE public.org_feed_visto IS
  'Ate onde cada pessoa leu o feed, por cliente. Substitui o desenho de linha '
  'unica por usuario do §3.7 do plano de comentarios: a barra de clientes do '
  'feed precisa distinguir cliente lido de cliente nao lido, e um carimbo so '
  'nao consegue. client_id = 00000000-0000-0000-0000-000000000000 e a '
  'sentinela dos projetos sem cliente, por isso a coluna nao tem FK.';

COMMENT ON COLUMN public.org_feed_visto.visto_ate IS
  'Instante do FEED ate onde a leitura chegou (created_at do comentario mais '
  'novo dado por lido), nunca o relogio de quando a pessoa olhou. So anda para '
  'a frente.';

ALTER TABLE public.org_feed_visto ENABLE ROW LEVEL SECURITY;

-- O carimbo e estritamente pessoal: nao ha leitura cruzada nem para gestor.
-- "Quem leu o que" seria outra funcionalidade, e uma com consequencia
-- trabalhista; esta tabela existe para posicionar uma barra lateral.
--
-- `drop policy if exists` + `create` porque policy nao tem clausula de guarda
-- (ver "Toda migration e idempotente" no AGENTS.md).
DROP POLICY IF EXISTS "org_feed_visto: leio o meu" ON public.org_feed_visto;
CREATE POLICY "org_feed_visto: leio o meu"
  ON public.org_feed_visto FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "org_feed_visto: carimbo o meu" ON public.org_feed_visto;
CREATE POLICY "org_feed_visto: carimbo o meu"
  ON public.org_feed_visto FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "org_feed_visto: adianto o meu" ON public.org_feed_visto;
CREATE POLICY "org_feed_visto: adianto o meu"
  ON public.org_feed_visto FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ─── 2. A atividade que a barra mostra ───────────────────────────────────────
--
-- Uma linha por PROJETO, com o cliente junto: a barra agrupa por cliente para
-- mostrar, e expande para os projetos no clique. Devolver ja agrupado por
-- cliente obrigaria uma segunda chamada na expansao, e o volume aqui nao paga
-- isso.
--
-- POR QUE NAO SAI DA PAGINA DO FEED. A tela carrega 20 comentarios por vez, e
-- "Cliente 1 · 5 atualizacoes" e uma conta sobre o feed INTEIRO. Contar no
-- front contaria a janela carregada, e o numero mudaria a cada "ver mais".
--
-- O PISO DE QUEM NUNCA FOI CARIMBADO SAO 7 DIAS, e nao o inicio dos tempos.
-- Sem carimbo, "tudo e novidade" faria a primeira abertura da barra acusar tres
-- anos de conversa como novidade: a barra nasceria com todos os clientes dentro,
-- que e exatamente a tela que ela existe para substituir. Uma semana e o que
-- cabe em "voltei de viagem e quero saber o que perdi".
--
-- A PROPRIA FALA NAO E NOVIDADE PARA QUEM ESCREVEU. Sem isto, publicar um
-- comentario acende o cliente na barra da pessoa que acabou de escrever nele —
-- e a mesma regra que o `@todos` aplica no sino.
CREATE OR REPLACE FUNCTION public.feed_atividade_por_cliente(_janela_dias integer DEFAULT 30)
RETURNS TABLE (
  client_id    uuid,
  client_nome  text,
  project_id   uuid,
  project_name text,
  total        integer,
  novos        integer,
  ultimo_em    timestamptz,
  visto_ate    timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH janela AS (
    SELECT now() - make_interval(days => LEAST(GREATEST(COALESCE(_janela_dias, 30), 1), 365)) AS desde
  ),
  falas AS (
    SELECT
      COALESCE(f.client_id, '00000000-0000-0000-0000-000000000000'::uuid) AS client_id,
      f.project_id,
      f.project_name,
      f.created_at,
      f.author_id
      FROM public.org_comments_feed f
     WHERE f.excluido = false
  ),
  com_carimbo AS (
    SELECT
      fa.client_id,
      fa.project_id,
      fa.project_name,
      fa.created_at,
      fa.author_id,
      COALESCE(v.visto_ate, now() - interval '7 days') AS visto_ate
      FROM falas fa
      LEFT JOIN public.org_feed_visto v
        ON v.user_id = (SELECT auth.uid())
       AND v.client_id = fa.client_id
  )
  SELECT
    c.client_id,
    cl.nome,
    c.project_id,
    c.project_name,
    count(*)::integer                                          AS total,
    count(*) FILTER (
      WHERE c.created_at > c.visto_ate
        AND c.author_id IS DISTINCT FROM (SELECT auth.uid())
    )::integer                                                 AS novos,
    max(c.created_at)                                          AS ultimo_em,
    min(c.visto_ate)                                           AS visto_ate
    FROM com_carimbo c
    CROSS JOIN janela j
    -- O nome do cliente segue a RLS dele: cliente que a pessoa nao pode ver
    -- volta sem nome, e a barra mostra o bloco sem nome em vez de sumir com a
    -- conversa (que a RLS de org_comments ja deixou passar). Mesmo caminho do
    -- `useDomainFeedClientes`, inclusive por nao filtrar `ambiente`: o recorte
    -- de ambiente aqui vem de quais projetos existem, nao da tabela de cliente.
    LEFT JOIN public.cliente cl
      ON cl.id = c.client_id
     AND cl.excluido = false
   -- Dentro da janela OU ainda nao lido: o nao lido nunca pode cair da barra
   -- por ser velho, senao a novidade some justamente de quem passou tempo fora.
   WHERE c.created_at >= j.desde
      OR (c.created_at > c.visto_ate AND c.author_id IS DISTINCT FROM (SELECT auth.uid()))
   GROUP BY c.client_id, cl.nome, c.project_id, c.project_name
   ORDER BY max(c.created_at) DESC;
$function$;

COMMENT ON FUNCTION public.feed_atividade_por_cliente(integer) IS
  'Atividade do feed por projeto, com o cliente junto, para a barra lateral: '
  'quantas falas na janela (padrao 30 dias), quantas ainda nao lidas e quando '
  'foi a ultima. Nao lido = created_at acima do carimbo de org_feed_visto '
  '(piso de 7 dias para quem nunca foi carimbado) e de autoria de outra '
  'pessoa. Le a view org_comments_feed, entao a relevancia continua sendo a '
  'RLS de org_comments.';

-- ─── 3. Carimbar ─────────────────────────────────────────────────────────────
--
-- POR QUE E FUNCAO, e nao um upsert do PostgREST: o carimbo so pode ANDAR PARA
-- A FRENTE. A tela carimba por visibilidade, e os blocos entram na tela em
-- ordem de rolagem, nao em ordem de tempo — rolar para cima depois de rolar
-- para baixo mandaria um `visto_ate` mais velho, e um upsert cru o gravaria,
-- ressuscitando como nao lido o que ja tinha sido lido. O GREATEST e a regra.
CREATE OR REPLACE FUNCTION public.marcar_feed_visto(
  _client_id uuid,
  _visto_ate timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user  uuid := (SELECT auth.uid());
  -- Nunca aceita carimbo no futuro: um relogio adiantado do cliente
  -- silenciaria para sempre tudo que chegasse depois.
  v_ate   timestamptz := LEAST(COALESCE(_visto_ate, now()), now());
  v_saida timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'marcar_feed_visto exige usuario autenticado';
  END IF;

  INSERT INTO public.org_feed_visto AS alvo (user_id, client_id, visto_ate)
  VALUES (v_user, COALESCE(_client_id, '00000000-0000-0000-0000-000000000000'::uuid), v_ate)
  ON CONFLICT (user_id, client_id) DO UPDATE
    SET visto_ate = GREATEST(alvo.visto_ate, EXCLUDED.visto_ate)
  RETURNING alvo.visto_ate INTO v_saida;

  RETURN v_saida;
END;
$function$;

COMMENT ON FUNCTION public.marcar_feed_visto(uuid, timestamptz) IS
  'Adianta o carimbo de leitura de um cliente ate o instante informado. So '
  'anda para a frente (GREATEST) e nunca para o futuro: a tela carimba por '
  'visibilidade, e os blocos aparecem em ordem de rolagem, nao de tempo. '
  'Cliente nulo cai na sentinela dos projetos sem cliente.';

-- "Marcar tudo como visto": o gesto de quem voltou de ferias e nao vai ler os
-- 400 comentarios. Carimba TODO cliente que aparece no feed da pessoa, e nao
-- so os que a barra estava mostrando — a barra mostra uma janela, e deixar de
-- fora o que ficou atras dela devolveria a mesma bagunca no dia seguinte.
CREATE OR REPLACE FUNCTION public.marcar_feed_visto_tudo(_visto_ate timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user  uuid := (SELECT auth.uid());
  v_ate   timestamptz := LEAST(COALESCE(_visto_ate, now()), now());
  v_linhas integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'marcar_feed_visto_tudo exige usuario autenticado';
  END IF;

  INSERT INTO public.org_feed_visto AS alvo (user_id, client_id, visto_ate)
  SELECT v_user,
         COALESCE(f.client_id, '00000000-0000-0000-0000-000000000000'::uuid),
         v_ate
    FROM public.org_comments_feed f
   WHERE f.excluido = false
   GROUP BY 2
  ON CONFLICT (user_id, client_id) DO UPDATE
    SET visto_ate = GREATEST(alvo.visto_ate, EXCLUDED.visto_ate);

  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  RETURN v_linhas;
END;
$function$;

COMMENT ON FUNCTION public.marcar_feed_visto_tudo(timestamptz) IS
  'Carimba como lidos todos os clientes que aparecem no feed da pessoa. '
  'Alcanca tambem o que esta fora da janela da barra, senao a bagunca volta no '
  'dia seguinte.';

-- ─── GATE ────────────────────────────────────────────────────────────────────
-- Falha a migration se o carimbo puder andar para tras, se a RLS nao estiver de
-- pe, se a atividade parar de contar o nao lido, ou se alguma funcao virar
-- SECURITY DEFINER (o que faria a barra ver conversa que a RLS esconde).
DO $$
DECLARE
  v_src       text;
  v_policies  integer;
  v_definer   integer;
BEGIN
  IF to_regclass('public.org_feed_visto') IS NULL THEN
    RAISE EXCEPTION 'GATE: org_feed_visto nao existe apos a migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'org_feed_visto' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'GATE: org_feed_visto ficou sem RLS habilitada';
  END IF;

  SELECT count(*) INTO v_policies FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'org_feed_visto';
  IF v_policies <> 3 THEN
    RAISE EXCEPTION 'GATE: org_feed_visto tem % policies, esperadas 3 (select/insert/update)', v_policies;
  END IF;

  -- A chave composta e o motivo desta migration existir: sem ela, ler um
  -- cliente carimbaria todos.
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
      JOIN pg_class c ON c.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'org_feed_visto'
       AND i.indisprimary AND i.indnatts = 2
  ) THEN
    RAISE EXCEPTION 'GATE: a PK de org_feed_visto nao e composta (user_id, client_id)';
  END IF;

  SELECT count(*) INTO v_definer FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('feed_atividade_por_cliente', 'marcar_feed_visto', 'marcar_feed_visto_tudo')
     AND p.prosecdef;
  IF v_definer > 0 THEN
    RAISE EXCEPTION 'GATE: % funcao(oes) do carimbo viraram SECURITY DEFINER; a barra passaria por cima da RLS', v_definer;
  END IF;

  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'marcar_feed_visto';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: marcar_feed_visto nao existe apos a migration';
  END IF;
  IF v_src NOT LIKE '%GREATEST%' THEN
    RAISE EXCEPTION 'GATE: marcar_feed_visto perdeu o GREATEST e o carimbo pode andar para tras';
  END IF;

  SELECT p.prosrc INTO v_src FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'feed_atividade_por_cliente';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: feed_atividade_por_cliente nao existe apos a migration';
  END IF;
  IF v_src NOT LIKE '%org_feed_visto%' THEN
    RAISE EXCEPTION 'GATE: feed_atividade_por_cliente nao le o carimbo; tudo apareceria como novidade';
  END IF;
  IF v_src NOT LIKE '%IS DISTINCT FROM%' THEN
    RAISE EXCEPTION 'GATE: feed_atividade_por_cliente parou de excluir a propria fala do nao lido';
  END IF;
  IF v_src NOT LIKE '%excluido = false%' THEN
    RAISE EXCEPTION 'GATE: feed_atividade_por_cliente perdeu o recorte de excluido';
  END IF;
END $$;
