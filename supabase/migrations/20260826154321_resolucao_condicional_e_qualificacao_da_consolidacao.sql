-- 20260826154321_resolucao_condicional_e_qualificacao_da_consolidacao.sql
--
-- Três defeitos que a revisão do documento de validação encontrou, todos de
-- redação do catálogo (nenhum de schema).
--
-- 1) A resolução de capital afirmava um aumento que podia não existir
-- ------------------------------------------------------------------
-- O delta é calculado por diferença contra o snapshot do documento registrado
-- anterior (calcularHistoricoCapital). Marcar o evento "houve aumento de
-- capital" no assistente sem o capital ter mudado no cadastro é cenário
-- legítimo, mas produzia saída ilegítima: "Aumenta-se o capital social em
-- R$ 0,00 (zero reais), de modo que o capital anterior de X passa a ser de X".
-- O bloco não tinha como sumir, porque não tinha condicional.
--
-- Agora tem: `sociedade.houveAumentoCapital` (vocabulario.ts) só devolve "sim"
-- para delta finito e positivo. Delta nulo (peça sem predecessor registrado),
-- zero e negativo (redução de capital, que é outro evento e pede outra redação)
-- deixam o bloco renderizar em branco, e o motor o derruba pelo motivo
-- "render-em-branco", anunciando-se, que é o comportamento contratado.
--
-- 2) A resolução usava presente onde os instrumentos reais usam futuro
-- ------------------------------------------------------------------
-- O efeito do aumento depende do registro na Junta, e é por isso que os três
-- instrumentos com aumento de capital (Zamo 1ª, MMS Agro 2ª, MMS Participações
-- 1ª) escrevem "passará a ser de" na resolução. O presente fica só no
-- consolidado ("O capital social é de"), que já estava correto e não muda.
--
-- 3) A qualificação da sociedade estava assimétrica entre as duas aberturas
-- ------------------------------------------------------------------
-- A abertura da alteração trazia CNPJ, NIRE e sede; a da consolidação trazia só
-- o nome. Nos sete instrumentos reais as duas são completas (Campos de Canaã 2ª
-- qualifica a sociedade inteira também na abertura do consolidado). O fecho da
-- consolidação passa a espelhar o da alteração, mantendo o verbo próprio dele
-- ("resolvem consolidar", sem o "alterar e").
--
-- De quebra, as duas aberturas ganham a preposição que faltava antes do
-- endereço: `sociedade.sede` vem sem preposição (é `enderecoProsa`), e o texto
-- saía "com sede estabelecida Rua General João Luis Pereira, nº 349".
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

-- Bloco 1: Resolução: aumento do capital social ------------------------------
DO $$
DECLARE
  v_bloco uuid := 'ac000001-0000-4000-8000-000000000002';
  v_conteudo text;
  v_proxima integer;
BEGIN
  -- Guarda de idempotência: a versão vigente já condicionada não tem o que
  -- receber (rodar de novo não empilha versão nova).
  SELECT conteudo INTO v_conteudo
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = v_bloco AND atual
     AND conteudo NOT LIKE '%houveAumentoCapital%';
  IF v_conteudo IS NULL THEN
    RETURN;
  END IF;

  -- "passa a vigorar" (a cláusula alterada) não é alvo: só a frase do capital.
  v_conteudo := '{{#sociedade.houveAumentoCapital}}'
             || replace(v_conteudo, ') passa a ser de R$', ') passará a ser de R$')
             || '{{/sociedade.houveAumentoCapital}}';

  SELECT coalesce(max(numero_versao), 0) + 1 INTO v_proxima
    FROM public.tmpl_bloco_versao WHERE bloco_id = v_bloco;

  -- `uq_tmpl_bloco_versao_atual` é único por bloco onde `atual`: a vigente sai
  -- de cena antes de a nova entrar.
  UPDATE public.tmpl_bloco_versao SET atual = false
   WHERE bloco_id = v_bloco AND atual;

  INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  VALUES (
    v_bloco, v_proxima, true, v_conteudo,
    'A resolução só entra quando houve aumento de fato, e o efeito do aumento vai para o futuro, que é onde a Junta o produz.'
  );
END $$;

-- Bloco 2: Preâmbulo — qualificação e abertura da alteração ------------------
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

-- Bloco 3: Cabeçalho e qualificação da consolidação --------------------------
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
