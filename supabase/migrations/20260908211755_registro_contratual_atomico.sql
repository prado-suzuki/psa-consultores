-- Nao aplicar sem integrar o contrato de docs/osg/registro-contratual-atomico.md.
-- Sem RPC/coluna publica nova. Upload e verificacao do objeto GCS sao externos.
begin;

create or replace function public.documento_registro_atomico()
returns trigger
language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare
  r jsonb;
  anterior jsonb;
  completando boolean := false;
  k text;
  ids uuid[];
  m public.movimentacao_quotas;
  b public.bem;
  a public.documento_arquivo;
  base public.documento_gerado;
  ambiente_cliente text;
  n integer;
  evidencia jsonb;
begin
  if tg_op = 'DELETE' then
    if old.status = 'registrado' then
      raise exception 'Documento registrado e imutavel' using errcode = '23514';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.status = 'registrado' then
      raise exception 'Registro exige transicao de documento validado' using errcode = '23514';
    end if;
    return new;
  end if;

  if old.status = 'registrado' then
    if (to_jsonb(new) - array['updated_at', 'updated_by'])
       is distinct from (to_jsonb(old) - array['updated_at', 'updated_by']) then
      -- COMPLETAR o marco da junta e a unica escrita que a peca registrada
      -- aceita. O motivo e o calendario da junta: o registro sai num dia, e o
      -- numero do arquivamento e o PDF chancelado em outro. O registro exige o
      -- minimo (protocolo e data do registro); o resto entra depois, por este
      -- caminho, com auditoria.
      -- Tudo o mais continua imutavel: status, snapshots, linhagem, exclusao.
      if (to_jsonb(new) - array['snapshot_dados', 'updated_at', 'updated_by'])
         is distinct from (to_jsonb(old) - array['snapshot_dados', 'updated_at', 'updated_by'])
         or (new.snapshot_dados - 'registroContratual')
            is distinct from (old.snapshot_dados - 'registroContratual') then
        raise exception 'Documento registrado e imutavel' using errcode = '23514';
      end if;
      completando := true;
    else
      return null; -- retry identico nao escreve nem duplica auditoria
    end if;
  elsif new.status <> 'registrado' then
    return new;
  end if;

  if auth.uid() is null
     or public.has_role_or_higher(auth.uid(), 'team_member') is not true
     or public.cliente_visivel_para(old.cliente_id) is not true then
    raise exception 'Sem acesso ao registro deste cliente' using errcode = '42501';
  end if;
  -- As consultas apos os locks precisam enxergar o commit concorrente.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Registro exige READ COMMITTED' using errcode = '25001';
  end if;
  -- O que a TRANSICAO exige da peca. Completar metadata nao revalida nada disso:
  -- o snapshot conferido e o mesmo de quando o ato foi registrado, e ele nao muda.
  if not completando then
  if old.status <> 'rascunho' or old.papel not in ('constitutivo', 'alterador')
     or old.papel is null or old.pj_pessoa_id is null
     or old.documento_raiz_id is null or old.snapshot_validado_em is null
     or old.acompanha_documento_id is not null then
    raise exception 'Documento societario validado obrigatorio' using errcode = '23514';
  end if;
  if (to_jsonb(new) - array['status', 'snapshot_dados', 'updated_at', 'updated_by'])
     is distinct from (to_jsonb(old) - array['status', 'snapshot_dados', 'updated_at', 'updated_by'])
     or (new.snapshot_dados - 'registroContratual') is distinct from (old.snapshot_dados - 'registroContratual') then
    raise exception 'Registro nao pode reescrever o snapshot ou a linhagem' using errcode = '23514';
  end if;
  if jsonb_typeof(old.snapshot_dados) is distinct from 'object'
     or jsonb_typeof(old.snapshot_flags) is distinct from 'array'
     or jsonb_typeof(old.snapshot_versoes_blocos) is distinct from 'object'
     or jsonb_typeof(old.snapshot_versoes_blocos->'blocos') is distinct from 'array'
     or jsonb_typeof(old.snapshot_versoes_blocos->'familias') is distinct from 'object'
     or jsonb_typeof(old.snapshot_versoes_blocos->'contextoRender') is distinct from 'object'
     or jsonb_typeof(old.snapshot_dados->'movimentosFormalizados') is distinct from 'array'
     or old.snapshot_dados->>'empresaId' is distinct from old.pj_pessoa_id::text then
    raise exception 'Snapshot completo, contextoRender e escopo congelado obrigatorios' using errcode = '23514';
  end if;
  if jsonb_array_length(old.snapshot_versoes_blocos->'blocos') = 0
     or old.snapshot_versoes_blocos->'contextoRender' = '{}'::jsonb then
    raise exception 'Template/contexto vazio' using errcode = '23514';
  end if;
  for k in select unnest(array['selecao', 'registroPorBinding', 'valoresLivres', 'itensPorLista']) loop
    if jsonb_typeof(old.snapshot_dados->k) is distinct from 'object' then
      raise exception 'Snapshot incompleto: %', k using errcode = '23514';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(old.snapshot_versoes_blocos->'blocos') x
             where jsonb_typeof(x) <> 'object' or nullif(btrim(x->>'id'), '') is null
                or jsonb_typeof(x->'conteudo') is distinct from 'string') then
    raise exception 'Blocos incompletos' using errcode = '23514';
  end if;
  end if;

  r := new.snapshot_dados->'registroContratual';
  -- v1 tem SEIS campos alem de `versao`. A data do instrumento e a do protocolo
  -- sairam em 09/09/2026: nenhum consumidor as lia (nem a linhagem das ACs, que
  -- e de coluna: substitui_documento_id/documento_raiz_id/papel/status), e cada
  -- uma era um campo a mais para o consultor conferir na guia da junta. Linha
  -- gravada antes disso pode carrega-las; nada aqui revalida marco antigo, so o
  -- que esta sendo escrito.
  if jsonb_typeof(r) is distinct from 'object' or r->'versao' is distinct from '1'::jsonb
     or (r - array['versao', 'arquivoId', 'protocolo', 'numeroArquivamento',
                   'dataRegistro', 'juntaUf', 'junta', 'confirmacaoId']) <> '{}'::jsonb then
    raise exception 'registroContratual v1 invalido' using errcode = '23514';
  end if;
  -- O MINIMO que faz a peca dizer qual registro a tornou oponivel: o protocolo e
  -- a data do registro. `confirmacaoId` entra por outro motivo, tecnico: e ele
  -- que faz o retry ser reconhecido como o mesmo gesto, e nao um segundo
  -- registro. O resto do marco (arquivamento, junta, UF, PDF) e OPCIONAL: a
  -- junta devolve cada coisa num dia, e o que falta se completa depois.
  for k in select unnest(array['confirmacaoId', 'protocolo', 'dataRegistro']) loop
    if jsonb_typeof(r->k) is distinct from 'string' or nullif(btrim(r->>k), '') is null then
      raise exception 'Metadata obrigatoria: %', k using errcode = '23514';
    end if;
  end loop;
  perform (r->>'confirmacaoId')::uuid;
  -- Chave presente com valor vazio nao e "ainda nao sei": e campo em branco
  -- gravado como se fosse resposta. Quem nao tem o dado OMITE a chave.
  for k in select unnest(array['arquivoId', 'numeroArquivamento', 'juntaUf', 'junta']) loop
    if r ? k and (jsonb_typeof(r->k) is distinct from 'string' or nullif(btrim(r->>k), '') is null) then
      raise exception 'Campo do registro em branco: %', k using errcode = '23514';
    end if;
  end loop;
  if r ? 'arquivoId' then perform (r->>'arquivoId')::uuid; end if;
  if r->>'dataRegistro' !~ '^\d{4}-\d{2}-\d{2}$'
     or ((r->>'dataRegistro')::date)::text <> r->>'dataRegistro' then
    raise exception 'Data invalida: dataRegistro' using errcode = '23514';
  end if;
  if (r->>'dataRegistro')::date > current_date
     or (r ? 'juntaUf'
         and r->>'juntaUf' <> all(array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                                        'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])) then
    raise exception 'Data ou UF invalidas' using errcode = '23514';
  end if;
  if completando then
    anterior := old.snapshot_dados->'registroContratual';
    -- Completar nao e re-registrar: o gesto que produziu efeito continua sendo
    -- aquele, e e o `confirmacaoId` dele que a peca carrega.
    if r->>'confirmacaoId' is distinct from anterior->>'confirmacaoId' then
      raise exception 'Confirmacao do registro e imutavel' using errcode = '23514';
    end if;
    -- O PDF chancelado pode CHEGAR depois; trocar o que ja foi eleito, nao. Era
    -- o que deixaria a peca apontando para outro arquivo que ninguem conferiu,
    -- e orfao o que a trigger do arquivo protege.
    if anterior ? 'arquivoId' and r->>'arquivoId' is distinct from anterior->>'arquivoId' then
      raise exception 'Arquivo registrado e imutavel' using errcode = '23514';
    end if;
  end if;

  if not completando then
  -- Serializa registros da mesma sociedade, inclusive constitutivos concorrentes.
  perform 1 from public.pessoa
   where id = old.pj_pessoa_id and cliente_id = old.cliente_id and tipo_pessoa = 'PJ'
   for update;
  if not found then raise exception 'PJ fora do cliente/acesso' using errcode = '42501'; end if;
  perform 1 from public.tmpl_documento where id = old.documento_template_id and escopo = 'sociedade' for share;
  if not found then raise exception 'Modelo societario obrigatorio' using errcode = '23514'; end if;
  perform 1 from public.documento_gerado
   where id = old.documento_raiz_id and cliente_id = old.cliente_id
     and pj_pessoa_id = old.pj_pessoa_id and papel = old.papel
     and documento_template_id = old.documento_template_id
     and substitui_documento_id is not distinct from old.substitui_documento_id for update;
  if not found then raise exception 'Linhagem inconsistente' using errcode = '23514'; end if;
  if old.papel = 'alterador' then
    select * into base from public.documento_gerado where id = old.substitui_documento_id for update;
    if not found or base.status <> 'registrado' or base.cliente_id <> old.cliente_id
       or base.pj_pessoa_id is distinct from old.pj_pessoa_id
       or base.documento_raiz_id = old.documento_raiz_id then
      raise exception 'Base registrada da mesma sociedade obrigatoria' using errcode = '23514';
    end if;
    if exists (select 1 from public.documento_gerado d
                where d.substitui_documento_id = base.id and d.status = 'registrado'
                  and d.id <> old.id and d.documento_raiz_id is distinct from old.documento_raiz_id) then
      raise exception 'Base ja possui sucessor registrado' using errcode = '23505';
    end if;
  elsif old.substitui_documento_id is not null then
    raise exception 'Constitutivo nao substitui documento' using errcode = '23514';
  end if;
  if exists (select 1 from public.documento_gerado d where d.status = 'registrado'
              and d.id <> old.id and d.documento_raiz_id = old.documento_raiz_id) then
    raise exception 'Linhagem ja registrada' using errcode = '23505';
  end if;
  end if;

  select ambiente into ambiente_cliente from public.cliente
   where id = old.cliente_id and excluido = false;
  if not found then raise exception 'Cliente indisponivel' using errcode = '42501'; end if;

  -- O arquivo e conferido quando e ELEITO: no registro que ja o traz, ou no
  -- momento em que a metadata o acrescenta. Depois disso ele nao troca (acima).
  if r ? 'arquivoId' and not (completando and anterior ? 'arquivoId') then
    select * into a from public.documento_arquivo where id = (r->>'arquivoId')::uuid for update;
    if not found or a.cliente_id <> old.cliente_id or a.ambiente <> ambiente_cliente or a.excluido
       or a.status <> 'ativo' or a.revisao <> 'aprovado' or a.categoria <> 'societarios'
       or a.pessoa_id is distinct from old.pj_pessoa_id or a.documento_gerado_id is distinct from old.id
       or a.gcs_uri is null or a.gcs_uri !~ '^gs://[^/[:space:]]+/[^[:space:]]+$'
       or a.checksum is null or a.checksum !~ '^[A-Za-z0-9+/]{6}==$' or a.tamanho is null or a.tamanho <= 0
       or nullif(btrim(a.mime), '') is null or nullif(btrim(a.nome_original), '') is null
       or a.revisao_por is null or a.revisao_em is null then
      raise exception 'Arquivo registrado ausente, fora do escopo ou nao aprovado' using errcode = '23514';
    end if;
  end if;

  -- Completar metadata para aqui: nao ha ledger a carimbar nem bem a
  -- integralizar (isso aconteceu no registro), so a trilha do que mudou.
  if completando then
    new.snapshot_dados := (old.snapshot_dados - 'registroContratual')
      || jsonb_build_object('registroContratual', r);
    new.updated_by := auth.uid();
    insert into public.audit_logs (area, entity_type, entity_id, entity_name, action, changed_fields, performed_by)
    values ('osg', 'documento_gerado', old.id, old.id::text, 'updated',
      jsonb_build_object('registroContratual', jsonb_build_object('old', anterior, 'new', r)), auth.uid());
    return new;
  end if;

  if exists (select 1 from jsonb_array_elements(old.snapshot_dados->'movimentosFormalizados') x
              where jsonb_typeof(x) <> 'string') then
    raise exception 'Escopo deve conter UUIDs string' using errcode = '23514';
  end if;
  select coalesce(array_agg(value::uuid order by value::uuid), '{}'::uuid[]) into ids
    from jsonb_array_elements_text(old.snapshot_dados->'movimentosFormalizados');
  if cardinality(ids) <> (select count(distinct id) from unnest(ids) id) then
    raise exception 'Movimentos duplicados' using errcode = '23514';
  end if;
  if old.snapshot_dados ? 'movimentosEvidencia' then
    evidencia := old.snapshot_dados->'movimentosEvidencia';
    if jsonb_typeof(evidencia) is distinct from 'object' then
      raise exception 'Evidencia deve ser objeto por UUID' using errcode = '23514';
    end if;
    if (select count(*) from jsonb_object_keys(evidencia)) <> cardinality(ids) then
      raise exception 'Evidencia deve cobrir exatamente o escopo' using errcode = '23514';
    end if;
  end if;
  n := 0;
  for m in select * from public.movimentacao_quotas where id = any(ids) order by id for update loop
    n := n + 1;
    if m.cliente_id <> old.cliente_id or m.empresa_pessoa_id <> old.pj_pessoa_id
       or m.documento_gerado_id is not null then
      raise exception 'Movimento fora do escopo ou ja formalizado: %', m.id using errcode = '23514';
    end if;
    perform 1 from public.pessoa where id = m.origem_pessoa_id and cliente_id = old.cliente_id for share;
    if m.origem_pessoa_id is not null and not found then
      raise exception 'Origem fora do cliente' using errcode = '23514';
    end if;
    perform 1 from public.pessoa where id = m.destino_pessoa_id and cliente_id = old.cliente_id for share;
    if m.destino_pessoa_id is not null and not found then
      raise exception 'Destino fora do cliente' using errcode = '23514';
    end if;
    if old.snapshot_dados ? 'movimentosEvidencia' then
      evidencia := old.snapshot_dados->'movimentosEvidencia';
      if jsonb_typeof(evidencia) is distinct from 'object'
         or evidencia->m.id::text is distinct from
            (to_jsonb(m) - array['created_at','created_by','updated_at','updated_by','documento_gerado_id']) then
        raise exception 'Movimento divergiu da evidencia validada: %', m.id using errcode = '23514';
      end if;
    end if;
  end loop;
  if n <> cardinality(ids) then raise exception 'Escopo contem movimentos ausentes/invisiveis' using errcode = '42501'; end if;

  -- Trava e confere TODOS os bens; muda somente os dois status aprovados do dominio.
  n := 0;
  for b in select bem_linha.* from public.bem bem_linha
            where bem_linha.id in (select bem_id from public.movimentacao_quotas where id = any(ids))
            order by bem_linha.id for update loop
    n := n + 1;
    if b.cliente_id <> old.cliente_id or b.empresa_destino_pessoa_id is distinct from old.pj_pessoa_id then
      raise exception 'Bem fora do cliente/PJ' using errcode = '23514';
    end if;
    if b.status_integralizacao in ('Aprovado', 'Aprovado para 2ª Instancia') then
      update public.bem set status_integralizacao = 'Integralizado', updated_by = auth.uid() where id = b.id;
      if not found then raise exception 'RLS recusou integralizacao' using errcode = '42501'; end if;
      insert into public.audit_logs (area, entity_type, entity_id, entity_name, action, changed_fields, performed_by)
      values ('osg', 'bem', b.id, b.denominacao, 'updated',
        jsonb_build_object('status_integralizacao', jsonb_build_object('old', b.status_integralizacao, 'new', 'Integralizado')),
        auth.uid());
    end if;
  end loop;
  if n <> (select count(distinct bem_id) from public.movimentacao_quotas where id = any(ids)) then
    raise exception 'Bem ausente/invisivel' using errcode = '42501';
  end if;
  for m in select * from public.movimentacao_quotas where id = any(ids) order by id loop
    update public.movimentacao_quotas set documento_gerado_id = old.id, updated_by = auth.uid() where id = m.id;
    if not found then raise exception 'RLS recusou formalizacao' using errcode = '42501'; end if;
    insert into public.audit_logs (area, entity_type, entity_id, entity_name, action, changed_fields, performed_by)
    values ('osg', 'movimentacao_quotas', m.id, m.id::text, 'updated',
      jsonb_build_object('documento_gerado_id', jsonb_build_object('old', null, 'new', old.id)), auth.uid());
  end loop;
  new.snapshot_dados := (old.snapshot_dados - 'registroContratual') || jsonb_build_object('registroContratual', r);
  new.updated_by := auth.uid();
  insert into public.audit_logs (area, entity_type, entity_id, entity_name, action, changed_fields, performed_by)
  values ('osg', 'documento_gerado', old.id, old.id::text, 'updated',
    jsonb_build_object('status', jsonb_build_object('old', old.status, 'new', 'registrado'),
      'registroContratual', jsonb_build_object('old', old.snapshot_dados->'registroContratual', 'new', r)), auth.uid());
  return new;
end $$;

-- Nao usa GUC mutavel nem pg_trigger_depth como autorizacao. A constraint adiada
-- verifica o estado final: o BEFORE da peca ainda nao publicou NEW na tabela.
create or replace function public.movimento_registro_confere()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.documento_gerado_id is not distinct from old.documento_gerado_id then
    return null;
  end if;
  if new.documento_gerado_id is not null then
    if not exists (select 1 from public.documento_gerado d
                    where d.id = new.documento_gerado_id and d.status = 'registrado'
                      and d.cliente_id = new.cliente_id and d.pj_pessoa_id = new.empresa_pessoa_id
                      and d.snapshot_dados->'registroContratual'->'versao' = '1'::jsonb
                      and d.snapshot_dados->'movimentosFormalizados' ? new.id::text) then
      raise exception 'Formalizacao exige registro atomico e escopo congelado' using errcode = '23514';
    end if;
  end if;
  return null;
end $$;

create or replace function public.movimento_formalizado_imutavel()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Inclui carimbos legados: nao apaga nem reatribui historia ja formalizada.
  if old.documento_gerado_id is not null then
    if tg_op = 'DELETE' then raise exception 'Movimento formalizado e imutavel' using errcode = '23514'; end if;
    if (to_jsonb(new) - array['updated_at','updated_by']) is distinct from
       (to_jsonb(old) - array['updated_at','updated_by']) then
      raise exception 'Movimento formalizado e imutavel' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.arquivo_registrado_imutavel()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.documento_gerado_id is not null then
    if current_setting('transaction_isolation') <> 'read committed' then
      raise exception 'Arquivo vinculado exige READ COMMITTED' using errcode = '25001';
    end if;
    perform 1 from public.documento_gerado d where d.id = old.documento_gerado_id
      and d.status = 'registrado' and d.snapshot_dados->'registroContratual'->>'arquivoId' = old.id::text for share;
    if found then
      if tg_op = 'DELETE' then raise exception 'Arquivo registrado e imutavel' using errcode = '23514'; end if;
      if (to_jsonb(new) - array['updated_at','updated_by']) is distinct from
         (to_jsonb(old) - array['updated_at','updated_by']) then
        raise exception 'Arquivo registrado e imutavel' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

revoke all on function public.documento_registro_atomico() from public, anon, authenticated;
revoke all on function public.movimento_registro_confere() from public, anon, authenticated;
revoke all on function public.movimento_formalizado_imutavel() from public, anon, authenticated;
revoke all on function public.arquivo_registrado_imutavel() from public, anon, authenticated;

drop trigger if exists trg_documento_registro_atomico on public.documento_gerado;
create trigger trg_documento_registro_atomico before insert or update or delete on public.documento_gerado
for each row execute function public.documento_registro_atomico();
drop trigger if exists trg_movimento_registro_confere on public.movimentacao_quotas;
create constraint trigger trg_movimento_registro_confere after insert or update on public.movimentacao_quotas
deferrable initially deferred for each row execute function public.movimento_registro_confere();
drop trigger if exists trg_movimento_formalizado_imutavel on public.movimentacao_quotas;
create trigger trg_movimento_formalizado_imutavel before update or delete on public.movimentacao_quotas
for each row execute function public.movimento_formalizado_imutavel();
drop trigger if exists trg_arquivo_registrado_imutavel on public.documento_arquivo;
create trigger trg_arquivo_registrado_imutavel before update or delete on public.documento_arquivo
for each row execute function public.arquivo_registrado_imutavel();

commit;
