-- =============================================================================
-- Prova do backfill — roda logo depois das duas migrations, sobre o fixture
-- =============================================================================
-- O que se prova: o backfill fecha o que é inequívoco e NÃO escolhe vencedor
-- onde a escolha seria arbitrária. Antes da revisão, o `UPDATE ... FROM` fechava
-- o caso ambíguo com a origem que o Postgres desse na veia.
-- =============================================================================
SET client_min_messages = notice;

DO $$
BEGIN
  -- 1. metade que dava para fechar
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000002')
      = 'a0000000-0000-4000-8000-000000000001',
    'backfill: vínculo pela metade foi fechado (Bruno passou a apontar Ana)');

  -- 2. ambíguo: duas origens para o mesmo parceiro vazio, ninguém vence
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000004'),
    'backfill: parceiro com duas origens continua vazio (sem vencedor arbitrário)');
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000003')
      = 'a0000000-0000-4000-8000-000000000004'
    AND (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000005')
      = 'a0000000-0000-4000-8000-000000000004',
    'backfill: as duas origens do caso ambíguo ficaram intactas');

  -- 3. contraditório A→B, B→C: nada muda
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000006')
      = 'a0000000-0000-4000-8000-000000000007'
    AND (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000007')
      = 'a0000000-0000-4000-8000-000000000008',
    'backfill: triângulo contraditório ficou como estava');

  -- 4. já simétrico continua simétrico
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000009')
      = 'a0000000-0000-4000-8000-00000000000a',
    'backfill: casal já simétrico não foi tocado');

  -- 5. cruzamento entre clientes não é fechado pelo backfill
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'b0000000-0000-4000-8000-000000000001'),
    'backfill: não fecha vínculo com pessoa de outro cliente');

  -- 6. ninguém que já tinha cônjuge foi sobrescrito
  PERFORM public.afirma(
    (SELECT count(*) FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000b'
       AND conjuge_id IS NULL) = 1,
    'backfill: pessoa livre continua livre');
END $$;

-- ----------------------------------------------------------------------------
-- 7. O índice antigo continua sendo o antigo (a migration não recria nem troca)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT count(*) FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = 'idx_pessoa_conjuge_id' AND i.indpred IS NULL) = 1,
    'índice: idx_pessoa_conjuge_id continua total, não virou parcial nem foi duplicado');
END $$;

-- ----------------------------------------------------------------------------
-- 8. Projeção da filiação (migration do B11)
-- ----------------------------------------------------------------------------
DO $$
DECLARE p public.pessoa;
BEGIN
  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000f';
  PERFORM public.afirma(p.filiacao_pai = 'Joaquim Pai'
    AND p.filiacao_pai_pessoa_id = 'a0000000-0000-4000-8000-000000000010',
    'filiação: backfill projetou o pai a partir do vínculo');
  PERFORM public.afirma(p.filiacao_mae = 'Marta Mae'
    AND p.filiacao_mae_pessoa_id = 'a0000000-0000-4000-8000-000000000011',
    'filiação: backfill projetou a mãe a partir do vínculo');

  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000015';
  PERFORM public.afirma(p.filiacao_mae = 'Legado Lurdes' AND p.filiacao_pai IS NULL,
    'filiação: vínculo legado "Pai/Mãe" foi para o slot certo pelo gênero do parente');

  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000014';
  PERFORM public.afirma(p.filiacao_pai = 'Pai Sem Cadastro' AND p.filiacao_pai_pessoa_id IS NULL,
    'filiação: texto livre sem vínculo sobreviveu ao backfill');
END $$;
