-- Add new columns for enhanced novidades functionality
ALTER TABLE public.novidades 
ADD COLUMN IF NOT EXISTS conteudo_completo TEXT,
ADD COLUMN IF NOT EXISTS imagem_lateral_url TEXT,
ADD COLUMN IF NOT EXISTS imagem_lateral_posicao TEXT DEFAULT 'direita',
ADD COLUMN IF NOT EXISTS texto_original TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.novidades.conteudo_completo IS 'Full content shown when "Ver mais" is clicked';
COMMENT ON COLUMN public.novidades.imagem_lateral_url IS 'URL for side image';
COMMENT ON COLUMN public.novidades.imagem_lateral_posicao IS 'Position of side image: esquerda or direita';
COMMENT ON COLUMN public.novidades.texto_original IS 'Original text before AI restructuring';