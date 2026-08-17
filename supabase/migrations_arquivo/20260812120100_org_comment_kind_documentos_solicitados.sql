-- 20260812120100_org_comment_kind_documentos_solicitados.sql
-- EDU-1 · o feed de comentarios ganha o tipo "documentos solicitados".
-- ALTER TYPE ... ADD VALUE nao roda dentro de bloco de transacao; fica solto,
-- sem BEGIN/COMMIT. Molde: 20260623100000_osg_doc_categoria_georreferenciamento.sql
ALTER TYPE public.org_comment_kind ADD VALUE IF NOT EXISTS 'documentos_solicitados';
