-- 20260826143900_frente_f_fecho_assinaturas.sql
--
-- Frente F: o fecho mantém a modalidade com testemunhas, mas deixa de pedir
-- advogado e OAB, campos que não aparecem nas alterações contratuais reais.
--
-- Por que esta migration não cria as duas modalidades
-- ------------------------------------------------------------------
-- A escolha seria global ao documento, mas o produto não tem hoje um seletor
-- mutuamente exclusivo para ela. As flags manuais são interruptores
-- independentes, e `comporBlocos` só conhece AND, sem negação: dois blocos por
-- flag permitiriam ligar ambos; uma flag para o digital não permitiria expressar
-- o fecho padrão quando ela estivesse desligada. Família de variantes também não
-- resolve sem inventar um campo de contexto para guardar a escolha.
--
-- Por isso fica vigente a modalidade que o bloco já adotava e para a qual a tela
-- já oferece os seis campos de testemunhas. O fecho digital sem testemunhas
-- depende de uma seleção exclusiva na UI e fica fora desta migration, em vez de
-- introduzir um estado ambíguo no catálogo.
--
-- Por que advogado e OAB saem, em vez de ganharem outra flag
-- ------------------------------------------------------------------
-- A decisão do consultor é que advogado/OAB não é exigido, e nenhum dos sete
-- instrumentos reais analisados traz esse bloco. Mantê-lo opcional continuaria
-- mostrando três campos órfãos na tela Gerar e deixaria espaço para uma
-- assinatura sem função no instrumento.
--
-- Documentos já validados não mudam: eles renderizam a versão congelada no seu
-- `snapshot_versoes_blocos`. A versão 4 permanece no histórico e a nova versão
-- é empilhada como vigente.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

DO $$
DECLARE
  v_bloco uuid := 'f1ec14fc-573e-43e4-afc3-9a890102abe4';
  v_proxima integer;
BEGIN
  -- A frase e a ausência do placeholder identificam o resultado, sem depender
  -- do número da versão: assim uma segunda execução não empilha outra cópia.
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

  -- A restrição parcial permite só uma versão atual por bloco, portanto a
  -- anterior sai de cena antes de a nova entrar; ela não é sobrescrita.
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
