-- DOAÇÃO E INSTITUIÇÃO DE USUFRUTO SEM O NOME REPETIDO NA QUALIFICAÇÃO
--
-- `pessoa.qualificacao` já abre com o nome em negrito e caixa alta. Os blocos
-- escreviam o nome e emendavam a qualificação, e a peça saía
-- "LUCAS NOGUEIRA, LUCAS NOGUEIRA, brasileiro". Fica só a qualificação.
--
-- Só DADOS em `tmpl_bloco_versao`: nova versão vigente, a anterior preservada
-- para os documentos selados. Idempotente: a troca só acontece se o trecho
-- antigo ainda estiver na versão vigente; bloco ausente no banco é ignorado.

create or replace function pg_temp.trocar_no_bloco(
  p_bloco uuid, p_de text, p_para text, p_changelog text
) returns void language plpgsql as $fn$
declare
  v_conteudo text;
  v_proxima integer;
begin
  select conteudo into v_conteudo
    from public.tmpl_bloco_versao
   where bloco_id = p_bloco and atual;
  if v_conteudo is null or position(p_de in v_conteudo) = 0 then
    return;
  end if;

  select coalesce(max(numero_versao), 0) + 1 into v_proxima
    from public.tmpl_bloco_versao
   where bloco_id = p_bloco;

  update public.tmpl_bloco_versao
     set atual = false, updated_at = now()
   where bloco_id = p_bloco and atual;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (p_bloco, v_proxima, true, replace(v_conteudo, p_de, p_para), p_changelog);
end $fn$;

select pg_temp.trocar_no_bloco(
  '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid,
  '*{{ doador.nomeMaiusculo }}*, {{ doador.qualificacao }}',
  '{{ doador.qualificacao }}',
  'O nome do doador sai uma vez só: a qualificação já o traz.'
);

select pg_temp.trocar_no_bloco(
  '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid,
  '*{{ donatario.nomeMaiusculo }}*, {{ donatario.qualificacao }}',
  '{{ donatario.qualificacao }}',
  'O nome do donatário sai uma vez só: a qualificação já o traz.'
);

select pg_temp.trocar_no_bloco(
  'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid,
  '*{{ nuProprietario.nomeMaiusculo }}*, {{ nuProprietario.qualificacao }}',
  '{{ nuProprietario.qualificacao }}',
  'O nome de quem institui o usufruto sai uma vez só: a qualificação já o traz.'
);
