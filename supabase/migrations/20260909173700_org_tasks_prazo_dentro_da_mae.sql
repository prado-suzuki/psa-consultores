-- Regra de prazo entre tarefa-mae e subtarefa: a filha nao vence depois da mae.
--
-- POR QUE NO BANCO, se o front ja recusa. O front cobre os dois caminhos de
-- tela (o calendario da linha da Lista e o do modal), e so eles. Importacao,
-- SQL direto e qualquer escrita fora da tela passavam batido. Esta e a Fase 3
-- de docs/planos/lista-de-tarefas-texto-e-prazo.md; as mensagens sao as mesmas
-- do front, de proposito, e a redacao e da Patricia (09/09/2026).
--
-- POR QUE SO NA MUDANCA DO PRAZO. Em 09/09/2026 a producao tinha 35 dos 204
-- pares mae/filha ja fora da regra, com estouro de ate 1.346 dias. Uma regra
-- cobrada em toda gravacao prenderia quem fosse mexer no responsavel de uma
-- dessas linhas. O gatilho e por coluna (`update of due_date, parent_task_id`)
-- e ainda confere `is distinct from` por dentro: linha torta antiga continua
-- editavel em tudo o mais, e so para de piorar.
--
-- A mae imediata, nao a raiz: a neta (1.4.1) e medida contra a mae dela. Mesma
-- regra do guard de `useUpdateOrgTask`, que e quem responde primeiro na tela.

create or replace function public.org_tasks_prazo_dentro_da_mae()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  prazo_da_mae date;
  filhas_fora  integer;
  ultima_filha date;
begin
  if NEW.due_date is not null
     and NEW.parent_task_id is not null
     and (TG_OP = 'INSERT'
          or NEW.due_date is distinct from OLD.due_date
          or NEW.parent_task_id is distinct from OLD.parent_task_id)
  then
    select due_date into prazo_da_mae
      from public.org_tasks
     where id = NEW.parent_task_id;

    if prazo_da_mae is not null and NEW.due_date > prazo_da_mae then
      raise exception
        'Esta subtarefa não pode vencer depois de %, que é o prazo da tarefa-principal.',
        to_char(prazo_da_mae, 'DD/MM/YYYY');
    end if;
  end if;

  -- O outro lado da mesma regra: a mae recuando para tras de uma filha que ja
  -- existe. A mensagem diz quantas e ate quando, porque e isso que decide o
  -- que a pessoa faz em seguida.
  if TG_OP = 'UPDATE'
     and NEW.due_date is not null
     and NEW.due_date is distinct from OLD.due_date
  then
    select count(*), max(due_date) into filhas_fora, ultima_filha
      from public.org_tasks
     where parent_task_id = NEW.id
       and due_date > NEW.due_date;

    if filhas_fora = 1 then
      raise exception
        '1 subtarefa vence depois desta data (em %). Ajuste o prazo dela antes.',
        to_char(ultima_filha, 'DD/MM/YYYY');
    elsif filhas_fora > 1 then
      raise exception
        '% subtarefas vencem depois desta data (a última em %). Ajuste o prazo delas antes.',
        filhas_fora,
        to_char(ultima_filha, 'DD/MM/YYYY');
    end if;
  end if;

  return NEW;
end;
$$;

comment on function public.org_tasks_prazo_dentro_da_mae() is
  'Subtarefa nao vence depois da tarefa-mae, e a mae nao recua para tras de uma filha existente. Cobrado so quando due_date ou parent_task_id mudam, para nao prender as linhas que ja estavam fora da regra. Espelha src/lib/orgTaskPrazo.ts.';

drop trigger if exists trg_org_tasks_prazo_dentro_da_mae on public.org_tasks;

create trigger trg_org_tasks_prazo_dentro_da_mae
  before insert or update of due_date, parent_task_id on public.org_tasks
  for each row execute function public.org_tasks_prazo_dentro_da_mae();
