-- 20260826143900_frente_f_fecho_assinaturas.sql

DO $$
DECLARE
  v_bloco uuid := 'f1ec14fc-573e-43e4-afc3-9a890102abe4';
  v_proxima integer;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.tmpl_bloco_versao
     WHERE bloco_id = v_bloco
       AND atual
       AND conteudo LIKE '%assinam o presente instrumento, na presença das testemunhas abaixo nomeadas.%'
       AND conteudo NOT LIKE '%advogadoNome%'
       AND conteudo NOT LIKE '%advogadoOabNumero%'
       AND conteudo NOT LIKE '%advogadoOabUf%'
  ) THEN
    RETURN;
  END IF;

  SELECT coalesce(max(numero_versao), 0) + 1
    INTO v_proxima
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = v_bloco;

  UPDATE public.tmpl_bloco_versao
     SET atual = false
   WHERE bloco_id = v_bloco
     AND atual;

  INSERT INTO public.tmpl_bloco_versao (
    bloco_id,
    numero_versao,
    atual,
    conteudo,
    changelog
  )
  VALUES (
    v_bloco,
    v_proxima,
    true,
    $txt$E, por estarem assim justos, certos e contratados, declaram de inteiro acordo com as cláusulas e condições deste instrumento e assinam o presente instrumento, na presença das testemunhas abaixo nomeadas.

{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.


{{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}


TESTEMUNHAS:

_______________________________________
*{{ testemunha1Nome }}*
RG: {{ testemunha1Rg }} | CPF: {{ testemunha1Cpf }}

_______________________________________
*{{ testemunha2Nome }}*
RG: {{ testemunha2Rg }} | CPF: {{ testemunha2Cpf }}$txt$,
    'Frente F: remove advogado/OAB sem exigência registral e organiza as duas testemunhas como assinaturas nominadas no fecho padrão.'
  );
END $$;