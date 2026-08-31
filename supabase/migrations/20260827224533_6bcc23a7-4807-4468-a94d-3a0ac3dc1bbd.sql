CREATE OR REPLACE FUNCTION public.notificar_tarefa_atribuida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  begin
    perform public.criar_notificacao(
      NEW.assigned_to, 'tarefa_atribuida',
      'Você é o responsável: ' || NEW.title,
      'org_task', NEW.id,
      null,
      null,
      'tarefa_atribuida:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_atribuida: %', sqlerrm;
  end;
  return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.notificar_tarefa_em_revisao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_lider uuid;
begin
  begin
    select p.leader_id into v_lider
      from public.org_projects p where p.id = NEW.project_id;

    if v_lider is null then return NEW; end if;

    if NEW.reviewer_id is not null and NEW.reviewer_id = v_lider then
      return NEW;
    end if;

    perform public.criar_notificacao(
      v_lider, 'tarefa_em_revisao',
      'Tarefa em revisão: ' || NEW.title,
      'org_task', NEW.id,
      null,
      null,
      'tarefa_em_revisao:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_em_revisao: %', sqlerrm;
  end;
  return NEW;
end $function$;