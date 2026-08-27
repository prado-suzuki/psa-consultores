-- 20260824195419_dev_cenario4_solicitacao_vencida.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

do $$
declare
  v_cliente   uuid;
  v_os        uuid;
  v_solic     uuid;
  v_autor     uuid;
  c_marca     text := 'fixture GES-04 · cenario 4 VENCER';
  c_prod_soc  uuid := 'e74069b3-cbe2-4bdd-b69a-7bef00043dda';
  c_prod_suc  uuid := '57316b51-01f8-4d69-a7de-50d625243d68';
begin
  select c.id into v_cliente
    from public.cliente c
   where c.ambiente = 'dev'
     and c.nome ilike '%Iglu Tropical%'
   limit 1;

  if v_cliente is null then
    raise notice 'cenario 4: cliente de teste ausente -- nada a fazer';
    return;
  end if;

  select os.id into v_os
    from public.ordem_servico os
   where os.id_cliente = v_cliente
     and coalesce(os.excluido, false) = false
   order by os.numero_os
   limit 1;

  if v_os is null then
    raise notice 'cenario 4: cliente sem OS -- nada a fazer';
    return;
  end if;

  delete from public.os_produtos_contratados where ordem_servico_id = v_os;
  insert into public.os_produtos_contratados (ordem_servico_id, produto_segmento_id)
  values (v_os, c_prod_soc), (v_os, c_prod_suc)
  on conflict do nothing;

  update public.representante
     set nome     = 'Alexandre Silva',
         email    = 'alexandre.silva@psaconsultores.com.br',
         telefone = '65993264754'
   where id_cliente = v_cliente
     and coalesce(excluido, false) = false;

  update public.cliente
     set nome = '[TESTE 4 · VENCER] Iglu Tropical Climatização Contraditória Ltda'
   where id = v_cliente
     and nome not like '[TESTE 4%';

  select id into v_solic
    from public.solicitacao
   where cliente_id = v_cliente and observacao = c_marca
   limit 1;

  if v_solic is null then
    select p.id into v_autor
      from public.profiles p
     where p.email = 'alexandre.silva@psaconsultores.com.br'
     limit 1;

    insert into public.solicitacao (cliente_id, ordem_servico_id, status, enviada_em,
                                    observacao, created_by, updated_by)
    values (v_cliente, v_os, 'enviada', now() - interval '40 days',
            c_marca, v_autor, v_autor)
    returning id into v_solic;

    insert into public.solicitacao_item
      (solicitacao_id, granularidade, grupo, documento, status, ordem, created_by, updated_by)
    values
      (v_solic, 'pessoa_pf', 'pf',           'Certidão de casamento', 'ativo', 1, v_autor, v_autor),
      (v_solic, 'cliente',   'pj',           'Contrato social',       'ativo', 2, v_autor, v_autor),
      (v_solic, 'cliente',   'bens_imoveis', 'Matrícula atualizada',  'ativo', 3, v_autor, v_autor);

    raise notice 'cenario 4: solicitacao % criada', v_solic;
  else
    raise notice 'cenario 4: solicitacao % ja existia', v_solic;
  end if;
end $$;
