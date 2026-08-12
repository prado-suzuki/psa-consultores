-- =============================================================================
-- Prova do B1 — roda DEPOIS da migration, sobre o fixture
-- =============================================================================
-- O aceite do bloco B1: "dois clientes distintos conseguem ter a matrícula
-- 9.617 no mesmo cartório; o mesmo cliente continua impedido de cadastrar
-- 9.617 duas vezes, com a mensagem amigável atual".
--
-- A mensagem amigável é decidida no front (`matriculaErrorMessage` em
-- src/hooks/useDiagnosticoPatrimonial.ts) pelo código `23505`, então aqui a
-- prova vai até onde o banco alcança: o erro precisa continuar chegando como
-- SQLSTATE 23505, e não como outra coisa.
-- =============================================================================

SET client_min_messages = notice;
SET app.uid = '99999999-0000-4000-8000-000000000009';

-- ----------------------------------------------------------------------------
-- 1. Retro-preenchimento
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000001')
      = 'aaaaaaaa-0000-4000-8000-000000000001',
    'backfill: matrícula com bem herdou o cliente do bem');

  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000002')
      = 'bbbbbbbb-0000-4000-8000-000000000002',
    'backfill: matrícula órfã herdou o cliente do titular');

  PERFORM public.afirma(
    (SELECT cliente_id IS NULL FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000003'),
    'backfill: matrícula sem bem e sem titular ficou sem cliente (pote não atribuído)');
END $$;

-- ----------------------------------------------------------------------------
-- 2. O backfill não pisou na trilha de auditoria
-- ----------------------------------------------------------------------------
DO $$
DECLARE m public.matricula;
BEGIN
  SELECT * INTO m FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000001';
  PERFORM public.afirma(m.updated_by = 'dddddddd-0000-4000-8000-00000000000d',
    'backfill: updated_by preservado (trigger trg_set_updated_by ficou desligado)');
  PERFORM public.afirma(m.updated_at = '2020-01-01 00:00:00+00'::timestamptz,
    'backfill: updated_at preservado');
END $$;

-- ----------------------------------------------------------------------------
-- 3. A unicidade global caiu — pelos DOIS nomes da deriva
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_alvo smallint[]; v_n int;
BEGIN
  SELECT array(SELECT a.attnum::smallint FROM pg_attribute a
                WHERE a.attrelid = 'public.matricula'::regclass
                  AND a.attname IN ('cartorio_id','numero') AND NOT a.attisdropped
                ORDER BY a.attnum)
    INTO v_alvo;

  SELECT count(*) INTO v_n
    FROM pg_index i
    JOIN pg_class ci ON ci.oid = i.indexrelid
   WHERE i.indrelid = 'public.matricula'::regclass
     AND i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL
     AND i.indnatts = 2 AND i.indnkeyatts = 2
     AND (SELECT array(SELECT unnest(string_to_array(i.indkey::text,' ')::smallint[]) ORDER BY 1)) = v_alvo;

  PERFORM public.afirma(v_n = 0,
    'deriva: nenhuma unicidade global (cartorio_id, numero) sobrou — nem a constraint com o nome de produção, nem o índice com o nome do repo');

  PERFORM public.afirma(
    NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.matricula'::regclass
                   AND conname IN ('matricula_numero_cartorio_unq','matricula_cartorio_numero_unique')),
    'deriva: os dois nomes conhecidos sumiram de pg_constraint');
END $$;

-- ----------------------------------------------------------------------------
-- 4. Os índices novos existem
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.afirma(
    EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matricula_cliente_cartorio_numero_uk' AND relkind = 'i'),
    'índice único por cliente criado');
  PERFORM public.afirma(
    EXISTS (SELECT 1 FROM pg_class WHERE relname = 'matricula_sem_cliente_cartorio_numero_uk' AND relkind = 'i'),
    'índice único do pote sem cliente criado');
END $$;

-- ----------------------------------------------------------------------------
-- 5. ACEITE · outro cliente consegue cadastrar a MESMA matrícula
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_nova public.matricula;
BEGIN
  SELECT * INTO v_nova FROM public.criar_matricula_com_titular(
    jsonb_build_object(
      'cartorio_id', '11111111-0000-4000-8000-000000000001',
      'numero', '9.617',
      'municipio_imovel', 'Lucas do Rio Verde',
      'uf_imovel', 'MT',
      'area_documento', 100,
      'area_unidade', 'ha'),
    jsonb_build_object('titular_pessoa_id', 'b0000000-0000-4000-8000-00000000000b', 'tipo', 'DIREITO')
  );

  PERFORM public.afirma(v_nova.cliente_id = 'bbbbbbbb-0000-4000-8000-000000000002',
    'ACEITE: cliente B cadastrou a 9.617 no mesmo cartório e a matrícula já nasceu atribuída a ele');

  PERFORM public.afirma(
    (SELECT count(*) FROM public.matricula
      WHERE numero = '9.617' AND cartorio_id = '11111111-0000-4000-8000-000000000001') = 2,
    'ACEITE: a mesma 9.617 existe para dois clientes distintos');
END $$;

-- Mesmo cartório, mesmo número, agora para um cliente de teste em `dev`:
-- é o escopo de ambiente saindo de graça, porque dev e prod são clientes
-- diferentes.
DO $$
DECLARE v_nova public.matricula;
BEGIN
  SELECT * INTO v_nova FROM public.criar_matricula_com_titular(
    jsonb_build_object(
      'cartorio_id', '11111111-0000-4000-8000-000000000001',
      'numero', '9.617',
      'municipio_imovel', 'Lucas do Rio Verde',
      'uf_imovel', 'MT',
      'area_documento', 100,
      'area_unidade', 'ha'),
    jsonb_build_object('titular_pessoa_id', 'c0000000-0000-4000-8000-00000000000c', 'tipo', 'DIREITO')
  );
  PERFORM public.afirma(v_nova.cliente_id = 'cccccccc-0000-4000-8000-000000000003',
    'ambiente: cliente de teste em dev cadastrou a mesma 9.617 sem disputar chave com produção');
END $$;

-- ----------------------------------------------------------------------------
-- 6. ACEITE · o MESMO cliente continua impedido, com 23505
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_sqlstate text;
BEGIN
  BEGIN
    PERFORM public.criar_matricula_com_titular(
      jsonb_build_object(
        'cartorio_id', '11111111-0000-4000-8000-000000000001',
        'numero', '9.617',
        'municipio_imovel', 'Lucas do Rio Verde',
        'uf_imovel', 'MT',
        'area_documento', 100,
        'area_unidade', 'ha'),
      jsonb_build_object('titular_pessoa_id', 'a0000000-0000-4000-8000-00000000000a', 'tipo', 'DIREITO')
    );
    v_sqlstate := 'sem erro';
  EXCEPTION WHEN others THEN
    v_sqlstate := SQLSTATE;
  END;

  PERFORM public.afirma(v_sqlstate = '23505',
    'ACEITE: o cliente A cadastrando a 9.617 duas vezes ainda leva 23505 (é o código que a UI traduz na mensagem amigável)');
END $$;

-- ----------------------------------------------------------------------------
-- 7. O pote "não atribuído" continua com unicidade global entre si
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_sqlstate text;
BEGIN
  BEGIN
    INSERT INTO public.matricula (bem_id, cartorio_id, numero)
    VALUES (NULL, '11111111-0000-4000-8000-000000000001', '5.555');
    v_sqlstate := 'sem erro';
  EXCEPTION WHEN others THEN
    v_sqlstate := SQLSTATE;
  END;

  PERFORM public.afirma(v_sqlstate = '23505',
    'pote sem cliente: duas matrículas sem dono, mesmo cartório e mesmo número, seguem barradas');
END $$;

-- ----------------------------------------------------------------------------
-- 8. O dono acompanha o bem, e sobrevive à desvinculação
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- INSERT direto com bem: o trigger deriva o dono do bem.
  INSERT INTO public.matricula (id, bem_id, cartorio_id, numero)
  VALUES ('e0000000-0000-4000-8000-000000000009',
          'b1111111-0000-4000-8000-00000000000b',
          '11111111-0000-4000-8000-000000000001', '7.777');
  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000009')
      = 'bbbbbbbb-0000-4000-8000-000000000002',
    'trigger: INSERT com bem_id deriva o cliente do bem');

  -- Mover para um bem de outro cliente move o dono junto.
  UPDATE public.matricula SET bem_id = 'a1111111-0000-4000-8000-00000000000a'
   WHERE id = 'e0000000-0000-4000-8000-000000000009';
  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000009')
      = 'aaaaaaaa-0000-4000-8000-000000000001',
    'trigger: mudar o bem muda o cliente da matrícula');

  -- Desvincular o bem (voltar ao estado órfã) NÃO apaga o dono.
  UPDATE public.matricula SET bem_id = NULL
   WHERE id = 'e0000000-0000-4000-8000-000000000009';
  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000009')
      = 'aaaaaaaa-0000-4000-8000-000000000001',
    'trigger: desvincular o bem devolve a matrícula ao estado órfã sem perder o dono');
END $$;

-- ----------------------------------------------------------------------------
-- 9. Matrícula órfã criada sem cliente ganha dono no primeiro titular
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO public.matricula (id, bem_id, cartorio_id, numero)
  VALUES ('e0000000-0000-4000-8000-000000000010', NULL,
          '11111111-0000-4000-8000-000000000001', '8.888');
  PERFORM public.afirma(
    (SELECT cliente_id IS NULL FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000010'),
    'trigger: INSERT sem bem e sem titular nasce sem dono');

  INSERT INTO public.titularidade (matricula_id, titular_pessoa_id)
  VALUES ('e0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-00000000000b');
  PERFORM public.afirma(
    (SELECT cliente_id FROM public.matricula WHERE id = 'e0000000-0000-4000-8000-000000000010')
      = 'bbbbbbbb-0000-4000-8000-000000000002',
    'trigger: o primeiro titular atribui a matrícula órfã ao cliente dele');
END $$;

-- ----------------------------------------------------------------------------
-- 10. A policy de leitura passou a olhar a coluna nova
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT pg_get_expr(pol.polqual, pol.polrelid) LIKE '%cliente_id%'
       FROM pg_policy pol
       JOIN pg_class c ON c.oid = pol.polrelid
      WHERE c.relname = 'matricula' AND pol.polname = 'osg_cluster_select_matricula'),
    'RLS: a policy de SELECT da matrícula deriva o dono também pela coluna cliente_id');

  PERFORM public.afirma(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.matricula'::regclass),
    'RLS segue habilitada em matricula');
END $$;

\echo '=== PROVA DO B1: todas as afirmações passaram ==='
