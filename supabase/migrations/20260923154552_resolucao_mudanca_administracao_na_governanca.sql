-- A "Resolução: mudança na administração" cita `refs.administracao_social`, que só
-- a cláusula da administração SIMPLES publica. Com governança essa cláusula sai
-- pela flag e a AC quebrava com "Placeholder não resolvido".
--
-- A redação dela também não serve com governança: reescreve a cláusula como
-- "administrada isoladamente por", o que contradiz o capítulo de Conselho e
-- Diretoria. Por isso ela passa a pender de `administracao_simples`, e o lado da
-- governança ganha a própria resolução, citando o capítulo inteiro como as
-- resoluções de instalação e alteração da governança já fazem.
--
-- Só DADOS. Documento validado antes desta migration não perde a resolução:
-- `comFlagDaPecaRetroativa` completa `administracao_simples` no snapshot antigo.

insert into public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
values (
  '40dd930b-701b-4c6d-821d-b4f6b6d5ae23',
  'Resolução: mudança na administração (governança)',
  'alteracao-contratual',
  'Entra quando o evento "Houve mudança na administração da sociedade" é marcado e a administração é por órgãos de governança.',
  'clausula',
  true
)
on conflict (id) do nothing;

insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
select '40dd930b-701b-4c6d-821d-b4f6b6d5ae23', 1, true,
       $txt$Altera-se a administração da sociedade, modificando-se, consequentemente, as disposições contidas no {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$,
       'Redação inicial: a mudança na administração quando o contrato tem órgãos de governança.'
 where not exists (
   select 1 from public.tmpl_bloco_versao v
    where v.bloco_id = '40dd930b-701b-4c6d-821d-b4f6b6d5ae23'
 );

do $$
declare
  vinculos constant text[][] := array[
    ['ac000001-0000-4000-8000-000000000005', 'administracao_simples'],
    ['40dd930b-701b-4c6d-821d-b4f6b6d5ae23', 'evento_mudanca_administracao'],
    ['40dd930b-701b-4c6d-821d-b4f6b6d5ae23', 'governanca_por_orgaos']
  ];
  v_flag uuid;
  i integer;
begin
  for i in 1 .. array_length(vinculos, 1) loop
    select id into v_flag from public.tmpl_flag where nome = vinculos[i][2];
    if v_flag is null then
      raise exception 'flag % ausente: a migration da governança não rodou neste banco', vinculos[i][2];
    end if;
    insert into public.tmpl_bloco_flag (bloco_id, flag_id)
    values (vinculos[i][1]::uuid, v_flag)
    on conflict (bloco_id, flag_id) do nothing;
  end loop;
end $$;

-- Logo depois da resolução da administração simples, em cada modelo societário:
-- Agro e Participações não têm as mesmas ordens, então a posição sai por documento.
do $$
declare
  documento record;
  v_ordem integer;
begin
  for documento in select id, nome from public.tmpl_documento where tipo = 'societario' loop
    if exists (
      select 1 from public.tmpl_documento_bloco
       where documento_id = documento.id
         and bloco_id = '40dd930b-701b-4c6d-821d-b4f6b6d5ae23'
    ) then
      continue;
    end if;

    select vinculo.ordem into v_ordem
      from public.tmpl_documento_bloco vinculo
     where vinculo.documento_id = documento.id
       and vinculo.bloco_id = 'ac000001-0000-4000-8000-000000000005';

    if v_ordem is null then
      raise exception 'a resolução da mudança na administração não está no documento "%"', documento.nome;
    end if;

    update public.tmpl_documento_bloco
       set ordem = ordem + 1, updated_at = now()
     where documento_id = documento.id and ordem > v_ordem;

    insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
    values (documento.id, '40dd930b-701b-4c6d-821d-b4f6b6d5ae23', v_ordem + 1, false)
    on conflict (documento_id, bloco_id) do nothing;
  end loop;
end $$;
