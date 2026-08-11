-- =============================================================================
-- Idempotência — roda depois de aplicar as duas migrations PELA SEGUNDA VEZ
-- =============================================================================
SET client_min_messages = notice;

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT count(*) FROM pg_trigger
      WHERE tgname = 'trg_pessoa_conjuge_reciproco' AND NOT tgisinternal) = 1,
    'idempotência: um gatilho de cônjuge, não dois');
  PERFORM public.afirma(
    (SELECT count(*) FROM pg_trigger
      WHERE tgname = 'trg_parentesco_projeta_filiacao' AND NOT tgisinternal) = 1,
    'idempotência: um gatilho de filiação, não dois');
  PERFORM public.afirma(
    (SELECT count(*) FROM pg_constraint
      WHERE conname = 'pessoa_conjuge_nao_e_a_propria') = 1,
    'idempotência: a constraint entrou uma vez só');

  -- Reaplicar não pode mexer no que ficou de fora do backfill na primeira vez.
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000004'),
    'idempotência: o caso ambíguo continua sem vencedor na segunda aplicação');
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000002')
      = 'a0000000-0000-4000-8000-000000000001',
    'idempotência: o vínculo já fechado continua fechado');
  PERFORM public.afirma(
    (SELECT filiacao_pai FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000014')
      = 'Pai Sem Cadastro',
    'idempotência: o texto livre continua de pé depois da segunda projeção');
END $$;
