-- 20260814200000_produto_tarefa_padrao_e_colunas.sql
-- EDU-10 - O catalogo de tarefas por produto e as tres colunas que a geracao usa.
--
-- Hoje o sistema NAO SABE qual produto um projeto realiza: findProdutosJaCriados,
-- em src/lib/projetosLote.ts, casa projeto e produto por normalizeProjectName,
-- isto e, por TEXTO DE NOME, e o proprio comentario do arquivo admite que
-- renomear o projeto escapa da deteccao.
--
-- PREMISSA DE 09/08/2026: CRIA TABELA NOVA, nao reusa produto_servico nem
-- servicos_prestados. Investigado e fechado, nao reabrir:
--   - produto_servico e TAXONOMIA DE ESCOPO (quais servicos cabem num produto),
--     nao lista de trabalho. Conferido hoje: 136 vinculos, e o produto CHA
--     sozinho tem 66 dos 67 servicos de servicos_prestados.
--   - cardinalidade errada: aquilo e N:N de proposito; catalogo de tarefas e 1:N
--     ORDENADO, com ordem, papel, dias e horas na propria linha.
--   - o unico (produto, ordem) nem poderia nascer sobre aquelas 136 linhas.
--   - org_tasks.servico_id ja aponta para servicos_prestados, e org_projects
--     tambem (org_projects_servico_id_fkey). Reusar criaria um TERCEIRO ponteiro
--     para o mesmo conceito com significado diferente.
--   - produto_servico tem tela de cadastro com checkbox e delecoes recentes: um
--     clique de tela quebraria a idempotencia da geracao (EDU-12).
-- As duas tabelas antigas seguem VIVAS (7 consumidores no codigo, escrita em
-- 07/08/2026). Nada aqui as deprecia, apaga ou toca.
--
-- PREMISSA DE 09/08/2026: SEM coluna de dependencia entre tarefas do catalogo.
-- org_tasks tem parent_task_id, mas isso e hierarquia de subtarefa e esta em uso
-- em 122 das 499 linhas, nao ponteiro de predecessora; a EDU-12 nao tem onde
-- gravar predecessora e a planilha da ALE-6 nao traz a coluna. O sequenciamento
-- vem de `ordem` (exibicao) e de `dias_offset` (prazo). Se um dia precisar, entra
-- em migracao propria: o catalogo NAO tera tela de cadastro (decisao da ALE-6),
-- entao toda mudanca futura ja e migracao de qualquer jeito.
--
-- Conferido no banco em 09/08/2026, nao presumido: produto_tarefa_padrao nao
-- existe; org_projects.produto_segmento_id, org_tasks.tarefa_padrao_id e
-- produto_segmento.is_canal_chamados nao existem; org_projects NAO tem `excluido`
-- nem `ambiente` e NAO tem indice nem FK em external_client_id (pg_constraint so
-- lista created_by, equipe_id, estrutura_area_id, leader_id, ordem_servico_id,
-- responsible_id e servico_id); produto_segmento tem 6 colunas, 28 linhas e
-- unique em codigo; org_tasks.estimated_hours e numeric; checklist_touch_updated_at(),
-- has_role(uuid, app_role) e has_role_or_higher(uuid, app_role) existem, e a
-- hierarquia desta ultima e team_member < sublider < lider < admin; os tres
-- valores vivos de org_project_members.role sao responsible (104), leader (123) e
-- member (165); um unico produto casa com chamado, CHA "Canal de Chamados".
--
-- RECONFERIDO EM 14/08/2026, E O BLOCO 1 MUDOU DE ESCOPO.
--
-- A migracao 20260814140000_org_projects_produto_segmento.sql (commit 853015fa,
-- ja na main e aplicada) criou org_projects.produto_segmento_id e o indice
-- idx_org_projects_produto_segmento, com um backfill de tres passadas que deixou
-- a coluna preenchida em 90 dos 101 projetos. Ela nasceu de outra frente e cinco
-- dias depois do enunciado da EDU-10 ser escrito, entao o enunciado nao poderia
-- saber. Este arquivo NAO recria nada disso.
--
-- DUAS DIVERGENCIAS ENTRE O QUE A EDU-10 PEDE E O QUE ESTA NO BANCO. Decisao de
-- 14/08/2026: MANTER O QUE ESTA, e registrar aqui em vez de reverter.
--
--   1. Regra de exclusao da FK. A EDU-10 pede `on delete set null`; o banco tem
--      RESTRICT (o padrao). As DUAS atendem a preocupacao do enunciado, que e
--      "apagar um produto do catalogo nao pode apagar projeto de cliente":
--      nenhuma apaga o projeto. A diferenca e outra: com RESTRICT apagar o
--      produto e proibido enquanto houver projeto em cima; com SET NULL e
--      permitido e o ponteiro vira nulo. RESTRICT e a mais conservadora das
--      duas e foi escolha deliberada e justificada da migracao de 14/08.
--      Mudar exigiria derrubar e recriar a FK, o que e conserto, nao acrescimo.
--
--   2. O indice simples e PARCIAL (`where produto_segmento_id is not null`); a
--      EDU-10 pede sem predicado, argumentando que org_projects nao tem
--      `excluido` nem `ambiente`. Mas o predicado de la filtra pela propria
--      coluna ser nao nula, o que e outra coisa e e legitimo: indice menor, e
--      linha nula nunca e buscada por igualdade. Mantido.
--
-- Do bloco 1 sobra UMA COISA, e ela falta de verdade: o indice composto
-- idx_org_projects_cliente_produto, que e a consulta do trigger da EDU-11 ("o
-- projeto daquele produto naquele cliente") e serve de prefixo para
-- external_client_id, que nao tem indice nenhum. So ele entra.
--
-- O comentario de coluna de produto_segmento_id NAO e reescrito: o que esta la
-- cita o backfill e e mais informativo que o desta migracao.
--
-- CONSEQUENCIA A REGISTRAR: a premissa de que gerar_tarefas_projeto() devolveria
-- zero para todo projeto existente NAO vale mais, porque 90 projetos ja apontam
-- produto. E os projetos hoje sao 101, nao 126.
--
-- ACHADO NA BATERIA DE TESTE DE 14/08/2026, sobre o SET NULL de tarefa_padrao_id:
-- apagar linha do catalogo dispara um UPDATE em org_tasks, e esse update passa
-- pelo trigger org_tasks_team_member_status_only() (RLS-06). O trigger libera
-- quem e sublider ou acima e RECUSA o resto com 42501. Consequencias:
--   - pela tela funciona: so admin apaga linha do catalogo (policy desta
--     migracao), e admin passa no trigger. Testado, e a tarefa sobrevive com o
--     ponteiro nulo, como a tarefa manda.
--   - em contexto SEM auth.uid() (job de servidor, cron, service_role, ou o
--     proprio editor SQL sem JWT) o cascade FALHA e a exclusao aborta.
-- Nao e defeito desta migracao e nao muda o desenho; fica registrado porque
-- qualquer rotina automatica que venha a limpar catalogo vai esbarrar nisso.
--
-- Reversao:
--   drop index if exists public.uq_org_tasks_tarefa_padrao;
--   drop index if exists public.idx_org_tasks_tarefa_padrao;
--   alter table public.org_tasks drop column if exists tarefa_padrao_id;
--   drop table if exists public.produto_tarefa_padrao;
--   drop index if exists public.uq_produto_segmento_canal_chamados;
--   alter table public.produto_segmento drop column if exists is_canal_chamados;
--   drop index if exists public.idx_org_projects_cliente_produto;
--   (produto_segmento_id e idx_org_projects_produto_segmento NAO entram na
--    reversao: nao sao desta migracao.)

BEGIN;

-- 1) Qual produto este projeto realiza ---------------------------------------
-- A coluna org_projects.produto_segmento_id e o indice
-- idx_org_projects_produto_segmento NAO sao criados aqui: ja existem, vieram da
-- 20260814140000_org_projects_produto_segmento.sql. Ver as duas divergencias no
-- cabecalho. O comentario de coluna de la tambem fica como esta.
--
-- Falta so o composto, para "o projeto daquele produto naquele cliente", que e a
-- consulta do trigger de chamado (EDU-11). external_client_id NAO tem indice
-- hoje: este composto passa a servir de prefixo para ele tambem, entao NAO crie
-- um terceiro indice so nele.
create index if not exists idx_org_projects_cliente_produto
  on public.org_projects (external_client_id, produto_segmento_id);

-- 2) Qual produto E o canal de chamados --------------------------------------
alter table public.produto_segmento
  add column if not exists is_canal_chamados boolean not null default false;

comment on column public.produto_segmento.is_canal_chamados is
  'Marca o unico produto que e o Canal de Chamados. Existe para o trigger nao precisar comparar texto de nome nem codigo fixo. Preenchida por carga de dado, nunca por esta migracao.';

-- Indexando a PROPRIA coluna booleana sob o predicado where is_canal_chamados,
-- toda linha indexada vale true e a SEGUNDA colide (23505). Constraint unique
-- simples faria o oposto do desejado: proibiria mais de um produto com false,
-- isto e, os outros 27.
create unique index if not exists uq_produto_segmento_canal_chamados
  on public.produto_segmento (is_canal_chamados)
  where is_canal_chamados;

-- RLS de produto_segmento: nada a fazer. As duas policies vivas
-- (rls_produto_segmento_select e team_manage_produto_segmento, esta FOR ALL)
-- decidem por has_role_or_higher('team_member'), nao por coluna, e passam a valer
-- para a coluna nova. Consequencia a saber: qualquer team_member pode ligar a
-- marca. Quem impede DUAS marcas e o indice acima, e so ele.

-- 3) O catalogo de tarefas por produto ---------------------------------------
create table if not exists public.produto_tarefa_padrao (
  id                  uuid        primary key default gen_random_uuid(),
  produto_segmento_id uuid        not null references public.produto_segmento(id) on delete cascade,
  titulo              text        not null,
  descricao           text,
  -- NOT NULL SEM DEFAULT, de proposito: com default 0, duas linhas carregadas sem
  -- ordem explicita colidiriam no unico abaixo com uma mensagem que nao diz nada
  -- sobre a planilha. Quem grava e obrigado a dizer a posicao. Mesmo criterio de
  -- solicitacao_item.granularidade e solicitacao_item.grupo.
  ordem               integer     not null,
  -- TEXT com check, e nao app_role: estes tres sao papel NO PROJETO
  -- (org_project_members.role, escritos por buildMembersList em
  -- src/hooks/useOrgProjects.ts), nao papel na plataforma.
  papel_responsavel   text        not null default 'responsible',
  dias_offset         integer     not null default 0,
  -- numeric e nao integer: casa com org_tasks.estimated_hours, que e numeric.
  -- Com integer, uma hora e meia viraria 1 ou 2 na carga, em silencio.
  horas_estimadas     numeric,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  -- created_by/updated_by SEM FK: o AGENTS.md proibe FK direta para auth.users e
  -- as tabelas irmas do modulo deixam as duas soltas.
  created_by          uuid        default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid        default auth.uid(),
  constraint produto_tarefa_padrao_papel_chk
    check (papel_responsavel in ('responsible', 'leader', 'member')),
  constraint produto_tarefa_padrao_horas_chk
    check (horas_estimadas is null or horas_estimadas >= 0)
);

-- Sem coluna `ambiente`: produto_segmento nao e multi-ambiente, e o catalogo
-- pendura nele.

comment on table public.produto_tarefa_padrao is
  'Lista ordenada de tarefas que todo projeto novo daquele produto recebe. Tabela nova de proposito: produto_servico e taxonomia de escopo N:N, nao lista de trabalho (premissa de 09/08/2026 no cabecalho da migracao). Sem tela de cadastro: toda mudanca de conteudo e migracao.';
comment on column public.produto_tarefa_padrao.ordem is
  'Posicao da tarefa na lista do produto e alvo do ON CONFLICT da carga. Unica dentro do produto, inclusive para linha inativa: desativar NAO libera a ordem.';
comment on column public.produto_tarefa_padrao.papel_responsavel is
  'A quem a tarefa gerada cai: responsible, leader ou member. Sao os tres valores vivos de org_project_members.role. NAO e app_role.';
comment on column public.produto_tarefa_padrao.dias_offset is
  'Dias somados a org_projects.start_date para virar o due_date da tarefa gerada. Zero = vence no inicio do projeto. Projeto sem start_date gera tarefa sem prazo.';
comment on column public.produto_tarefa_padrao.horas_estimadas is
  'Copiada direto para org_tasks.estimated_hours pela geracao. Nula = tarefa sem estimativa.';
comment on column public.produto_tarefa_padrao.ativo is
  'Falso = a linha existe mas nao gera tarefa; gerar_tarefas_projeto() filtra por ativo. Linha que ja gerou tarefa se DESATIVA, nao se apaga.';

create index if not exists idx_produto_tarefa_padrao_produto
  on public.produto_tarefa_padrao (produto_segmento_id);

-- INDICE unico, e nao `constraint ... unique`, porque `alter table add
-- constraint` nao aceita IF NOT EXISTS e reaplicar a migracao abortaria (42P07).
-- E este o alvo do ON CONFLICT (produto_segmento_id, ordem) DO NOTHING da carga
-- da ALE-6: e daqui que sai a idempotencia que ela promete.
create unique index if not exists uq_produto_tarefa_padrao_ordem
  on public.produto_tarefa_padrao (produto_segmento_id, ordem);

-- Reaproveita a funcao que ja existe (20260707130000_osg_checklist_schema.sql).
-- NAO crie outra funcao de tocar data.
drop trigger if exists trg_produto_tarefa_padrao_updated_at on public.produto_tarefa_padrao;
create trigger trg_produto_tarefa_padrao_updated_at
  before update on public.produto_tarefa_padrao
  for each row execute function public.checklist_touch_updated_at();

-- RLS: arquetipo de catalogo. Le quem e da equipe, escreve quem e lider, apaga
-- so admin. auth.uid() vai embrulhado em (select ...) para o planejador avaliar
-- uma vez por consulta, e nao uma vez por linha.
alter table public.produto_tarefa_padrao enable row level security;

-- `create policy` NAO aceita IF NOT EXISTS, entao cada uma vem precedida de
-- `drop policy if exists`. Sem isso o arquivo nao e re-executavel e a segunda
-- aplicacao aborta a transacao inteira com 42710. E o padrao da casa (ver
-- 20260813150648, da propria Lovable). Importa aqui porque a mesma migracao pode
-- ser aplicada por caminhos diferentes.
drop policy if exists "equipe can view produto_tarefa_padrao" on public.produto_tarefa_padrao;
create policy "equipe can view produto_tarefa_padrao"
  on public.produto_tarefa_padrao for select to authenticated
  using (public.has_role_or_higher((select auth.uid()), 'team_member'::public.app_role));

drop policy if exists "lider can insert produto_tarefa_padrao" on public.produto_tarefa_padrao;
create policy "lider can insert produto_tarefa_padrao"
  on public.produto_tarefa_padrao for insert to authenticated
  with check (public.has_role_or_higher((select auth.uid()), 'lider'::public.app_role));

drop policy if exists "lider can update produto_tarefa_padrao" on public.produto_tarefa_padrao;
create policy "lider can update produto_tarefa_padrao"
  on public.produto_tarefa_padrao for update to authenticated
  using      (public.has_role_or_higher((select auth.uid()), 'lider'::public.app_role))
  with check (public.has_role_or_higher((select auth.uid()), 'lider'::public.app_role));

drop policy if exists "admin can delete produto_tarefa_padrao" on public.produto_tarefa_padrao;
create policy "admin can delete produto_tarefa_padrao"
  on public.produto_tarefa_padrao for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- 4) A idempotencia da geracao -----------------------------------------------
alter table public.org_tasks
  add column if not exists tarefa_padrao_id uuid
    references public.produto_tarefa_padrao(id) on delete set null;

comment on column public.org_tasks.tarefa_padrao_id is
  'De qual linha do catalogo esta tarefa nasceu. Nulo = tarefa criada a mao, que e o caso das 499 existentes. SET NULL na exclusao: apagar linha do catalogo nao pode apagar tarefa que alguem ja executou.';

create index if not exists idx_org_tasks_tarefa_padrao
  on public.org_tasks (tarefa_padrao_id);

-- E ESTE indice que da idempotencia a gerar_tarefas_projeto(), e nao o NOT EXISTS
-- da EDU-12: duas chamadas simultaneas passariam as duas pelo NOT EXISTS, porque
-- nenhuma enxerga a linha ainda nao confirmada da outra, e a tarefa nasceria
-- duas vezes. O predicado parcial mantem de fora as tarefas feitas a mao: as 499
-- linhas com tarefa_padrao_id nulo nao teriam o que dizer ao indice, ja que nulo
-- nao colide com nulo (NULLS DISTINCT, o padrao).
create unique index if not exists uq_org_tasks_tarefa_padrao
  on public.org_tasks (project_id, tarefa_padrao_id)
  where tarefa_padrao_id is not null;

-- Permissoes -----------------------------------------------------------------
-- COMECA REVOGANDO, e isto NAO e zelo. Conferido em 09/08/2026: o pg_default_acl
-- do schema public concede arwdDxtm (ALL) a anon, authenticated e service_role em
-- TODA tabela criada. Sem o revoke, a policy de INSERT restrita a lider
-- conviveria com um INSERT de tabela inteira que veio de graca junto com a
-- tabela. E o revoke vem ANTES dos grants: invertido, apagaria o que eles deram.
revoke all on public.produto_tarefa_padrao from anon, authenticated;

grant select, insert, update, delete on public.produto_tarefa_padrao to authenticated;
grant all on public.produto_tarefa_padrao to service_role;

-- org_projects, org_tasks e produto_segmento NAO entram no bloco acima: sao
-- tabelas antigas, acrescentar coluna nao muda privilegio nenhum, e o ACL delas
-- (as tres estao com anon=arwdDxtm hoje) e divida anterior e tarefa separada.

COMMIT;
