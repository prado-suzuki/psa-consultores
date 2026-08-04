-- BER-39 · Um dono só por arquivo, e um lugar para gravar "não é de ninguém".
--
-- Duas faltas que a implementação do modo Classificar deixou registradas em
-- src/lib/classificarBalde.ts (linhas 31-36):
--
-- 1) O vínculo é 1:1 por decisão de projeto, mas isso só existe hoje dentro do
--    `patchVinculo` do front. Nada no banco impede uma linha com pessoa_id e
--    bem_id preenchidos ao mesmo tempo, e qualquer outro caminho de escrita
--    (DocVinculoDialog, upload, update manual) pode criar essa linha. O balde
--    então a esconde sem avisar, porque `semDono` exige as três colunas nulas.
--
-- 2) A marcação "este arquivo não é de ninguém, é do cliente" não tem onde ser
--    gravada. Hoje "ainda não triado" e "triado, é do cliente" são o MESMO
--    estado no banco (as três colunas nulas), então a marca vive num useState e
--    volta no F5. Quem marcou 12 arquivos encontra os 12 de volta no dia
--    seguinte, e a própria tela admite isso num aviso.
--
-- POR QUE triado_em/triado_por E NÃO UM BOOLEANO
--    A tarefa deixa a escolha entre `dono_cliente boolean` e o par
--    `triado_em` + `triado_por`. Custam a mesma migration. O par foi escolhido
--    porque o balde é uma FILA DE TRABALHO: quem reabrir daqui a alguns meses
--    vai querer saber quando aquele arquivo saiu da fila e por decisão de quem,
--    e um booleano não responde nem uma coisa nem outra. A auditoria da BER-41
--    registra o evento em audit_logs, mas ler uma coluna da própria linha é
--    direto e não depende de varrer log.
--    Sem FK em triado_por, no mesmo padrão de created_by e updated_by desta
--    tabela, que também são uuid solto.
--
-- AS COLUNAS QUE SAEM
--    contribuinte_id e org_projects_id nasceram marcadas "reservado" na
--    migration 20260622120000_osg_documento_arquivo.sql (linhas 29-30) e nunca
--    foram usadas. Conferido em 04/08/2026: sem FK, sem índice, zero linhas
--    preenchidas nas 43 existentes, e nenhum leitor no front (as ocorrências de
--    `contribuinte_id` em src/ são de outras tabelas, SPED e ICMS).
--
-- O QUE FICA DE FORA DA CONTA
--    documento_gerado_id é outro eixo: é o documento que a PSA gerou, não dono
--    de entidade. checklist_item_id e solicitacao_id também ficam fora, pelo
--    mesmo motivo. A conta é só de DONO.
--    cliente_id não serve de válvula: está sempre preenchido, então não
--    distingue "ainda não triado" de "triado, não é de ninguém".
--    excluido também não serve: esses arquivos são válidos e precisam continuar
--    visíveis no modo Organizar.
--
-- A LINHA TOTALMENTE VAZIA CONTINUA VÁLIDA, de propósito: é exatamente o que o
-- balde é, o arquivo que chegou e ninguém triou ainda. Por isso `<= 1` e não
-- `= 1`.
--
-- Medido em 04/08/2026: 0 arquivos com mais de um dono, de 43 no total. A
-- constraint entra sem precisar tratar nada antes. A guarda abaixo repete a
-- medição na hora de aplicar, porque o dado pode ter mudado.
--
-- RLS: nada a fazer. As policies de documento_arquivo decidem por cliente_id e
-- fonte, e passam a valer para as colunas novas automaticamente.
--
-- Reversão:
--   alter table public.documento_arquivo drop constraint documento_arquivo_um_dono_apenas;
--   alter table public.documento_arquivo drop column triado_em, drop column triado_por;
--   alter table public.documento_arquivo add column contribuinte_id uuid, add column org_projects_id uuid;

BEGIN;

-- Guarda: se alguma linha já tem mais de um dono, a constraint não entra e a
-- migration para aqui, sem deixar meia alteração aplicada.
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
