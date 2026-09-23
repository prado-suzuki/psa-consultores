-- O PARÁGRAFO DE INTEGRALIZAÇÃO CONCORDA COM O GÊNERO DE QUEM INTEGRALIZA
--
-- Os dois blocos escreviam "O sócio" e "pelo sócio" fixos, e a sócia saía
-- "O sócio Marina Salgado subscreve". Passam a citar `socio.oSocio` e
-- `socio.peloSocio`, derivados do gênero da pessoa (PJ concorda no feminino).
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
  '92e8c1b0-0c1c-434d-9a79-7ae27ba30f22'::uuid,
  'O sócio *{{ socio.nome }}*',
  '{{ socio.oSocio }} *{{ socio.nome }}*',
  'O sujeito do parágrafo concorda com o gênero de quem integraliza.'
);

select pg_temp.trocar_no_bloco(
  'f364d2cd-fa04-4c84-8bd1-ff1de0306aba'::uuid,
  'pelo sócio {{ socio.nome }}',
  '{{ socio.peloSocio }} {{ socio.nome }}',
  'O agente da integralização concorda com o gênero de quem integraliza.'
);
