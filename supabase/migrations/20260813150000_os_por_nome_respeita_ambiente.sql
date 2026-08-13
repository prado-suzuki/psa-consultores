-- 20260813150000_os_por_nome_respeita_ambiente.sql
-- A busca de OS por nome de cliente passa a respeitar o ambiente, e limpa os
-- projetos de dev que a falta desse filtro produziu.
--
-- O DEFEITO. `get_ordens_by_client_name(p_client_id)` recebe o ID de um cliente,
-- pega o NOME dele e devolve as OS de TODOS os clientes com nome equivalente. Como
-- o mesmo cliente existe duas vezes, um cadastro por ambiente (`cliente.ambiente`
-- = 'dev' | 'prod'), ela devolve as OS dos dois. A tela de cadastro de projeto usa
-- essa lista para o consultor escolher a OS, então ela oferece OS do outro
-- ambiente, e quem escolher cria um projeto que amarra cliente de um ambiente a OS
-- do outro.
--
-- A busca por NOME e intencional e recente: veio em
-- `20260813103000_nome_proprio_preserva_caixa.sql`, junto com um indice em
-- `cliente (nome_cliente_normalizado(nome))`. O `projetosLote.ts` documenta o
-- comportamento em comentario ("expande o id para todos os clientes de mesmo
-- nome"). Ela existe para o caso de grupo economico com cadastros homonimos, e
-- esse caso continua funcionando: o filtro so acrescenta "do mesmo ambiente".
--
-- Conferido no banco em 13/08/2026, nao presumido:
--   - `cliente.ambiente` existe e e NOT NULL, com valores 'dev' e 'prod';
--   - `ordem_servico` NAO tem coluna `ambiente`: o ambiente de uma OS e o do
--     cliente dela, o que e por que o filtro tem de ser no `cliente`;
--   - `org_projects` tambem NAO tem coluna `ambiente`: o ambiente de um projeto e
--     o do cliente em `external_client_id`;
--   - a funcao e consumida por um lugar so, `useClienteOrdens` em
--     `useTaxReferenceData.ts`, usado pelo controlador de cadastro de projetos e
--     pela criacao em lote a partir de OS. Nenhuma outra tela sente a mudanca.
--
-- Medido antes de aplicar (13/08/2026): 126 projetos, dos quais 5 tem cliente em
-- dev e 3 tem cliente em prod apontando para OS de dev. Os 5 de dev foram TODOS
-- criados pela propria equipe (Patricia 3, Bernardo 1, conta de teste 1), nenhum
-- por analista, e por isso podem sair. Os 3 de prod NAO entram aqui: eles precisam
-- ter a OS reapontada para o cadastro de prod, o que exige confirmar caso a caso
-- se a OS equivalente existe.
--
-- Reversao:
--   a funcao volta com o corpo anterior, que esta reproduzido no comentario antes
--   do CREATE abaixo. Os projetos apagados NAO voltam: sao dados de teste, e a
--   lista deles esta no comentario da secao 2.

BEGIN;

-- ── 1) A funcao ─────────────────────────────────────────────────────────────
-- Anterior (identica, sem a linha do ambiente):
--   SELECT os.* FROM ordem_servico os
--    WHERE os.id_cliente IN (
--            SELECT c2.id FROM cliente c2
--             WHERE public.nome_cliente_normalizado(c2.nome)
--                 = public.nome_cliente_normalizado((SELECT nome FROM cliente WHERE id = p_client_id LIMIT 1))
--               AND c2.excluido = false)
--      AND os.excluido = false
--    ORDER BY os.created_at DESC;
create or replace function public.get_ordens_by_client_name(p_client_id uuid)
returns setof ordem_servico
language sql
stable
security definer
set search_path to 'public'
as $$
  select os.*
    from ordem_servico os
   where os.id_cliente in (
           select c2.id
             from cliente c2
            where public.nome_cliente_normalizado(c2.nome)
                = public.nome_cliente_normalizado(
                    (select nome from cliente where id = p_client_id limit 1))
              -- A linha que faltava. Sem ela, cadastro homonimo do OUTRO ambiente
              -- entra na lista, e a tela oferece OS de dev num projeto de prod.
              and c2.ambiente = (select ambiente from cliente where id = p_client_id)
              and c2.excluido = false)
     and os.excluido = false
   order by os.created_at desc;
$$;

comment on function public.get_ordens_by_client_name(uuid) is
  'OS de todos os cadastros de cliente com o mesmo nome normalizado, restrito ao MESMO ambiente do cliente informado. O casamento por nome atende grupo economico com cadastros homonimos; o recorte de ambiente impede que a tela de projeto ofereca OS de dev para cliente de prod e vice-versa.';

-- ── 2) A limpeza dos projetos de dev ────────────────────────────────────────
-- Os 5, todos criados pela equipe e confirmados pela Patricia:
--   Agropecuaria Bom Pastor - OS 056/2026 - CC  - Consultoria contabil    (Patricia)
--   Agropecuaria Bom Pastor - OS 056/2026 - CT  - Consultoria tributaria  (Patricia)
--   Agropecuaria Bom Pastor - OS 056/2026 - PTR - Planejamento Tributario (Patricia)
--   Qa-0729-1614 Grupo Horizonte Aureo - OS 089/2026 - RCT                (Bernardo)
--   QA-0729-1614 Projeto Recuperacao Tributaria OS 089/2026              (conta de teste)
--
-- Os tres primeiros tambem cruzavam ambiente (projeto em dev, OS 056/2026 em
-- prod), entao apagar resolve as duas coisas de uma vez.
--
-- ATENCAO ao apagar projeto: a FK de `org_tasks` declara ON DELETE SET NULL, mas
-- `org_tasks.project_id` e NOT NULL. As duas regras se contradizem, e o resultado
-- e que o banco RECUSA apagar projeto que tenha tarefa. Por isso as tarefas saem
-- primeiro. As tres sao de teste: 'Estudo', 'TESTE' e 'teste', todas em status
-- 'todo'.
--
-- O resto sai em CASCADE, conferido em pg_constraint: `org_comments` (18 linhas,
-- incluindo os 12 do projeto CC), `org_project_members` e `project_servicos`.

create temporary table _projetos_dev on commit drop as
  select p.id
    from public.org_projects p
    join public.cliente c on c.id = p.external_client_id
   where c.ambiente = 'dev';

delete from public.org_tasks
 where project_id in (select id from _projetos_dev);

delete from public.org_projects
 where id in (select id from _projetos_dev);

COMMIT;
