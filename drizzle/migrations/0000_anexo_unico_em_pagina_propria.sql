-- O Anexo Único começa em PÁGINA NOVA, no mesmo arquivo
--
-- ── O QUE MUDA ──────────────────────────────────────────────────────────────
--
-- Nos dois instrumentos agrários (Parceria Rural e Composse Rural Pro Indiviso) o
-- Anexo Único hoje emenda na mesma página em que terminam as testemunhas. No Drive
-- da OSG ele é arquivo separado, com numeração de página própria; a decisão do
-- escopo (02/09/2026) foi manter UM arquivo só, com o Anexo na cauda. Falta o meio
-- termo que o assinado tem e o gerado não: o Anexo abrindo em página própria.
--
-- ── POR QUE COLUNA, E NÃO TEXTO NO BLOCO ────────────────────────────────────
--
-- "Quebrar a página antes deste bloco" é FORMA, e forma de bloco mora no catálogo,
-- não no meio da redação. O precedente é `tmpl_bloco.reinicia_numeracao`
-- (20260826143700): mesmo formato (boolean NOT NULL DEFAULT false), mesmo papel
-- (efeito estrutural que o motor lê e o autor declara), mesma razão (o alternativo
-- seria o gerador reconhecer o bloco pelo NOME ou pelo texto "ANEXO ÚNICO", que
-- quebra no dia em que alguém reescrever o título).
--
-- A coluna serve a qualquer documento: o Contrato Social consolidado e o Acordo de
-- Quotistas podem marcar o que precisar sem uma linha a mais aqui.
--
-- ── ORDEM DE APLICAÇÃO (a regra dura do AGENTS.md) ──────────────────────────
--
-- Esta migration vem ANTES do código. O `select` que carrega o catálogo nomeia as
-- colunas (`useModelosDocumento.ts:66`), então pedir `quebra_pagina_antes` antes de
-- ela existir faz a consulta inteira falhar — a tela Gerar mostraria "modelo sem
-- blocos", não um campo vazio.
--
-- O código que falta, depois desta migration aplicada:
--   1. `src/lib/templates/types.ts` — `quebraPaginaAntes?: boolean` em `Bloco`;
--   2. o carregamento do catálogo (`useModelosDocumento.ts`, `useBibliotecaModelos.ts`,
--      `useGerarDocumentoController.ts` e o arnês `scripts/osg/render-contratos-mms.ts`)
--      — trazer a coluna e mapear para o campo do motor;
--   3. `src/lib/templates/docx.ts` — no primeiro parágrafo do bloco marcado, emitir
--      `pageBreakBefore: true`. É aditivo e guardado pela flag: bloco sem a marca sai
--      exatamente como sai hoje, inclusive no Contrato Social.
--
-- A prévia em tela (HTML) não muda: quebra de página só existe no .docx.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync`; produção pelo chat
-- do Lovable, pelo tech lead.

ALTER TABLE public.tmpl_bloco
  ADD COLUMN IF NOT EXISTS quebra_pagina_antes boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tmpl_bloco.quebra_pagina_antes IS
  'Abre página nova antes deste bloco no .docx gerado; usado no Anexo Único dos instrumentos agrários. Não afeta a prévia em tela.';

-- Os dois blocos de Anexo, por NOME: os ids saíram de `gen_random_uuid()` nas
-- migrations de catálogo (20260901190315 e seguintes) e não são estáveis entre
-- bancos. O nome é, e é único dentro do catálogo rural.
UPDATE public.tmpl_bloco
   SET quebra_pagina_antes = true,
       updated_at = now()
 WHERE nome IN ('Anexo Único (parceria)', 'Anexo Único (composse)')
   AND NOT quebra_pagina_antes;

-- Reaplicar é seguro (o UPDATE é guardado), mas silêncio não é: se o nome do bloco
-- mudar, a migration roda "com sucesso" sem marcar nada e o Anexo continua colado na
-- página das testemunhas. Então ela conta e avisa.
DO $$
DECLARE
  v_marcados integer;
BEGIN
  SELECT count(*) INTO v_marcados
    FROM public.tmpl_bloco
   WHERE nome IN ('Anexo Único (parceria)', 'Anexo Único (composse)')
     AND quebra_pagina_antes;

  IF v_marcados <> 2 THEN
    RAISE EXCEPTION
      'Esperava marcar 2 blocos de Anexo Único e marquei %. Confira os nomes em tmpl_bloco antes de seguir.',
      v_marcados;
  END IF;

  RAISE NOTICE 'Anexo Único marcado para abrir em página nova nos 2 instrumentos agrários.';
END $$;
