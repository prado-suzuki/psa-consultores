-- gerar_tarefas_projeto passa a nascer dos SERVICOS do produto.
--
-- REGRA: no portal, servico E a tarefa-pai. Cada servico vinculado ao produto do
-- projeto vira uma tarefa de nivel superior naquele projeto.
--
-- O QUE MUDA, E POR QUE
--    A EDU-12 escreveu esta funcao lendo `produto_tarefa_padrao`, a tabela que a
--    EDU-10 criou para ser o catalogo de tarefas por produto. Depois disso a
--    sprint decidiu (18/08/2026, tech lead) ABANDONAR aquela tabela e usar o
--    catalogo que o dominio ja tinha: `produto_servico` + `servicos_prestados`,
--    em uso desde marco e onde a ALE-6 cadastrou os 41 vinculos da OSG.
--
--    Consequencia de nao trocar a fonte: `produto_tarefa_padrao` tem 0 linhas
--    nos dois bancos, e `org_tasks.tarefa_padrao_id` esta nulo em 521 de 521.
--    A funcao devolve 0 SEMPRE, e o botao de redisparo da ALE-7 nao faz nada.
--
-- O QUE SE PERDE NA TROCA, e e de propriedade da decisao, nao acidente
--    `produto_servico` + `servicos_prestados` guardam (produto, servico) e
--    (id, nome, cluster_id). NAO existe coluna de papel do responsavel, de
--    deslocamento em dias nem de horas estimadas -- elas so existiam na tabela
--    abandonada. Logo:
--      · responsavel  -> responsavel do projeto, caindo para o lider
--      · prazo        -> data de inicio do projeto (sem deslocamento)
--      · horas        -> nulo
--      · descricao    -> nula (o catalogo de servico so tem nome)
--
-- ORDEM: `order by sp.nome`. Nao existe coluna de ordem no catalogo de servicos;
-- a sequencia vive no prefixo numerico do nome ('1.01.', '2.16.'), que e como as
-- telas ja listam. Por isso o insert respeita o nome, nao o id.
--
-- IDEMPOTENCIA, e por que ela NAO depende de indice novo
--    O guarda e o mesmo padrao de antes: nao insere se o projeto JA TEM tarefa
--    de nivel superior para aquele servico. Duas execucoes seguidas devolvem
--    N e 0.
--
--    Um indice unico (project_id, servico_id) daria garantia tambem contra dois
--    cliques simultaneos, e NAO entra nesta migracao porque nao subiria: medido
--    em 18/08/2026, ha 1 par duplicado entre tarefas-pai no sandbox e 1 em
--    producao. Alem disso `org_tasks.servico_id` hoje e CLASSIFICACAO, nao 1:1 --
--    ha projeto com 7 tarefas no mesmo servico de ICMS. Criar o indice exige
--    decidir o que fazer com esses pares, e isso e decisao humana.
--
-- EFEITO COLATERAL A DECLARAR: a geracao nao filtra cluster, so olha o produto do
-- projeto. Como os produtos de TAX tambem tem servicos vinculados, projeto novo
-- de TAX passa a nascer com tarefas. Medido em producao: nos ultimos 60 dias
-- foram 25 projetos de TAX e 3 de OSG, o que teria criado 92 e 26 tarefas.
--
-- Estado conferido nos dois bancos em 19/08/2026: a funcao existe com a
-- assinatura (_project_id uuid) -> integer e le a fonte antiga. A assinatura NAO
-- muda aqui, entao o front que ja a chama continua valendo sem alteracao.
--
-- IDEMPOTENTE: create or replace function.

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

  -- Projeto sem produto gravado nao tem catalogo a aplicar. Silencioso de
  -- proposito: e o caso dos 11 projetos que o backfill da ALE-4 nao identificou.
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
       -- Ja tem tarefa de nivel superior desse servico neste projeto? Nao repete.
       -- Restringe a parent_task_id is null porque servico_id em tarefa FILHA e
       -- classificacao, e nao marca de tarefa gerada.
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
  'Cria uma tarefa-pai por servico vinculado ao produto do projeto. Fonte: produto_servico + servicos_prestados (a produto_tarefa_padrao foi abandonada em 18/08/2026). Idempotente pelo guarda de tarefa-pai ja existente por (projeto, servico). Responsavel = responsavel do projeto, caindo para o lider; prazo = data de inicio do projeto; horas e descricao nulas, porque o catalogo de servico nao tem esses campos.';

-- ── Conferencia depois de rodar ────────────────────────────────────────────
-- select public.gerar_tarefas_projeto('<uuid de um projeto com produto>');  -- N
-- select public.gerar_tarefas_projeto('<mesmo uuid>');                      -- 0
--
-- select o.title, o.assigned_to_name, o.due_date
--   from public.org_tasks o
--  where o.project_id = '<uuid>' and o.servico_id is not null
--  order by o.title;
