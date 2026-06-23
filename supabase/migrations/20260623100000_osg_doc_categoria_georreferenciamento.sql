-- OSG · nova categoria de documento "georreferenciamento" (PDFs de georref das matrículas).
-- ALTER TYPE ... ADD VALUE não pode rodar dentro de um bloco de transação; deixa solto.
ALTER TYPE public.osg_doc_categoria ADD VALUE IF NOT EXISTS 'georreferenciamento';
