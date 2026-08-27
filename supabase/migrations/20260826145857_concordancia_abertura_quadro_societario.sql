-- 20260826145857_concordancia_abertura_quadro_societario.sql
--
-- A abertura não pode presumir masculino plural: sociedades com sócia única ou
-- quadro exclusivamente feminino exigem outra concordância. O mapeador deriva a
-- forma coletiva do quadro e estes blocos passam a consumi-la.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

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
      FROM public.tmpl_bloco_versao AS bv
     WHERE bv.atual
       AND bv.bloco_id = ANY (ARRAY[
         'ac000002-0000-4000-8000-000000000001'::uuid,
         'ac000002-0000-4000-8000-000000000005'::uuid
       ])
       AND bv.conteudo LIKE '%Únicos sócios%'
  LOOP
    v_conteudo := replace(r.conteudo, 'Únicos sócios', '{{ sociedade.tituloColetivoSocios }}');

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
      'A abertura passa a concordar número e gênero com o quadro societário.'
    );
  END LOOP;
END $$;
