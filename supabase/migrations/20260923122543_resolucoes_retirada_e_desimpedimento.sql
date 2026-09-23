-- AS RESOLUÇÕES DE RETIRADA DOS CEDENTES E DE DESIMPEDIMENTO
--
-- Os dois blocos (`ac000001-…-010` e `-011`) existem no sandbox desde 28/08/2026,
-- criados fora do repositório, e nunca chegaram a produção. O texto, as flags e
-- as posições abaixo são os do sandbox.
--
-- ── ORDEM EM PRODUÇÃO ───────────────────────────────────────────────────────
--
-- ANTES de 20260915201913_capitulo_da_governanca_no_contrato_social, que
-- enfileira as resoluções de governança depois do desimpedimento e aborta se ele
-- não existir. Não depende de 20260915200947.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS: `tmpl_bloco`, `tmpl_bloco_versao`, `tmpl_bloco_flag` e
-- `tmpl_documento_bloco`. Nenhum DDL, `types.ts` intocado. VAI PARA PRODUÇÃO.
--
-- ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
--
-- Bloco e vínculo com `on conflict do nothing`, versão só se o bloco não tiver
-- nenhuma, e a ordem só é empurrada no documento que ainda não tem o bloco.

create or replace function pg_temp.resolucao(
  p_id uuid, p_nome text, p_descricao text, p_conteudo text, p_flag text
) returns void language plpgsql as $fn$
declare
  v_flag uuid;
begin
  insert into public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
  values (p_id, p_nome, 'alteracao', p_descricao, 'clausula', true)
  on conflict (id) do nothing;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  select p_id, 1, true, p_conteudo, 'Redação inicial da resolução, trazida do sandbox.'
   where not exists (
     select 1 from public.tmpl_bloco_versao v where v.bloco_id = p_id
   );

  select id into v_flag from public.tmpl_flag where nome = p_flag;
  if v_flag is null then
    raise exception 'flag % ausente neste banco', p_flag;
  end if;
  insert into public.tmpl_bloco_flag (bloco_id, flag_id)
  values (p_id, v_flag)
  on conflict (bloco_id, flag_id) do nothing;
end $fn$;

/*
 * Põe o bloco logo depois da âncora em CADA documento societário. A âncora é
 * procurada pelo nome: Agro e Participações não têm as mesmas ordens.
 */
create or replace function pg_temp.depois_de(
  p_ancora text, p_bloco uuid, p_observacao text
) returns void language plpgsql as $fn$
declare
  documento record;
  v_ordem integer;
begin
  for documento in select id, nome from public.tmpl_documento where tipo = 'societario' loop
    if exists (
      select 1 from public.tmpl_documento_bloco
       where documento_id = documento.id and bloco_id = p_bloco
    ) then
      continue;
    end if;

    select vinculo.ordem into v_ordem
      from public.tmpl_documento_bloco vinculo
      join public.tmpl_bloco b on b.id = vinculo.bloco_id
     where vinculo.documento_id = documento.id and b.nome = p_ancora;

    if v_ordem is null then
      raise exception 'âncora "%" não existe no documento "%"', p_ancora, documento.nome;
    end if;

    update public.tmpl_documento_bloco
       set ordem = ordem + 1, updated_at = now()
     where documento_id = documento.id and ordem > v_ordem;

    insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio, observacao)
    values (documento.id, p_bloco, v_ordem + 1, false, p_observacao)
    on conflict (documento_id, bloco_id) do nothing;
  end loop;
end $fn$;

select pg_temp.resolucao(
  'ac000001-0000-4000-8000-000000000010'::uuid,
  'Resolução: retirada dos sócios cedentes',
  'Quem cedeu a totalidade das quotas retira-se da sociedade. Consequência da cessão que a junta espera escrita: sem ela a peça publica o quadro novo sem dizer que os antigos sócios saíram.',
  'Em virtude das cessões e transferências descritas nas cláusulas anteriores, {{ retirada.porTerCedido }} a totalidade de suas quotas, {{ retirada.titulo }} {{#retirantes sep=", " fim=" e "}}*{{ retirante.nomeMaiusculo }}*{{/retirantes}} {{ retirada.verbo }} da sociedade.',
  'evento_mudanca_socios'
);

select pg_temp.resolucao(
  'ac000001-0000-4000-8000-000000000011'::uuid,
  'Resolução: desimpedimento dos administradores nomeados',
  'Declaração de desimpedimento de quem foi nomeado para administrar nesta alteração (art. 1.011, § 1º, CC/2002). A junta exige a declaração no mesmo instrumento que nomeia.',
  'Os administradores nomeados neste ato declaram, sob as penas da lei, que não estão impedidos de exercer a administração da sociedade, por lei especial ou em virtude de condenação criminal, nem se encontram sob os efeitos de pena que vede, ainda que temporariamente, o acesso a cargos públicos, por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, contra o sistema financeiro nacional, contra as normas de defesa da concorrência, contra as relações de consumo, a fé pública ou a propriedade, nos termos do artigo 1.011, § 1º, do Código Civil.',
  'evento_mudanca_administracao'
);

select pg_temp.depois_de(
  'Resolução: instituição de usufruto sobre quotas',
  'ac000001-0000-4000-8000-000000000010'::uuid,
  'Retirada dos cedentes: consequência da cessão total (Cláusula Oitava da 2ª AC da MMS Agro).'
);

select pg_temp.depois_de(
  'Resolução: mudança na administração',
  'ac000001-0000-4000-8000-000000000011'::uuid,
  'Desimpedimento de quem foi nomeado para administrar (Cláusula Décima Primeira da 2ª AC da MMS Agro).'
);
