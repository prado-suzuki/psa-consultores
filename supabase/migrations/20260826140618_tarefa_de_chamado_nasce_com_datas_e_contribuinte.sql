-- 20260826140618_tarefa_de_chamado_nasce_com_datas_e_contribuinte.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Sprint 12 . A tarefa que nasce de chamado delegado passa a vir com data de
-- inicio, com vencimento que acompanha o prazo do chamado e com contribuinte.
-- Arquivo completo, com a justificativa de cada decisao, no repositorio:
-- 20260826135038_tarefa_de_chamado_nasce_com_datas_e_contribuinte.sql

BEGIN;

create or replace function public.delegar_chamado_gera_tarefa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
  v_qtd     integer;
  v_nome    text;
  v_prio    public.fiscal_task_priority;
  v_contrib uuid;
begin
  if NEW.assigned_to is null then
    return null;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.assigned_to is not distinct from OLD.assigned_to then
      return null;
    end if;
  end if;

  if NEW.cliente_id is null then
    return null;
  end if;

  select q.id, q.total into v_project, v_qtd
    from (select p.id, count(*) over () as total
            from public.org_projects     p
            join public.produto_segmento ps
              on ps.id = p.produto_segmento_id
             and ps.is_canal_chamados
           where p.external_client_id = NEW.cliente_id
           order by p.created_at nulls last, p.id
           limit 1) q;

  if v_project is null then
    raise warning 'delegar_chamado_gera_tarefa: cliente % sem projeto de canal de chamados; chamado % delegado SEM tarefa',
      NEW.cliente_id, NEW.id;
    return null;
  end if;

  if v_qtd > 1 then
    raise warning 'delegar_chamado_gera_tarefa: cliente % tem % projetos de canal de chamados; usando o mais antigo (%)',
      NEW.cliente_id, v_qtd, v_project;
  end if;

  select btrim(p.first_name || ' ' || coalesce(p.last_name, ''))
    into v_nome
    from public.profiles p
   where p.id = NEW.assigned_to;

  v_prio := (case lower(coalesce(NEW.priority, ''))
               when 'baixa'   then 'low'
               when 'alta'    then 'high'
               when 'urgente' then 'urgent'
               else                'medium'
             end)::public.fiscal_task_priority;

  -- Contribuinte, primeira tentativa: o da OS que gerou o projeto de canal.
  select os.contribuinte_id
    into v_contrib
    from public.org_projects  p
    join public.ordem_servico os on os.id = p.ordem_servico_id
   where p.id = v_project;

  -- Segunda tentativa: o contribuinte UNICO do cliente. O HAVING e o que faz
  -- isto ser honesto: com dois ou mais o agregado nao devolve linha e v_contrib
  -- fica nulo. Um `select ... into` cru pegaria o primeiro em silencio, que e
  -- pior do que nulo. Nao filtra `ambiente`: cliente ja e por ambiente (ids
  -- diferentes em dev e prod), entao o cliente_id ja recorta.
  if v_contrib is null then
    select (array_agg(ct.id))[1]
      into v_contrib
      from public.contribuinte ct
     where ct.cliente_id = NEW.cliente_id
       and coalesce(ct.excluido, false) = false
    having count(*) = 1;
  end if;

  insert into public.org_tasks (project_id, ticket_id, client_id,
                                title, description,
                                assigned_to, assigned_to_name,
                                start_date, due_date, priority, status, category,
                                contribuinte_id, created_by)
  values (v_project, NEW.id, NEW.cliente_id,
          'Chamado: ' || NEW.title, NEW.description,
          NEW.assigned_to, v_nome,
          -- O dia da DELEGACAO, no fuso da casa. `current_date` cru seria UTC
          -- (o banco esta em UTC) e delegacao das 21h em diante viraria o dia
          -- seguinte. FUSO_DA_CASA e America/Cuiaba, como em
          -- src/lib/historicoNotificacoes.ts e na borda de notificacao.
          (now() at time zone 'America/Cuiaba')::date,
          NEW.deadline, v_prio,
          'todo'::public.fiscal_task_status,
          'task'::public.fiscal_task_category,
          v_contrib,
          auth.uid())
  on conflict (ticket_id) where ticket_id is not null
  do update set assigned_to      = excluded.assigned_to,
                assigned_to_name = excluded.assigned_to_name;
  -- Redelegar continua trocando SO a pessoa. Data de inicio nao se refaz: o
  -- trabalho comecou quando comecou. Contribuinte tambem nao, porque a essa
  -- altura alguem pode ter corrigido para outro estabelecimento.

  return null;
end $$;

comment on function public.delegar_chamado_gera_tarefa() is
  'Cria, ou reaponta, a tarefa do projeto de canal de chamados do cliente quando um chamado e delegado. Nasce com inicio no dia da delegacao, vencimento igual ao prazo do chamado e contribuinte da OS do projeto. Nunca bloqueia a delegacao.';

revoke all on function public.delegar_chamado_gera_tarefa() from public;

create or replace function public.propagar_prazo_chamado_para_tarefa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.deadline is not distinct from OLD.deadline then
    return null;
  end if;

  -- O bloco de excecao NAO e decoracao. trg_org_tasks_validate_reviewer roda em
  -- QUALQUER update de org_tasks e o terceiro IF dele nao olha TG_OP: tarefa em
  -- 'review' cujo revisor perdeu o papel ou o cluster levanta 23514. Sem este
  -- catch, isso derrubaria o UPDATE do chamado. Mesma doutrina da EDU-11:
  -- operacao de gestao nao pode ser bloqueada por causa da tarefa.
  begin
    update public.org_tasks t
       set due_date = NEW.deadline
     where t.ticket_id = NEW.id
       -- Nulo: nunca teve prazo, preenche. Igual ao prazo ANTIGO do chamado:
       -- ninguem mexeu a mao, acompanha. Qualquer outro valor: alguem digitou
       -- uma data na tarefa e ela nao se toca.
       and (t.due_date is null or t.due_date is not distinct from OLD.deadline);
  exception when others then
    raise warning 'propagar_prazo_chamado_para_tarefa: chamado % com prazo % nao propagou para a tarefa (%)',
      NEW.id, NEW.deadline, sqlerrm;
  end;

  return null;
end $$;

comment on function public.propagar_prazo_chamado_para_tarefa() is
  'Leva o prazo do chamado para o vencimento da tarefa gerada, quando o prazo e definido ou trocado depois da atribuicao. Nao sobrescreve vencimento ajustado a mao.';

revoke all on function public.propagar_prazo_chamado_para_tarefa() from public;

drop trigger if exists trg_tickets_propaga_prazo on public.tickets;
create trigger trg_tickets_propaga_prazo
  after update of deadline on public.tickets
  for each row
  execute function public.propagar_prazo_chamado_para_tarefa();

create or replace function public.org_tasks_team_member_status_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status IS DISTINCT FROM 'done'::public.fiscal_task_status
     AND NEW.status = 'done'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor nao pode concluir a tarefa; devolva para ajustes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status = 'review'::public.fiscal_task_status THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN (
      'review'::public.fiscal_task_status,
      'em_ajuste'::public.fiscal_task_status
    ) THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF public.has_role_or_higher(v_user_id, 'sublider'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id' - 'contribuinte_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id' - 'contribuinte_id') THEN
    RAISE EXCEPTION 'Tarefa delegada: team_member so pode alterar status, horas, revisor e contribuinte (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

revoke all on function public.org_tasks_team_member_status_only() from public;

COMMIT;
