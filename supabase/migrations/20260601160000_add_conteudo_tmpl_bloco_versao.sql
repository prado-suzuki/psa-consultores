-- ============================================================================
-- Conteúdo do bloco autorado in-app
-- ============================================================================
-- A modelagem original de tmpl_bloco_versao previa upload de arquivo .docx
-- (caminho_arquivo + checksum). A decisão de autoria in-app (a equipe OSG cria
-- os blocos dentro da aplicação) exige guardar o conteúdo do bloco diretamente
-- no banco, como texto com placeholders {{ }}.
--
-- caminho_arquivo/checksum permanecem para um eventual fluxo de upload futuro;
-- conteudo é a fonte para blocos criados pela própria aplicação.
-- ============================================================================

ALTER TABLE public.tmpl_bloco_versao
  ADD COLUMN IF NOT EXISTS conteudo text;
