-- 20260826143700_frente_d_numeracao_duas_series.sql

ALTER TABLE public.tmpl_bloco
  ADD COLUMN IF NOT EXISTS reinicia_numeracao boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tmpl_bloco.reinicia_numeracao IS
  'Reinicia as séries automáticas de capítulos e cláusulas a partir deste bloco; usado na abertura de um documento consolidado embutido.';

UPDATE public.tmpl_bloco
   SET tipo = 'clausula',
       updated_at = now()
 WHERE id = ANY (ARRAY[
   'ac000001-0000-4000-8000-000000000001'::uuid,
   'ac000001-0000-4000-8000-000000000002'::uuid,
   'ac000001-0000-4000-8000-000000000003'::uuid,
   'ac000001-0000-4000-8000-000000000004'::uuid,
   'ac000001-0000-4000-8000-000000000005'::uuid,
   'ac000001-0000-4000-8000-000000000006'::uuid
 ])
   AND tipo IS DISTINCT FROM 'clausula';

UPDATE public.tmpl_bloco
   SET tipo = 'clausula',
       updated_at = now()
 WHERE nome IN (
   'Cláusula — Ratificação dos atos anteriores',
   'Cláusula — Consolidação do contrato social'
 )
   AND tipo IS DISTINCT FROM 'clausula';

UPDATE public.tmpl_bloco
   SET reinicia_numeracao = true,
       updated_at = now()
 WHERE nome = 'Cabeçalho e qualificação da consolidação'
   AND NOT reinicia_numeracao;

DO $$
DECLARE
  r record;
  v_conteudo text;
  v_proxima integer;
BEGIN
  FOR r IN
    SELECT bv.id AS versao_id,
           bv.bloco_id,
           bv.conteudo
      FROM public.tmpl_bloco_versao bv
     WHERE bv.atual
       AND bv.bloco_id = ANY (ARRAY[
         'ac000001-0000-4000-8000-000000000001'::uuid,
         'ac000001-0000-4000-8000-000000000002'::uuid,
         'ac000001-0000-4000-8000-000000000003'::uuid,
         'ac000001-0000-4000-8000-000000000004'::uuid,
         'ac000001-0000-4000-8000-000000000005'::uuid,
         'ac000001-0000-4000-8000-000000000006'::uuid
       ])
       AND bv.conteudo ~ '^\*[^*]+\*[[:space:]]*'
  LOOP
    v_conteudo := regexp_replace(r.conteudo, '^\*[^*]+\*[[:space:]]*', '');

    SELECT coalesce(max(numero_versao), 0) + 1
      INTO v_proxima
      FROM public.tmpl_bloco_versao
     WHERE bloco_id = r.bloco_id;

    UPDATE public.tmpl_bloco_versao
       SET atual = false
     WHERE id = r.versao_id;

    INSERT INTO public.tmpl_bloco_versao (
      bloco_id,
      numero_versao,
      atual,
      conteudo,
      changelog
    )
    VALUES (
      r.bloco_id,
      v_proxima,
      true,
      v_conteudo,
      'Rubrica removida porque a resolução agora recebe numeração automática de cláusula.'
    );
  END LOOP;
END $$;