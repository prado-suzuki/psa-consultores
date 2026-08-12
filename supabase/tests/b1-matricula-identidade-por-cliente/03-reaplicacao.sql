-- =============================================================================
-- Idempotência — roda a migration uma SEGUNDA vez, já com os dados da prova
-- =============================================================================
-- Migration aplicada pelo Lovable em produção precisa aguentar ser rodada de
-- novo. Este arquivo roda depois da segunda aplicação e confere que nada
-- quebrou nem mudou: a checagem de duplicatas passou sobre dados reais (duas
-- 9.617 de clientes diferentes convivendo), os índices continuam de pé, a
-- unicidade global não voltou e o dono de cada matrícula segue o mesmo.
-- =============================================================================

SET client_min_messages = notice;

DO $$
DECLARE v_alvo smallint[]; v_n int;
BEGIN
  PERFORM public.afirma(
    EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matricula_cliente_cartorio_numero_uk'),
    'reaplicação: índice por cliente continua de pé');

  PERFORM public.afirma(
    EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matricula_sem_cliente_cartorio_numero_uk'),
    'reaplicação: índice do pote sem cliente continua de pé');

  SELECT array(SELECT a.attnum::smallint FROM pg_attribute a
                WHERE a.attrelid = 'public.matricula'::regclass
                  AND a.attname IN ('cartorio_id','numero') AND NOT a.attisdropped
                ORDER BY a.attnum)
    INTO v_alvo;
  SELECT count(*) INTO v_n
    FROM pg_index i
   WHERE i.indrelid = 'public.matricula'::regclass
     AND i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL
     AND i.indnatts = 2 AND i.indnkeyatts = 2
     AND (SELECT array(SELECT unnest(string_to_array(i.indkey::text,' ')::smallint[]) ORDER BY 1)) = v_alvo;
  PERFORM public.afirma(v_n = 0, 'reaplicação: a unicidade global não voltou');

  PERFORM public.afirma(
    (SELECT count(*) FROM public.matricula
      WHERE numero = '9.617' AND cartorio_id = '11111111-0000-4000-8000-000000000001') = 3,
    'reaplicação: as três 9.617 (clientes A, B e C) seguem lá');

  PERFORM public.afirma(
    (SELECT updated_by FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000001')
      = 'dddddddd-0000-4000-8000-00000000000d',
    'reaplicação: o backfill continua sem pisar na trilha de auditoria');

  PERFORM public.afirma(
    (SELECT count(*) FROM public.matricula WHERE cliente_id IS NULL) = 1,
    'reaplicação: só a matrícula sem bem e sem titular segue sem dono');
END $$;

\echo '=== IDEMPOTÊNCIA DO B1: reaplicação limpa ==='
