BEGIN;

alter table public.documento_arquivo
  add column if not exists solicitacao_id uuid
    references public.solicitacao(id) on delete set null;

comment on column public.documento_arquivo.solicitacao_id is
  'De qual solicitação veio o lote. Nulo = arquivo sem pedido associado. NÃO liga o arquivo ao item pedido: a classificação item x arquivo é trabalho posterior do analista.';

-- Índice parcial no padrão da própria tabela, que já indexa por excluido = false.
create index if not exists idx_doc_arq_solicitacao
  on public.documento_arquivo (solicitacao_id)
  where excluido = false;

COMMIT;