## Diagnóstico de filtros por cluster/área — sprint de revisão

Sem aplicar nada. Mapa do que está OK e o que precisa virar tarefa.

## Causa-raiz confirmada em /equipe/chamados

O dropdown "Responsável" em `EquipeChamados`, `GestaoChamados` e `GestaoDetalhesChamado` é alimentado por `useTicketAgents()` (`src/hooks/useTickets.ts:314`), que chama a RPC `get_internal_users()`. Essa função SQL retorna **todos** os usuários com role ≥ `team_member`, sem qualquer filtro por `cluster_id` do ticket nem pelos clusters em que cada usuário atua via `estrutura_equipe_membros`/`estrutura_equipes.gestor_id`.

Resultado: um ticket do cluster Tax oferece como possíveis responsáveis pessoas de OSG, Digital, PSA, etc. **Não é problema de RLS** — RLS só esconde linhas; aqui o backend devolve por design uma lista global. A correção é no hook + RPC: receber `cluster_id` como parâmetro e cruzar com `resolve_user_cluster_ids(user_id)` (função já existente no banco).

Mesmo padrão de "lista global de pessoas" aparece em vários módulos abaixo, com criticidade variável dependendo se o contexto exige cluster/área ou se é uma visão executiva legítima.

## Padrões de risco que procurei

1. **Dropdown de responsável/assignee** populado por `profiles_safe` direto ou RPC sem filtro → mostra gente de qualquer cluster.
2. **Filtro de cluster ausente** em listagens cujo escopo deveria ser o cluster do usuário/registro.
3. **Cluster hardcoded** em vez de derivado do contexto (ex.: Sprint hoje filtra fixo no cluster Digital).
4. **Cascata cluster→área→equipe** ausente — usuário consegue selecionar área de outro cluster.

## Checklist por módulo

Legenda: ✅ OK · ⚠️ ATENÇÃO · 🔴 CRÍTICO

### 1. Admin & Acessos (`/admin`, `/equipe/acessos`)

| Item | Status | Observação |
|---|---|---|
| `UsersTab` lista todos usuários | ✅ | Por design — gestão global. |
| `DashboardsTab` / `DashboardAccessPanel` lista todos | ✅ | Admin global por definição. |
| `AdminUsuarios` lê `profiles` direto | ⚠️ | Funciona pois é admin-only via RLS, mas viola o padrão "use `profiles_safe`/RPC". Não vaza dado, mas é exceção. |
| Acessos por página vinculados ao cluster do usuário | ⚠️ | Trigger `auto_grant_new_page_to_area_users` libera por categoria, não por cluster. Pode dar acesso a página de outro cluster se o user tiver pelo menos uma página da mesma categoria. |

### 2. Gestão da Equipe (`/equipe/*`)

| Submódulo | Status | Observação |
|---|---|---|
| **Chamados** — dropdown Responsável | 🔴 | `useTicketAgents` ignora `cluster_id` do ticket. Confirmado. |
| **Chamados** — filtro de lista por cluster do usuário | ✅ | `defaultCluster` em `EquipeChamados` usa `userClusters[0]` quando há 1. |
| **Chamados** — `CreateTicketDialog` (área cascateada por cluster do cliente) | ✅ | Correto, via `cliente_clusters`. |
| **Sprints** — modal "Nova Sprint" com filtro de cluster | ✅ | Implementado recentemente. |
| **Sprints** — dropdown Responsável do entregável | ⚠️ | `EquipeSprintDetalhes` hoje filtra **fixo** no cluster Digital (`952435d2…`). Funciona pro caso atual, mas hardcoded — quebra se outro cluster usar sprints. |
| **Backlog** (`EquipeBacklog`) — assignee via `profiles_safe` global | ⚠️ | Sem filtro de cluster. |
| **Tarefas** (`EquipeTarefas`) — assignee via `profiles_safe` global | ⚠️ | Idem. |
| **Kanban** (`EquipeKanban`) — assignee via `profiles_safe` global | ⚠️ | Idem. |
| **Projetos** (`EquipeProjetos`) — responsáveis via `profiles_safe` global | ⚠️ | Project members deveriam restringir a clusters/áreas do projeto. |
| **Processos** (mapa em `equipe/mapa/*`) — listas de responsável | ⚠️ | Várias páginas do mapa puxam users sem cruzar com cluster do processo. |
| **Rotinas** (`EquipeRotinas`) — responsável via `profiles_safe` global | ⚠️ | Mesmo padrão. |
| **Daily** (`EquipeDaily`) — quem aparece no standup | ⚠️ | `profiles_safe` global, sem filtro de equipe/área do usuário. |
| **Relatórios** | ✅ | Visão consolidada, lista global é esperada. |
| **Biblioteca/Procedimentos** | ✅ | Conteúdo é cross-cluster por design. |
| **Mapeamento** (`/equipe/mapa/*`) — filtros por cluster/projeto | ⚠️ | Páginas mostram dados de todos clusters quando entrei via `mapa-osg` slug fixo. Validar SetorEvolucao, Responsaveis, Sistemas. |

### 3. Board / Desempenho (`/equipe/board/*`, `/equipe/gerencial/desempenho/*`)

| Item | Status | Observação |
|---|---|---|
| `DesempenhoVisaoGeral/Metas/Ciclos/Feedbacks/Reunioes1a1` lista todos via `profiles_safe` | ⚠️ | Aceitável para admin/líder, mas sublíder deveria ver só sua estrutura. Hoje vê todo mundo. |
| `AdminPerformance` | ✅ | Restrito a admin/lider. |
| `Minha Evolução` (portal do membro) | ✅ | Já restringe ao próprio user. |

### 4. Dev / Fiscal-SPED (`/equipe/dev/*`)

| Item | Status | Observação |
|---|---|---|
| Páginas SPED/Auditoria Cruzada | ✅ | Dados são por contribuinte/período, não por cluster do usuário. |
| Procedimentos (geração AI) | ✅ | Escopado por usuário/contribuinte. |
| NCM rules | ✅ | Já filtra por setor do contribuinte. |

### 5. Digital / Mapa (`/equipe/digital/mapa/*`)

| Item | Status | Observação |
|---|---|---|
| Páginas filtradas por `cluster_id = Digital` | ⚠️ | Boa parte do `psa_mapa_uuid` é hardcoded para Digital/PSA. Quando OSG entrar no mesmo mapa, vai precisar parametrizar. Não é bug agora, é dívida. |

### 6. OSG (`/equipe/osg/*`)

| Item | Status | Observação |
|---|---|---|
| Documentos, Pessoas, Bens, Cartório | ✅ | RLS já restringe escrita a lider+/admin; leitura por team_member+. Dados não cruzam cluster (não têm `cluster_id`). |
| `HistoricoFlutuante` carrega `profiles_safe` global | ⚠️ | Pra exibir nome de quem alterou, OK. Mas se virar filtro de "responsável", precisa restringir. |
| `documento_horas_historico` DELETE aberto | 🔴 | Identificado em auditoria anterior. Continua aberto. |

### 7. Tax (`/equipe/tax/*`)

| Item | Status | Observação |
|---|---|---|
| Páginas usam `contribuinte` filtrado por ambiente | ✅ | Padrão respeitado. |
| Dropdown de responsável em tax_projects/tasks | ⚠️ | Mesmo problema: lista global. Quem pode ser dono de uma tarefa Tax deveria ser apenas a equipe Tax. |
| Visão de tarefas Tax cross-cluster | ✅ | RLS recente (`org_tasks`) já alinha visibilidade. |

### 8. Cliente (`/cliente/*`, `/auth`, `/ajuda`)

| Item | Status | Observação |
|---|---|---|
| `MeusChamados` / `DetalhesChamado` mostram só os do próprio cliente | ✅ | RLS por `user_id` do representante. |
| `NovoChamado` cascateia área por clusters do cliente | ✅ | Correto via `cliente_clusters`. |
| `ClienteDashboard` agente atribuído visível | ✅ | Já corrigido para mostrar apenas nome do agente. |
| Portal expõe nomes de profiles de outros clientes? | ✅ | Usa `profiles_safe` (sem email/phone). |
| `/auth` e `/ajuda` | ✅ | Sem dado por cluster. |

## Tarefas propostas pra sprint (priorizadas)

| # | Prioridade | Item |
|---|---|---|
| 1 | 🔴 P0 | Refatorar `useTicketAgents` + criar RPC `get_internal_users_by_cluster(cluster_id)` cruzando `resolve_user_cluster_ids`. Passar `ticket.cluster_id` em todos os 3 pontos de uso. |
| 2 | 🔴 P0 | Adicionar policy de DELETE em `documento_horas_historico` (hoje aberta). |
| 3 | ⚠️ P1 | Substituir hardcode do cluster Digital em `EquipeSprintDetalhes` por derivação a partir do projeto/sprint. |
| 4 | ⚠️ P1 | Criar hook único `useAssignableUsers({ clusterId?, areaId?, equipeId? })` e migrar Backlog, Tarefas, Kanban, Projetos, Rotinas, Daily pra ele. |
| 5 | ⚠️ P1 | Revisar `auto_grant_new_page_to_area_users` para cruzar também `cluster_id` da página com cluster do usuário. |
| 6 | ⚠️ P2 | Restringir páginas de Desempenho para sublíder mostrarem só sua estrutura. |
| 7 | ⚠️ P2 | Parametrizar `psa_mapa_uuid` para aceitar cluster dinâmico antes de OSG/Tax entrarem no mesmo mapa. |
| 8 | ⚠️ P2 | Padronizar leitura em `AdminUsuarios` para usar `get_profiles_with_email` em vez de `from('profiles')`. |

## Como vou validar (quando você aprovar a execução)

Não nesta rodada. Mas pra cada item da sprint:
- Antes: print da lista atual + `count` de usuários retornados.
- Depois: mesma query escopada por cluster, verificando que `(a) o líder do cluster correto aparece` e `(b) usuário de outro cluster some`.
- Testes E2E via Playwright na rota afetada quando há UI envolvida.

## O que NÃO está nesta rodada

- Nenhuma migration, nenhum edit em hook/policy.
- Nenhum fix do bug do chamados — só o diagnóstico. Quando você aprovar, abro um plano focado no item 1.