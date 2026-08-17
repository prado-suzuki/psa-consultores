BEGIN;

do $$
declare
  v_conflito integer;
begin
  select count(*) into v_conflito
  from public.documento_arquivo
  where (pessoa_id is not null)::int
      + (bem_id is not null)::int
      + (matricula_id is not null)::int > 1;

  if v_conflito > 0 then
    raise exception
      'BER-39 abortada: % arquivo(s) com mais de um dono. Trate essas linhas antes de aplicar a constraint.',
      v_conflito;
  end if;
end $$;

alter table public.documento_arquivo
  drop column if exists contribuinte_id,
  drop column if exists org_projects_id;

alter table public.documento_arquivo
  add column if not exists triado_em  timestamptz,
  add column if not exists triado_por uuid;

comment on column public.documento_arquivo.triado_em is
  'Quando alguém decidiu que este arquivo não é de nenhuma entidade e sim do cliente como um todo. Nulo = ainda no balde, esperando triagem. Não confundir com arquivo sem dono: o balde é triado_em nulo E as três colunas de vínculo nulas.';

comment on column public.documento_arquivo.triado_por is
  'Quem tomou essa decisão. Sem FK, no mesmo padrão de created_by e updated_by desta tabela.';

alter table public.documento_arquivo
  add constraint documento_arquivo_um_dono_apenas
  check (
      (pessoa_id   is not null)::int
    + (bem_id      is not null)::int
    + (matricula_id is not null)::int
    + (triado_em   is not null)::int
    <= 1
  );

comment on constraint documento_arquivo_um_dono_apenas on public.documento_arquivo is
  'O vínculo do arquivo é 1:1: no máximo uma entidade dona, ou a marca de triado como documento do cliente, nunca as duas. Linha com tudo nulo é aceita de propósito: é o arquivo ainda no balde.';

COMMIT;