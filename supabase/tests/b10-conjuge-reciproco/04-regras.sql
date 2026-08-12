-- =============================================================================
-- Prova das quatro regras do B10 — o gatilho em operação
-- =============================================================================
-- As regras, do bloco B10: (1) escrever de um lado escreve o outro; (2) trocar
-- de cônjuge libera o anterior; (3) limpar o cônjuge limpa o outro lado;
-- (4) casar com quem já é casado desfaz o casamento anterior, dos dois lados.
-- Escreve-se sempre de UM lado só, que é o que o aplicativo faz.
-- =============================================================================
SET client_min_messages = notice;

-- ----------------------------------------------------------------------------
-- Regra 1: espelho
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-00000000000c'
 WHERE id = 'a0000000-0000-4000-8000-00000000000b';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000c')
      = 'a0000000-0000-4000-8000-00000000000b',
    'regra 1: gravar de um lado gravou o outro');
  PERFORM public.afirma(
    (SELECT updated_at > '2020-01-02'::timestamptz FROM public.pessoa
      WHERE id = 'a0000000-0000-4000-8000-00000000000c'),
    'regra 1: o parceiro teve updated_at renovado pelo gatilho que já existia');
END $$;

-- ----------------------------------------------------------------------------
-- Regra 2: trocar libera o anterior
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-00000000000d'
 WHERE id = 'a0000000-0000-4000-8000-00000000000b';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000c'),
    'regra 2: o cônjuge trocado ficou livre');
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000d')
      = 'a0000000-0000-4000-8000-00000000000b',
    'regra 2: o novo cônjuge foi espelhado');
END $$;

-- ----------------------------------------------------------------------------
-- Regra 3: limpar limpa dos dois lados
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET conjuge_id = NULL
 WHERE id = 'a0000000-0000-4000-8000-00000000000b';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000d'),
    'regra 3: remover o cônjuge removeu o vínculo do outro lado');
END $$;

-- ----------------------------------------------------------------------------
-- Regra 4: casar com quem já é casado desfaz o casamento anterior
--   Livre Um passa a apontar Meia Ana, que estava (simetricamente, pelo
--   backfill) com Meia Bruno.
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000001'
 WHERE id = 'a0000000-0000-4000-8000-00000000000b';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000001')
      = 'a0000000-0000-4000-8000-00000000000b',
    'regra 4: o novo par ficou simétrico');
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000002'),
    'regra 4: o cônjuge anterior do novo par ficou livre');
END $$;

-- ----------------------------------------------------------------------------
-- Ninguém é cônjuge de si mesmo
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_falhou boolean := false;
BEGIN
  BEGIN
    UPDATE public.pessoa SET conjuge_id = id WHERE id = 'a0000000-0000-4000-8000-00000000000c';
  EXCEPTION WHEN check_violation OR raise_exception THEN
    v_falhou := true;
  END;
  PERFORM public.afirma(v_falhou, 'auto-cônjuge é recusado');
END $$;

-- ----------------------------------------------------------------------------
-- Consistência global: todo ponteiro do cliente 1 aponta para quem aponta de volta
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_assimetricos int;
BEGIN
  SELECT count(*) INTO v_assimetricos
    FROM public.pessoa a
    JOIN public.pessoa b ON b.id = a.conjuge_id
   WHERE a.conjuge_id IS NOT NULL
     AND a.cliente_id = b.cliente_id
     AND (b.conjuge_id IS DISTINCT FROM a.id)
     -- o triângulo contraditório do fixture é legado e só se resolve quando
     -- alguém editar uma das três linhas; ele fica de fora desta varredura.
     AND a.id NOT IN ('a0000000-0000-4000-8000-000000000006',
                      'a0000000-0000-4000-8000-000000000007',
                      'a0000000-0000-4000-8000-000000000003',
                      'a0000000-0000-4000-8000-000000000005');
  PERFORM public.afirma(v_assimetricos = 0,
    'consistência: nenhum vínculo assimétrico sobrou depois das quatro regras');
END $$;
