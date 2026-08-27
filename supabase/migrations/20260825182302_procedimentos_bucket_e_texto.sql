-- Biblioteca de Procedimentos: apontar para arquivo de outro bucket, e aceitar
-- procedimento que já é texto.
--
-- Duas fontes de documentação que já existem no banco não podiam virar
-- procedimento sem isto:
--
--   1. `project_documents` moram no bucket `project-documents`, e a leitura
--      (`processar-procedimento`) baixa fixo de `sop-documents` porque a tabela
--      não dizia de qual bucket o arquivo vem. Apontar para lá buscava no
--      lugar errado.
--
--   2. `processes.formatted_content` é o procedimento JÁ escrito em texto no
--      banco — o caso mais fácil que existe, sem extrair PDF nenhum. O CHECK
--      de `source_type` só aceitava link/pdf/docx.
--
-- Aditivo: coluna nova com default preenche as linhas existentes, e o CHECK só
-- ganha um valor a mais. Nenhuma linha atual deixa de ser válida.

alter table public.procedimentos
  add column if not exists arquivo_bucket text not null default 'sop-documents';

comment on column public.procedimentos.arquivo_bucket is
  'Bucket do Storage onde `arquivo_path` vive. Default mantém o comportamento antigo (sop-documents); project_documents usam project-documents.';

alter table public.procedimentos
  add column if not exists conteudo_texto text;

comment on column public.procedimentos.conteudo_texto is
  'Texto do procedimento quando `source_type` = ''texto'' (ex.: cópia de processes.formatted_content no momento da importação). Guardar a cópia é o que permite reprocessar depois sem depender do original ter mudado.';

-- Idempotente pelo par drop/add: rodar de novo recria o mesmo CHECK.
alter table public.procedimentos
  drop constraint if exists procedimentos_source_type_check;

alter table public.procedimentos
  add constraint procedimentos_source_type_check
  check (source_type = any (array['link'::text, 'pdf'::text, 'docx'::text, 'texto'::text]));
