-- =============================================================================
-- Depois do aborto: o banco tem que estar exatamente como estava
-- =============================================================================
SET client_min_messages = notice;

DO $$
BEGIN
  PERFORM public.afirma(
    NOT EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = 'public.matricula'::regclass
                   AND attname = 'cliente_id' AND NOT attisdropped),
    'aborto: a coluna cliente_id não ficou pela metade');

  PERFORM public.afirma(
    NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matricula_cliente_cartorio_numero_uk'),
    'aborto: nenhum índice novo ficou para trás');

  PERFORM public.afirma(
    NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'public.matricula'::regclass
                   AND tgname = 'trg_matricula_definir_cliente'),
    'aborto: nenhum trigger novo ficou para trás');

  PERFORM public.afirma(
    (SELECT count(*) FROM public.matricula
      WHERE numero = '4.242' AND cartorio_id = '11111111-0000-4000-8000-000000000001') = 2,
    'aborto: as linhas duplicadas continuam lá, esperando decisão humana');
END $$;

\echo '=== ABORTO LIMPO: a migration falhou sem deixar rastro ==='
