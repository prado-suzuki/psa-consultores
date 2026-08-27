-- 20260825143000_alteracao_contratual_sucessao_e_escopo_documento.sql
--
-- A alteração contratual deixa de ser um PASSO do assistente de geração e passa
-- a ser um DOCUMENTO PRÓPRIO, criado a partir de outro documento e substituindo
-- o antigo. Esta migration abre no schema as três coisas que esse desenho pede e
-- que ainda não existiam.

-- ---------------------------------------------------------------------------
-- 1. A sucessão entre documentos
-- ---------------------------------------------------------------------------
ALTER TABLE public.documento_gerado
  ADD COLUMN IF NOT EXISTS substitui_documento_id uuid
    REFERENCES public.documento_gerado(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documento_gerado_substitui
  ON public.documento_gerado (substitui_documento_id)
  WHERE substitui_documento_id IS NOT NULL;

COMMENT ON COLUMN public.documento_gerado.substitui_documento_id IS
  'Documento (registrado) que esta peça substitui. Sucessão entre documentos DISTINTOS, '
  'diferente de documento_raiz_id/documento_anterior_id, que encadeiam versões do mesmo '
  'documento. Preenchido na raiz da alteração contratual e copiado nos forks da linhagem '
  'dela, para que qualquer versão responda o que substitui sem join até a raiz.';

-- ---------------------------------------------------------------------------
-- 2. O escopo 'documento' das flags manuais
-- ---------------------------------------------------------------------------
ALTER TABLE public.tmpl_flag DROP CONSTRAINT IF EXISTS tmpl_flag_escopo_check;
ALTER TABLE public.tmpl_flag
  ADD CONSTRAINT tmpl_flag_escopo_check
    CHECK (escopo = ANY (ARRAY['cliente'::text, 'pj'::text, 'documento'::text]));

ALTER TABLE public.projeto_flag_valor
  ADD COLUMN IF NOT EXISTS documento_base_id uuid
    REFERENCES public.documento_gerado(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.projeto_flag_valor.documento_base_id IS
  'Escopo ''documento'': o documento REGISTRADO a partir do qual esta resposta vale, isto é, '
  'o predecessor que a alteração contratual sucede — nunca o documento da alteração, que só '
  'nasce ao validar. NULL nos escopos ''cliente'' e ''pj''. CASCADE porque a resposta não faz '
  'sentido sem o documento que a ancora.';

DROP INDEX IF EXISTS public.uq_projeto_flag_valor_escopo_cliente;
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_cliente
  ON public.projeto_flag_valor (cliente_id, flag_id)
  WHERE pj_pessoa_id IS NULL AND documento_base_id IS NULL;

DROP INDEX IF EXISTS public.uq_projeto_flag_valor_escopo_pj;
CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_pj
  ON public.projeto_flag_valor (cliente_id, pj_pessoa_id, flag_id)
  WHERE pj_pessoa_id IS NOT NULL AND documento_base_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_projeto_flag_valor_escopo_documento
  ON public.projeto_flag_valor (documento_base_id, flag_id)
  WHERE documento_base_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. As seis flags de evento migram de 'pj' para 'documento'
-- ---------------------------------------------------------------------------
UPDATE public.tmpl_flag
   SET escopo = 'documento', updated_at = now()
 WHERE nome LIKE 'evento\_%'
   AND tipo = 'manual'
   AND escopo <> 'documento';

DELETE FROM public.projeto_flag_valor v
 USING public.tmpl_flag f
 WHERE v.flag_id = f.id
   AND f.escopo = 'documento'
   AND v.documento_base_id IS NULL;