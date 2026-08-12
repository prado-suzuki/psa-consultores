-- =============================================================================
-- Prova da barreira de tenancy — SECURITY DEFINER não pode virar porta dos fundos
-- =============================================================================
-- O gatilho roda como dono da tabela e ignora a RLS. Sem a barreira, gravar no
-- `conjuge_id` o uuid de alguém de outro cliente (a FK só exige que a linha
-- exista) faria o gatilho escrever fora do escopo do usuário.
-- =============================================================================
SET client_min_messages = notice;

-- ----------------------------------------------------------------------------
-- 1. Apontar para pessoa de outro cliente é recusado, e nada é escrito
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_estado text := 'nao falhou';
BEGIN
  BEGIN
    UPDATE public.pessoa SET conjuge_id = 'b0000000-0000-4000-8000-000000000001'
     WHERE id = 'a0000000-0000-4000-8000-00000000000c';
  EXCEPTION WHEN check_violation THEN
    v_estado := 'recusado';
  END;
  PERFORM public.afirma(v_estado = 'recusado',
    'tenancy: cônjuge de outro cliente é recusado com 23514');
END $$;

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'b0000000-0000-4000-8000-000000000001'),
    'tenancy: a pessoa do outro cliente não foi tocada');
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000c'),
    'tenancy: a escrita recusada não deixou meio vínculo do lado de cá');
END $$;

-- ----------------------------------------------------------------------------
-- 2. Insert com cônjuge de outro cliente também é recusado
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_estado text := 'nao falhou';
BEGIN
  BEGIN
    INSERT INTO public.pessoa (id, cliente_id, denominacao, conjuge_id)
    VALUES ('a0000000-0000-4000-8000-0000000000ff', 'c1000000-0000-4000-8000-000000000001',
            'Intrusa', 'b0000000-0000-4000-8000-000000000002');
  EXCEPTION WHEN check_violation THEN
    v_estado := 'recusado';
  END;
  PERFORM public.afirma(v_estado = 'recusado',
    'tenancy: insert com cônjuge de outro cliente é recusado');
  PERFORM public.afirma(
    (SELECT conjuge_id FROM public.pessoa WHERE id = 'b0000000-0000-4000-8000-000000000002')
      = 'b0000000-0000-4000-8000-000000000003',
    'tenancy: o casal do outro cliente continua intacto');
END $$;

-- ----------------------------------------------------------------------------
-- 3. Linha legada que JÁ tem o cruzamento continua editável
--    (rejeitar aqui trancaria o cadastro de quem herdou o dado errado)
-- ----------------------------------------------------------------------------
UPDATE public.pessoa
   SET denominacao = 'Cruzada Cida (editada)',
       conjuge_id  = conjuge_id
 WHERE id = 'a0000000-0000-4000-8000-00000000000e';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT denominacao FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000e')
      = 'Cruzada Cida (editada)',
    'tenancy: linha legada com cruzamento continua editável');
  PERFORM public.afirma(
    (SELECT conjuge_id IS NULL FROM public.pessoa WHERE id = 'b0000000-0000-4000-8000-000000000001'),
    'tenancy: editar a linha legada não espelhou nada no outro cliente');
END $$;

-- ----------------------------------------------------------------------------
-- 4. Mover uma pessoa casada para outro cliente não pode criar cruzamento
--    sem tocar explicitamente em conjuge_id.
-- ----------------------------------------------------------------------------
INSERT INTO public.pessoa (id, cliente_id, denominacao, conjuge_id) VALUES
  ('a0000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-000000000001',
   'Casada para mover', NULL),
  ('a0000000-0000-4000-8000-0000000000a2', 'c1000000-0000-4000-8000-000000000001',
   'Cônjuge que fica', 'a0000000-0000-4000-8000-0000000000a1');

DO $$
DECLARE v_estado text := 'nao falhou';
BEGIN
  BEGIN
    UPDATE public.pessoa
       SET cliente_id = 'c2000000-0000-4000-8000-000000000002'
     WHERE id = 'a0000000-0000-4000-8000-0000000000a1';
  EXCEPTION WHEN check_violation THEN
    v_estado := 'recusado';
  END;
  PERFORM public.afirma(v_estado = 'recusado',
    'tenancy: mover pessoa casada para outro cliente é recusado mesmo sem SET conjuge_id');
  PERFORM public.afirma(
    (SELECT cliente_id = 'c1000000-0000-4000-8000-000000000001'::uuid
       FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-0000000000a1'),
    'tenancy: a mudança recusada não propagou vínculo cruzado');
END $$;
