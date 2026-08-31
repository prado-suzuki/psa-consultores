-- 20260818195829_canal_chamados_marca_o_produto.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260818195107_canal_chamados_marca_o_produto.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Marca o produto que e o Canal de Chamados (espelha
-- supabase/migrations/20260818195107_canal_chamados_marca_o_produto.sql).
-- Resolve por NOME porque os codigos divergem entre os bancos: producao usa
-- '01-CHA' e o dev compartilhado usa 'CHA'.

-- Passo 0 · trava de entrada
do $$
declare
  v_alvo    integer;
  v_marcado text;
begin
  select count(*) into v_alvo
    from public.produto_segmento
   where nome = 'Canal de Chamados';

  if v_alvo <> 1 then
    raise exception
      'Abortada: esperava 1 produto chamado "Canal de Chamados", encontrei %.', v_alvo;
  end if;

  select string_agg(codigo, ', ') into v_marcado
    from public.produto_segmento
   where is_canal_chamados
     and nome <> 'Canal de Chamados';

  if v_marcado is not null then
    raise exception
      'Abortada: outro produto ja esta marcado como canal de chamados (%). Decidir a mao qual fica.',
      v_marcado;
  end if;

  raise notice 'entrada ok: 1 produto alvo, nenhum outro marcado';
end $$;

-- Passo 1 · a marca
update public.produto_segmento
   set is_canal_chamados = true
 where nome = 'Canal de Chamados'
   and not is_canal_chamados;

-- Passo 2 · trava de saida
do $$
declare
  v_total  integer;
  v_codigo text;
begin
  select count(*), string_agg(codigo, ', ')
    into v_total, v_codigo
    from public.produto_segmento
   where is_canal_chamados;

  if v_total <> 1 then
    raise exception 'Abortada: esperava exatamente 1 produto marcado, tenho % (%).',
      v_total, coalesce(v_codigo, 'nenhum');
  end if;

  if not exists (select 1 from public.produto_segmento
                  where is_canal_chamados and nome = 'Canal de Chamados') then
    raise exception 'Abortada: o produto marcado (%) nao e o Canal de Chamados.', v_codigo;
  end if;

  raise notice 'saida ok: % marcado como canal de chamados', v_codigo;
end $$;
