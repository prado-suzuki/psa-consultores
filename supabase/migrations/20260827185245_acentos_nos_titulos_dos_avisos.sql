-- 20260827185245_acentos_nos_titulos_dos_avisos.sql
-- Acentos nos titulos dos avisos internos da EDU-2. So texto.
--
--
-- Dois titulos gravados em `notificacao` nascem sem acento e aparecem assim na
-- tela do sino, desde a EDU-2 (Sprint 11):
--
--   'Voce e o responsavel: '  ->  'Você é o responsável: '
--   'Tarefa em revisao: '     ->  'Tarefa em revisão: '
--
-- 'Documento recebido de ' nao precisa e fica como esta.
--
-- E o mesmo descuido que eu corrigi ontem nos textos da GES-03: o SQL foi escrito
-- sem acento por comodidade de teclado, e o texto e VISIVEL AO USUARIO. Aqui
-- estava havia mais tempo e ninguem tinha reparado.
--
-- SO OS AVISOS NOVOS mudam. As linhas ja gravadas em `notificacao` guardam o
-- titulo como texto e continuam sem acento ate serem lidas e substituidas por
-- avisos novos. Nao vale reescrever historico de notificacao por causa de acento.
--
-- O resto de cada funcao e identico ao que esta em producao, lido de la e nao
-- transcrito de memoria.
--
-- Reversao: reaplicar as definicoes do baseline.

BEGIN;

CREATE OR REPLACE FUNCTION public.notificar_tarefa_atribuida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Falha do aviso nunca derruba a escrita principal (molde 20260731120000).
  begin
    perform public.criar_notificacao(
      NEW.assigned_to, 'tarefa_atribuida',
      'Você é o responsável: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
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

    -- Projeto sem lider sai em silencio, sem excecao. Nao e caso hipotetico:
    -- medidos 3 projetos com tarefa e sem lider, somando 11 tarefas.
    if v_lider is null then return NEW; end if;

    -- Lider que TAMBEM e o revisor recebe UM aviso so, e e o derivado de
    -- "tarefa para voce revisar". Sem esta guarda seriam 16 tarefas com linha
    -- duplicada para a mesma pessoa.
    if NEW.reviewer_id is not null and NEW.reviewer_id = v_lider then
      return NEW;
    end if;

    perform public.criar_notificacao(
      v_lider, 'tarefa_em_revisao',
      'Tarefa em revisão: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
      'tarefa_em_revisao:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_em_revisao: %', sqlerrm;
  end;
  return NEW;
end $function$;

COMMIT;
