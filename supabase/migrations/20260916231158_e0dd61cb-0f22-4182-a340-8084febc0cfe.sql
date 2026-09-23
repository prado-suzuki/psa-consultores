-- 20260915125745_gov03_usufruto_ja_existe_em_onus_quotas.sql
-- GOV-03, correcao: as duas colunas de usufruto que eu acrescentei a
-- `quadro_societario` na migration anterior saem, porque o usufruto JA ESTA
-- MODELADO e num lugar melhor. (ver cabecalho do arquivo no repositorio)

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