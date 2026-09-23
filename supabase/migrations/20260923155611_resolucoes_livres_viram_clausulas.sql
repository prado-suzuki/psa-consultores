-- As resoluções que nasceram depois da 20260826143700 (qualificação de sócio,
-- as cinco da doação, instituição de usufruto e as duas de governança) ainda
-- eram `livre` com rubrica em negrito, e saíam sem número entre resoluções
-- numeradas ("Da doação de quotas." ao lado de "CLÁUSULA PRIMEIRA:").
--
-- Viram `clausula` e perdem a rubrica, que o prefixo automático substitui. A
-- numeração do consolidado não muda: o cabeçalho da consolidação reinicia a
-- série (`reinicia_numeracao`).
--
-- Só dados. A rubrica sai em versão nova, e apenas quando a vigente ainda
-- começa por ela; reaplicar não empilha nada.

do $$
declare
  r record;
  v_versao record;
  v_proxima integer;
begin
  for r in
    select *
      from (values
        ('ac000001-0000-4000-8000-000000000007'::uuid, $r$*Da atualização da qualificação de sócio.* $r$),
        ('9009b16c-639f-43b0-96a0-d056c2488f14'::uuid, $r$*Da doação de quotas.* $r$),
        ('10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid, $r$*Da reserva de usufruto.* $r$),
        ('82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid, $r$*Dos gravames.* $r$),
        ('17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid, $r$*Da anuência e renúncia à preferência.* $r$),
        ('c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid, $r$*Do usufruto e do direito de voto.* $r$),
        ('bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid, $r$*Da instituição de usufruto.* $r$),
        ('01a20156-0ae5-4011-9919-d50b3b9e852b'::uuid, $r$*Da instalação da governança.* $r$),
        ('22d227a0-0b64-4932-b2db-0388f893d587'::uuid, $r$*Da alteração da governança.* $r$)
      ) as t(bloco_id, rubrica)
  loop
    update public.tmpl_bloco
       set tipo = 'clausula', updated_at = now()
     where id = r.bloco_id
       and tipo is distinct from 'clausula';

    select id, conteudo into v_versao
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id
       and atual
       and starts_with(conteudo, r.rubrica);

    if v_versao.id is null then
      continue;
    end if;

    select coalesce(max(numero_versao), 0) + 1 into v_proxima
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id;

    update public.tmpl_bloco_versao set atual = false where id = v_versao.id;

    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
    values (
      r.bloco_id,
      v_proxima,
      true,
      substr(v_versao.conteudo, char_length(r.rubrica) + 1),
      'Rubrica removida porque a resolução agora recebe numeração automática de cláusula.'
    );
  end loop;
end $$;
