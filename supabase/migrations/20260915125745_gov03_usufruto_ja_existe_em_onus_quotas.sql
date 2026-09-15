-- 20260915125745_gov03_usufruto_ja_existe_em_onus_quotas.sql
-- GOV-03, correcao: as duas colunas de usufruto que eu acrescentei a
-- `quadro_societario` na migration anterior saem, porque o usufruto JA ESTA
-- MODELADO e num lugar melhor.
--
-- O QUE EU NAO TINHA VISTO. A frente "Doacao de quotas com reserva de usufruto"
-- (`docs/osg/doacao-de-quotas-com-usufruto.md`) entregou em 10/09 a tabela
-- `onus_quotas`, com `nu_proprietario_pessoa_id`, `usufrutuario_pessoa_ids`,
-- `usufruto_com_voto`, `quotas`, `gravames` e `extinto_em`. Ela nasceu de um
-- corpus de 105 documentos de 23 sociedades, e modela tres coisas que as minhas
-- duas colunas nao modelavam:
--
--   1. o usufruto pode ter MAIS DE UM usufrutuario;
--   2. ele cobre uma QUANTIDADE de quotas, e nao a participacao inteira;
--   3. ele se EXTINGUE, com data e com o movimento que o extinguiu.
--
-- E PIOR: `quadro_societario` nao e a fonte viva do quadro. O que as telas leem
-- e `v_quadro_societario`, que soma `movimentacao_quotas` e nao toca nesta
-- tabela. As duas colunas estavam num lugar que ninguem le, guardando pior o que
-- outra tabela ja guarda.
--
-- O card da GOV-03 manda usar `quadro_societario`, e o card esta desatualizado:
-- ele foi escrito antes de a frente de doacao existir.
--
-- Nada se perde: as duas colunas nasceram na migration anterior e nenhuma das 65
-- linhas foi preenchida, conferido antes de derrubar.
--
-- Consequencia na tela: o grupo "Usufruto e voto" do Acordo de Quotistas nao
-- CADASTRA usufruto, ele LE de `onus_quotas` e manda quem quiser cadastrar para
-- o Quadro Societario, que e onde o gravame nasce, junto do ato que o criou.
--
-- Reversao: reaplicar o bloco correspondente de `20260914210309`.

ALTER TABLE public.quadro_societario
  DROP CONSTRAINT IF EXISTS quadro_societario_usufruto_ck;

ALTER TABLE public.quadro_societario
  DROP CONSTRAINT IF EXISTS quadro_societario_voto_ck;

ALTER TABLE public.quadro_societario
  DROP COLUMN IF EXISTS voto_exercido_por;

ALTER TABLE public.quadro_societario
  DROP COLUMN IF EXISTS com_usufruto;

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE v_falhas text[] := '{}';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quadro_societario'
      AND column_name IN ('com_usufruto', 'voto_exercido_por')
  ) THEN
    v_falhas := v_falhas || 'alguma das duas colunas sobreviveu';
  END IF;

  -- A tabela que passa a valer tem de estar de pe, com os campos que substituem
  -- as duas: quem e nu-proprietario, quem usufrui, e se o usufruto leva o voto.
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'onus_quotas'
  ) THEN
    v_falhas := v_falhas || 'onus_quotas nao existe, e era ela que justificava derrubar';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'onus_quotas'
      AND column_name = 'usufruto_com_voto'
  ) THEN
    v_falhas := v_falhas || 'onus_quotas nao tem usufruto_com_voto';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-03 correcao do usufruto: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
