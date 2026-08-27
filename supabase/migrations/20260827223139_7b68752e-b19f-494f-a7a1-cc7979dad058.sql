-- 20260825213000_cabecalho_titulo_do_instrumento.sql
DO $$
DECLARE
  v_bloco uuid := 'a63d92fd-2acf-4c72-8c7b-5d645e4c3595';  -- Cabeçalho e razão social
  v_proxima integer;
BEGIN
  -- Guarda de idempotência: se a versão vigente já usa o campo, não há o que
  -- fazer (rodar de novo não empilha versão nova).
  IF EXISTS (
    SELECT 1 FROM public.tmpl_bloco_versao
     WHERE bloco_id = v_bloco AND atual
       AND conteudo LIKE '%sociedade.tituloInstrumento%'
  ) THEN
    RETURN;
  END IF;

  SELECT coalesce(max(numero_versao), 0) + 1 INTO v_proxima
    FROM public.tmpl_bloco_versao WHERE bloco_id = v_bloco;

  -- `uq_tmpl_bloco_versao_atual` é único por bloco onde `atual`: a vigente sai
  -- de cena antes de a nova entrar.
  UPDATE public.tmpl_bloco_versao SET atual = false
   WHERE bloco_id = v_bloco AND atual;

  INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  VALUES (
    v_bloco, v_proxima, true,
    E'{{ sociedade.tituloInstrumento }}\n\n*{{ sociedade.razaoSocial }}*\n',
    'Título do instrumento vira campo: a mesma folha abre como constituição ou como alteração e consolidação, conforme a posição na cadeia de sucessão.'
  );
END $$;