-- 20260825213000_cabecalho_titulo_do_instrumento.sql
--
-- O cabeçalho deixa de afirmar que toda peça é uma CONSTITUIÇÃO.
--
-- O problema, como ele aparece na tela
-- ------------------------------------------------------------------
-- No desenho fechado em 20260825143000, a alteração contratual não tem modelo
-- próprio: ela é gerada a partir do MESMO modelo de contrato social, com as
-- resoluções na frente e o consolidado atrás. Como o bloco "Cabeçalho e razão
-- social" trazia o título escrito à mão,
--
--     INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA
--
-- a alteração saía anunciando-se como constituição. O título certo é
-- "PRIMEIRA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL", com o ordinal por
-- extenso conforme a posição da peça na cadeia de sucessão.
--
-- Por que um CAMPO, e não um bloco alternativo por flag
-- ------------------------------------------------------------------
-- Um cabeçalho alternativo pendurado numa flag exigiria o oposto do que
-- `comporBlocos` sabe fazer: ele compõe com AND simples e não tem negação, então
-- o cabeçalho de constituição precisaria de uma condição "NÃO há alteração" para
-- sair de cena, e a flag teria de ser OR entre os seis eventos. Nada disso
-- existe no motor, e inventar as duas coisas para um título seria caro.
--
-- Além do custo, o AND não sabe CONTAR: "primeira", "segunda", "terceira" não é
-- um estado ligado ou desligado, é a posição do documento numa cadeia. Isso o
-- motor de composição não tem como derivar; quem sabe é a tela, que enxerga
-- `documento_gerado.substitui_documento_id`.
--
-- Por isso o título vira campo do vocabulário (`sociedade.tituloInstrumento`),
-- preenchido por `tituloDoInstrumento` em src/lib/templates/mapeadores.ts a
-- partir da contagem de elos que `useOrdemNaSucessao` faz. Sendo campo, ele
-- ainda é editável na prévia como qualquer outro: o consultor que precisar de
-- outra redação a escreve sem mexer no catálogo.
--
-- Os documentos já registrados não mudam: eles renderizam do próprio
-- `snapshot_versoes_blocos`, que congela a versão 3 deste bloco.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

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
