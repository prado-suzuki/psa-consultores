-- 20260826154321_resolucao_condicional_e_qualificacao_da_consolidacao.sql

DO $$
DECLARE
  v_bloco uuid := 'ac000001-0000-4000-8000-000000000002';
  v_conteudo text;
  v_proxima integer;
BEGIN
  SELECT conteudo INTO v_conteudo
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = v_bloco AND atual
     AND conteudo NOT LIKE '%houveAumentoCapital%';
  IF v_conteudo IS NULL THEN
    RETURN;
  END IF;

  v_conteudo := '{{#sociedade.houveAumentoCapital}}'
             || replace(v_conteudo, ') passa a ser de R$', ') passará a ser de R$')
             || '{{/sociedade.houveAumentoCapital}}';

  SELECT coalesce(max(numero_versao), 0) + 1 INTO v_proxima
    FROM public.tmpl_bloco_versao WHERE bloco_id = v_bloco;

  UPDATE public.tmpl_bloco_versao SET atual = false
   WHERE bloco_id = v_bloco AND atual;

  INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  VALUES (
    v_bloco, v_proxima, true, v_conteudo,
    'A resolução só entra quando houve aumento de fato, e o efeito do aumento vai para o futuro, que é onde a Junta o produz.'
  );
END $$;

DO $$
DECLARE
  v_bloco uuid := 'ac000002-0000-4000-8000-000000000001';
  v_conteudo text;
  v_proxima integer;
BEGIN
  SELECT conteudo INTO v_conteudo
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = v_bloco AND atual
     AND conteudo LIKE '%com sede estabelecida {{ sociedade.sede }}%';
  IF v_conteudo IS NULL THEN
    RETURN;
  END IF;

  v_conteudo := replace(
    v_conteudo,
    'com sede estabelecida {{ sociedade.sede }}',
    'com sede estabelecida na {{ sociedade.sede }}'
  );

  SELECT coalesce(max(numero_versao), 0) + 1 INTO v_proxima
    FROM public.tmpl_bloco_versao WHERE bloco_id = v_bloco;

  UPDATE public.tmpl_bloco_versao SET atual = false
   WHERE bloco_id = v_bloco AND atual;

  INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  VALUES (
    v_bloco, v_proxima, true, v_conteudo,
    'A sede ganha a preposição que o campo não carrega.'
  );
END $$;

DO $$
DECLARE
  v_bloco uuid := 'ac000002-0000-4000-8000-000000000005';
  v_conteudo text;
  v_proxima integer;
BEGIN
  SELECT conteudo INTO v_conteudo
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = v_bloco AND atual
     AND conteudo LIKE '%*{{ sociedade.razaoSocial }}*, resolvem consolidar%';
  IF v_conteudo IS NULL THEN
    RETURN;
  END IF;

  v_conteudo := replace(
    v_conteudo,
    '*{{ sociedade.razaoSocial }}*, resolvem consolidar',
    '*{{ sociedade.razaoSocial }}*, inscrita no CNPJ sob o nº {{ sociedade.cnpj }}, '
      || 'registrada na Junta Comercial do Estado de {{ sociedade.juntaUfExtenso }} '
      || 'sob o NIRE nº {{ sociedade.nire }}, com sede estabelecida na '
      || '{{ sociedade.sede }}, resolvem consolidar'
  );

  SELECT coalesce(max(numero_versao), 0) + 1 INTO v_proxima
    FROM public.tmpl_bloco_versao WHERE bloco_id = v_bloco;

  UPDATE public.tmpl_bloco_versao SET atual = false
   WHERE bloco_id = v_bloco AND atual;

  INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  VALUES (
    v_bloco, v_proxima, true, v_conteudo,
    'A abertura do consolidado qualifica a sociedade inteira, como a da alteração já fazia.'
  );
END $$;