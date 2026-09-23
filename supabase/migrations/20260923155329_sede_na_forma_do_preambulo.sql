-- A CLÁUSULA DE SEDE ESCREVE O ENDEREÇO COMO O PREÂMBULO
--
-- As três redações da sede (constituição, consolidação e a resolução de
-- mudança de endereço, que reproduz a cláusula) montavam o endereço com
-- logradouro e número apenas, e a UF em sigla: "na Rua X, n.º 2100, no
-- município de Cuiabá, no Estado de MT". Sumiam complemento e bairro, e o
-- preâmbulo da mesma peça dizia "Estado de Mato Grosso". Passam a citar
-- `sociedade.sedeComPreposicao`, a mesma prosa do preâmbulo.
--
-- Só DADOS em `tmpl_bloco_versao`: nova versão vigente, a anterior preservada
-- para os documentos selados. Idempotente: a troca só acontece se o trecho
-- antigo ainda estiver na versão vigente; bloco ausente no banco é ignorado.
-- Cada bloco recebe as duas grafias do trecho antigo (com e sem espaço antes
-- de `sociedade.sedeMunicipio`); só a que existir é trocada.

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
  b.id,
  'na {{ sociedade.sedeEndereco }}, no município de {{sociedade.sedeMunicipio }}, no Estado de {{ sociedade.sedeUf }}, CEP {{ sociedade.sedeCep }}',
  '{{ sociedade.sedeComPreposicao }}',
  'A sede sai com complemento, bairro e o Estado por extenso, como no preâmbulo.'
)
  from unnest(array[
    'e8b3a472-6965-40e1-a548-90968566d367'::uuid,
    'fc000001-0000-4000-8000-000000000002'::uuid,
    'ac000001-0000-4000-8000-000000000001'::uuid
  ]) as b(id);

select pg_temp.trocar_no_bloco(
  b.id,
  'na {{ sociedade.sedeEndereco }}, no município de {{ sociedade.sedeMunicipio }}, no Estado de {{ sociedade.sedeUf }}, CEP {{ sociedade.sedeCep }}',
  '{{ sociedade.sedeComPreposicao }}',
  'A sede sai com complemento, bairro e o Estado por extenso, como no preâmbulo.'
)
  from unnest(array[
    'e8b3a472-6965-40e1-a548-90968566d367'::uuid,
    'fc000001-0000-4000-8000-000000000002'::uuid,
    'ac000001-0000-4000-8000-000000000001'::uuid
  ]) as b(id);
