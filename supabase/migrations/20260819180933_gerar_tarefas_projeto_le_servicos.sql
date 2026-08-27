-- 20260819180933_gerar_tarefas_projeto_le_servicos.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260819180810_gerar_tarefas_projeto_le_servicos.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- gerar_tarefas_projeto passa a nascer dos SERVICOS do produto (espelha
-- supabase/migrations/20260819180810_gerar_tarefas_projeto_le_servicos.sql).
-- Fonte antiga: produto_tarefa_padrao (abandonada, 0 linhas).
-- Fonte nova: produto_servico + servicos_prestados.
-- Assinatura NAO muda, entao o front que ja chama a RPC continua valendo.

create or replace function public.gerar_tarefas_projeto(_project_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_produto uuid;
  v_inicio  date;
  v_resp    uuid;
  v_lider   uuid;
  v_criados integer;
begin
  if not public.can_view_org_project(auth.uid(), _project_id) then
    raise exception 'projeto fora do seu escopo' using errcode = '42501';
  end if;

  select p.produto_segmento_id, p.start_date, p.responsible_id, p.leader_id
    into v_produto, v_inicio, v_resp, v_lider
    from public.org_projects p
   where p.id = _project_id;

  if v_produto is null then return 0; end if;

  with novos as (
    insert into public.org_tasks (project_id, servico_id, title,
                                  assigned_to, assigned_to_name, due_date,
                                  priority, status, category)
    select _project_id,
           sp.id,
           sp.nome,
           alvo.user_id,
           alvo.nome,
           v_inicio,
           'medium'::public.fiscal_task_priority,
           'todo'::public.fiscal_task_status,
           'task'::public.fiscal_task_category
      from public.produto_servico pv
      join public.servicos_prestados sp on sp.id = pv.servico_prestado_id
      left join lateral (
        select u.id as user_id,
               btrim(u.first_name || ' ' || coalesce(u.last_name, '')) as nome
          from public.profiles u
         where u.id = coalesce(v_resp, v_lider)
      ) alvo on true
     where pv.produto_segmento_id = v_produto
       and not exists (
         select 1 from public.org_tasks o
          where o.project_id      = _project_id
            and o.servico_id      = sp.id
            and o.parent_task_id is null
       )
     order by sp.nome
    returning 1)
  select count(*) into v_criados from novos;

  return v_criados;
end;
$function$;

comment on function public.gerar_tarefas_projeto(uuid) is
  'Cria uma tarefa-pai por servico vinculado ao produto do projeto. Fonte: produto_servico + servicos_prestados (a produto_tarefa_padrao foi abandonada em 18/08/2026). Idempotente pelo guarda de tarefa-pai por (projeto, servico). Responsavel = responsavel do projeto, caindo para o lider; prazo = data de inicio do projeto; horas e descricao nulas, porque o catalogo de servico nao tem esses campos.';
