# AI_CONTEXT.md — Cérebro do Projeto PSA Consultores

> ⚠️ **LEIA PRIMEIRO: REGRAS INEGOCIÁVEIS DESTE PROJETO**
>
> ### Arquivos NUNCA editáveis
> - `components.json` — configuração shadcn-ui gerenciada externamente
> - `supabase/config.toml` — configuração Supabase Cloud, gerada automaticamente
> - `src/integrations/supabase/client.ts` — gerado automaticamente
> - `src/integrations/supabase/types.ts` — gerado automaticamente a partir do schema
> - `.env` — gerenciado pelo Lovable Cloud
>
> ### Proibições absolutas
> - **NUNCA** fazer chamada Supabase direta em componente. Toda query/mutation DEVE estar em um custom hook em `src/hooks/`.
> - **NUNCA** usar `alert()`, `confirm()` ou `prompt()` do navegador. Usar `useToast` (`src/hooks/use-toast.ts`) ou `sonner`.
> - **NUNCA** armazenar roles em `localStorage`, `sessionStorage` ou na tabela `profiles`. Roles vivem exclusivamente em `user_roles`.
> - **NUNCA** criar FK referenciando `auth.users` diretamente. Usar `profiles.id` como proxy.
> - **NUNCA** usar `CHECK` constraints com `now()`. Usar triggers de validação.
> - **NUNCA** modificar schemas reservados do Supabase: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
> - **NUNCA** incluir `ALTER DATABASE postgres` em migrations.
> - **NUNCA** remover tipagens TypeScript ou usar `any` sem justificativa documentada em comentário.
> - **NUNCA** criar rotas protegidas sem registrá-las em `src/config/protectedPages.ts`.
> - **NUNCA** alterar `src/constants/efdConfig.ts` para renomear "Participante" — refere-se ao SPED fiscal, não ao cadastro de clientes.
>
> ### Obrigações absolutas
> - **SEMPRE** usar `useToast` ou `sonner` para feedback ao usuário.
> - **SEMPRE** registrar operações CUD (Create/Update/Delete) via `useAuditLog`, incluindo `changed_fields` com diff campo-a-campo.
> - **SEMPRE** manter RLS habilitado em tabelas com dados de usuário.
> - **SEMPRE** usar `has_role()` (SECURITY DEFINER) para checar permissões em RLS policies.
> - **SEMPRE** usar aliases de import: `@/components`, `@/hooks`, `@/lib`, `@/config`, `@/types`, `@/contexts`, `@/constants`.
> - **SEMPRE** nomear hooks como `use[Domínio][Ação]` (ex: `useFiscalTasks`, `useAuditLog`).
> - **SEMPRE** um componente por arquivo, PascalCase.

---

## 1. Visão Geral do Projeto

### 1.1 Propósito
Sistema de gestão interna e portal de clientes da PSA Consultores — consultoria tributária B2B. Cobre gestão de projetos fiscais, cálculos tributários (EFD, Selic, PER/DCOMP, DIFAL, IBS/CBS), CRM de chamados, controle organizacional e site institucional.

### 1.2 Público-alvo
| Perfil | Acesso |
|---|---|
| **Cliente** | Portal: chamados, dashboard, documentos |
| **Equipe interna** | Sprints, tarefas, kanban, processos, ferramentas Dev |
| **Líderes/Sublíderes** | Gestão de projetos, atribuição de tarefas, auditoria |
| **Admin** | Controle total: usuários, acessos, performance |

### 1.3 Módulos
- **Site institucional** — landing page pública (Hero, Services, About, Contact, etc.)
- **Portal do Cliente** — `cliente/`: dashboard, chamados, documentos
- **Portal da Equipe** — `equipe/`: sprints, tarefas, kanban, daily, processos, biblioteca
- **Tax/Fiscal** — `equipe/tax/`: projetos, tarefas, clientes, cadastros, auditoria
- **OSG** — `equipe/osg/`: dashboard, auditoria
- **Board** — `equipe/board/`: dashboard
- **Dev** — `equipe/dev/`: EFD, XMLs, PERDCOMP, Selic, IBS/CBS, balancetes, auditoria fiscal, gestão de clientes
- **Gestão** — `gestao/`: novidades, chamados, contatos, acessos
- **Administração** — `administracao/`: usuários, acessos, performance
- **Desempenho** — `gerencial/desempenho/`: ciclos, metas, feedbacks, reuniões 1a1, evolução, relatórios

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn-ui (tokens semânticos em `index.css` + `tailwind.config.ts`) |
| Roteamento | react-router-dom v6 |
| Estado servidor | @tanstack/react-query |
| Backend | Lovable Cloud (Supabase): Postgres + Auth + Storage + Edge Functions (Deno) |
| Gráficos | recharts |
| Planilhas | xlsx |
| Animações | framer-motion |
| Datas | date-fns |
| Validação | zod + react-hook-form |

---

## 3. Arquitetura de Front-end

### 3.1 Estrutura de diretórios

```
src/
├── pages/           → Páginas por módulo (equipe/, cliente/, admin/, gestao/, administracao/, gerencial/)
├── components/      → Componentes por domínio (equipe/fiscal/, equipe/dev/, ui/, etc.)
├── hooks/           → Custom hooks — ÚNICA camada permitida para data fetching
├── contexts/        → AuthContext — ÚNICO contexto global
├── config/          → api.ts (URLs/ambientes), protectedPages.ts (registro de rotas)
├── lib/             → Utilitários puros (dateUtils, selicCalculator, markdownRenderer, diffUtils, etc.)
├── types/           → Tipos de domínio (workPackage, efd, difal, ibscbs, clientForm, correcoesSped)
├── constants/       → brandColors, efdConfig, exportConfig, devNavLabels
└── integrations/    → Cliente Supabase (auto-gerado, NÃO EDITAR)
```

### 3.2 Padrão de Data Fetching

**Regra**: toda query/mutation Supabase DEVE residir em um custom hook dentro de `src/hooks/`.

**Catálogo de hooks existentes:**

| Hook | Propósito |
|---|---|
| `useEFDData` | Busca e filtra dados de EFD Contribuições/ICMS |
| `useFiscalTasks` | CRUD de tarefas fiscais com filtros e paginação |
| `useWorkPackages` | Gestão de work packages (projetos) |
| `useMyWorkPackages` | Work packages do usuário logado |
| `useSelicData` | Dados da taxa Selic |
| `useSelicDataPerPer` | Selic por período de PER |
| `useExportProfiles` | Perfis de exportação salvos |
| `useDraftPersistence` | Persistência de rascunhos em localStorage |
| `useAuditLog` | Registro de ações em audit_logs |
| `useTicketNotifications` | Notificações de chamados |
| `useCanAssignTickets` | Verifica permissão de atribuição de chamados |
| `usePageAccess` | Verifica acesso do usuário a uma página |
| `useUserEstrutura` | Dados organizacionais do usuário (área, equipe, cluster) |
| `useSyncProtectedPages` | Sincroniza protectedPages.ts com banco |
| `useApiAuth` | Autenticação para API externa (GCP Cloud Run) |
| `useClientEditData` | Carrega dados do cliente para edição + retorna `originalSnapshot` para diff de auditoria |
| `useSaveClientTransaction` | Salva cliente (cliente, contribuintes, representantes, OS) com auditoria granular |
| `useCorrecoesSped` | Correções de registros EFD (C170, A170, D100, F100) com sync local/remoto |
| `useDevClients` | Lista clientes e contribuintes filtrados por ambiente |
| `useFiscalClients` | Lista clientes fiscais com filtros |
| `useOrgProjects` | Projetos organizacionais (org_projects + org_project_members) |
| `useCiclosAvaliacao` | Ciclos de avaliação de desempenho |
| `useMetasDesempenho` | Metas individuais dentro de ciclos |
| `useFeedbacksDesempenho` | Feedbacks 360° entre membros |
| `useReunioes1a1` | Reuniões 1:1 líder-membro |
| `useMinhaEvolucao` | Evolução pessoal do usuário logado |
| `useProcedimentos` | CRUD de procedimentos dev |
| `useRegrasNCM` | Regras PIS/COFINS por NCM |
| `usePisCofinsApuracao` | Apuração PIS/COFINS |
| `useEstruturaManager` | CRUD completo da estrutura organizacional |
| `useCategorias` | Categorias de serviços/produtos |
| `useServicosContratados` | Serviços contratados por clientes |
| `usePerformanceData` | Dados de performance para dashboards |
| `useClusterIdByPageCategory` | Resolve `cluster_id` a partir de `page_categories` das áreas (em `useTaxReferenceData.ts`) |
| `useTeamMembersForTasks` | Filtra membros por cluster para seletores de tarefas (em `useTaxReferenceData.ts`) |
| `useExternalClients` | Clientes externos para projetos (em `useTaxReferenceData.ts`) |
| `useContribuintes` | Contribuintes filtrados por cliente (em `useTaxReferenceData.ts`) |
| `useFiscalDashProjects` | Projetos para dashboard fiscal (em `useFiscalDashboardData.ts`) |
| `useFiscalDashTasks` | Tarefas para dashboard fiscal (em `useFiscalDashboardData.ts`) |
| `useClientesLista` | Lista simples de clientes para dropdown (em `useGestaoClientes.ts`) |
| `useClientesFiltrados` | Clientes com filtros + enriquecimento de clusters (em `useGestaoClientes.ts`) |
| `useContribuintesPorCliente` | Contribuintes por cliente para filtro (em `useGestaoClientes.ts`) |
| `useContribuintesExpand` | Contribuintes expandidos na tabela (em `useGestaoClientes.ts`) |
| `useDeleteCliente` | Soft-delete de cliente com invalidação de cache (em `useDeleteCliente.ts`) |
| `useSetoresCliente` | Lista de setores de cliente (em `useSetorCliente.ts`) |

> **Regra estrita**: nenhuma query `supabase.from()` diretamente em componentes. Migração completa para hooks dedicados.

### 3.3 Layouts por módulo

Cada módulo possui layout dedicado com sidebar/nav próprio:
`FiscalLayout`, `DevLayout`, `EquipeLayout`, `AdminLayout`, `GestaoLayout`, `OsgLayout`, `BoardLayout`, `FixosLayout`, `ProjetosLayout`.

### 3.4 Componentes UI

- Fonte única: `src/components/ui/` (shadcn-ui)
- Feedback: `useToast` (`src/hooks/use-toast.ts`) ou `sonner` — nunca `alert()`
- Cores: sempre tokens semânticos do design system (HSL via CSS variables). Nunca hardcoded.

---

## 4. Roteamento e Controle de Acesso (Frontend)

### 4.1 Guardas de rota

| Componente | Regra |
|---|---|
| `ProtectedRoute` | Qualquer usuário autenticado |
| `AdminRoute` | Role `admin` |
| `TeamRoute` | Qualquer "Internal User": `team_member`, `admin`, `lider` ou `sublider` |
| `PageAccessGate` | Verificação granular via `user_page_access` + categoria de área |
| `GestaoAccessGate` | Admin ou permissão explícita de gestão |
| `DesempenhoAccessGate` | Admin, líder ou sublíder para módulo de desempenho |

### 4.2 Registro de páginas protegidas

Arquivo: `src/config/protectedPages.ts`

**Toda nova rota protegida DEVE ser registrada neste array.** Sem registro, a rota não aparece no controle de permissões.

Categorias disponíveis: `dev`, `rotina`, `gestao`, `geral`, `fiscal`, `fixos`, `osg`, `projetos`, `board`, `tax`.

Campos por registro: `page_path`, `page_name`, `page_description`, `category`, `requires_admin`, `requires_team_member`.

---

## 5. Sistema de Autenticação e Autorização

### 5.1 AuthContext (`src/contexts/AuthContext.tsx`)

**Estados expostos**: `user`, `session`, `isAdmin`, `isTeamMember`, `isLider`, `isSublider`, `mustChangePassword`, `loading`.

**Comportamento por evento:**
- `TOKEN_REFRESHED` → atualiza session apenas, NÃO re-verifica roles (evita remount da árvore inteira)
- `SIGNED_IN` → re-verifica roles apenas se userId mudou ou roles nunca foram verificadas
- `SIGNED_OUT` → limpa todo estado local + localStorage

**`checkRoles()`**: consulta `user_roles` e seta flags booleanas.

### 5.2 Hierarquia de papéis (`app_role` enum)

| Role | Escopo |
|---|---|
| `admin` | Acesso total a todos os módulos e dados |
| `lider` | Líder Geral — visibilidade global, criação de projetos/tarefas em qualquer área |
| `sublider` | Sublíder — visibilidade restrita à sua área/equipe |
| `team_member` | Membro — operação dentro de projetos/tarefas atribuídos |
| `client` | Cliente externo — portal do cliente |
| `timecliente` | Time do cliente — acesso delegado pelo cliente |

Roles são armazenadas **exclusivamente** em `public.user_roles` (tabela separada, nunca em `profiles`).

### 5.3 Estrutura organizacional

```
Clusters → Áreas → Equipes → Membros
                 → Líderes (1:1 via estrutura_area_lideres)
```

**Tabelas:**
- `estrutura_clusters` — agrupamento de áreas (empresa_id → empresas_faturamento)
- `estrutura_areas` — áreas de atuação (cluster_id, page_categories[], cost_center_id, color)
- `estrutura_equipes` — equipes dentro de áreas (area_id, sublider_id)
- `estrutura_equipe_membros` — membros de equipes (equipe_id, user_id)
- `estrutura_area_lideres` — líder por área (area_id, user_id; relação 1:1)

**Conexão Tax ↔ Estrutura:**
`tax_areas.estrutura_area_id` → `estrutura_areas.id` (FK, ON DELETE SET NULL)

- `cliente_clusters` — associação N:N entre `cliente` e `estrutura_clusters`

Caminho de joins: `org_projects` → `tax_areas` → `estrutura_areas` → `estrutura_equipes` → `estrutura_equipe_membros` / `estrutura_area_lideres`.

---

## 6. Arquitetura de Back-end (Banco de Dados)

### 6.1 Princípios

- **RLS obrigatório** em toda tabela com dados de usuário
- `user_id` referencia `profiles.id`, nunca `auth.users.id` diretamente em FK
- Roles em `user_roles`, checadas via `has_role(uuid, app_role)` — função SECURITY DEFINER
- Membership de projetos checada via `is_project_member(uuid, uuid)` — função SECURITY DEFINER
- Atribuição de chamados checada via `is_ticket_assigned_to(uuid, uuid)` — função SECURITY DEFINER (evita recursão RLS)
- Nunca `CHECK` com `now()`; usar triggers de validação

### 6.2 Tabelas-chave por domínio

**Auth/Org:**
`profiles`, `user_roles`, `user_page_access`, `page_permissions`, `access_change_log`, `gestao_area_password`, `estrutura_clusters`, `estrutura_areas`, `estrutura_equipes`, `estrutura_equipe_membros`, `estrutura_area_lideres`, `user_invitations` (criada, sem frontend)

**Tax/Fiscal:**
`org_projects`, `org_project_members`, `tax_areas`, `area_servicos`, `servicos_prestados`, `fiscal_tasks`, `fiscal_task_comments`, `catalog_clients`, `audit_logs`

**Chamados:**
`tickets` (colunas notáveis: `deadline`, `cliente_id` → `cliente`, `estrutura_area_id` → `estrutura_areas`), `ticket_messages`, `ticket_attachments` (inferido), `documents`

**Dev/Tributário:**
`cliente` (col `ambiente`: `'prod'`|`'dev'`), `contribuinte` (col `ambiente`: `'prod'`|`'dev'`), `representante`, `ordem_servico`, `os_produtos_contratados` (N:N com `horas_contratadas`), `distribuicao_receita`, `inscricao_contribuinte`, `per`, `per_situacao`, `dcomp`, `contribuinte_bal_config`, `difal_sessao`, `difal_decisao`, `export_profiles`, `efd_correcoes`

**Projetos organizacionais:**
`org_projects`, `org_project_members`

**Projetos/Sprints:**
`projects`, `sprints`, `sprint_deliverables`, `deliverable_attachments`, `daily_standups`, `routines`, `demand_items`, `processes`, `process_stages`, `sops`, `process_improvements`, `improvement_savings_details`, `improvement_team_members`

**Visibilidade cliente:**
`client_visible_projects`, `client_documents`

**Cadastros organizacionais:**
`empresas_faturamento`, `centros_custo`, `produto_segmento`, `setor_cliente`, `cliente_clusters` (N:N cliente↔cluster)

**Contatos:**
`contatos`

**Desempenho:**
`ciclos_avaliacao`, `metas`, `atualizacoes_meta`, `kpis_meta`, `feedbacks`, `comentarios_avaliacao`, `reunioes_1a1`, `analises_semestrais`, `ppr_regras`

### 6.3 Nomenclatura: participante vs representante

- **Cadastro de clientes**: A tabela no banco é `representante` (renomeada de `participante`). No frontend: `DraftRepresentante`, `tipo_representante`. O alias `DraftParticipant` existe como deprecated.
- **SPED fiscal** (`efdConfig.ts`): "Participante" é termo do layout fiscal oficial. NÃO renomear.

### 6.4 Ambientes dev vs prod

Detecção automática em `src/config/api.ts` via `window.location.hostname`.

| Hostname | Ambiente | API URL |
|---|---|---|
| `psa-consultores.lovable.app`, `psaconsultores.com.br` | prod | `psa-backend-api-1010211821554...` |
| Outros (preview Lovable) | dev | `psa-backend-api-456879351254...` |

**Separação de dados por ambiente (coluna `ambiente`):**
- Tabelas `cliente` e `contribuinte` possuem coluna `ambiente` com valores `'prod'` | `'dev'` (default `'prod'`).
- `src/config/api.ts` exporta `currentAmbiente: Ambiente` (tipo `'prod' | 'dev'`), selecionado automaticamente via `isProductionEnvironment`.
- Todas as queries nessas tabelas DEVEM filtrar via `.eq('ambiente', currentAmbiente)`. Aplica-se também a `ordem_servico`, `representante` e `inscricao_contribuinte`.
- `GerenciarDados.tsx` permite toggle manual entre ambientes para operações administrativas.

### 6.5 Convenções de dados adicionais

- **Horas estimadas em tarefas**: `fiscal_tasks.estimated_hours` é obrigatório no formulário de tarefas.
- **Prazo de chamados**: usar `tickets.deadline` real do banco. Fallback: 5 dias úteis a partir da criação se `deadline` for null.
- **Soft-delete**: tabelas `cliente`, `contribuinte`, `representante`, `ordem_servico` usam coluna `excluido` (boolean). Queries DEVEM filtrar `.eq('excluido', false)`.

---

## 7. Edge Functions (`supabase/functions/`)

### 7.1 Inventário

| Função | Propósito |
|---|---|
| `calculate-process-roi` | Cálculo de ROI de melhorias em processos |
| `check-ticket-deadlines` | Verificação de prazos de chamados (cron-like) |
| `create-team-member` | Criação de membro da equipe (signup + role) |
| `delete-team-member` | Exclusão de membro da equipe |
| `dw-query` | Consultas ao Data Warehouse externo (GCP) |
| `get-user-last-access` | Último acesso de um usuário |
| `notify-ticket` | Notificações de chamados (email/push) |
| `processar-procedimento` | Processamento de procedimentos via IA |
| `restructure-novidade` | Reestruturação de novidades via IA |
| `restructure-process` | Reestruturação de processos via IA |
| `sync-cadastros` | Sincronização de cadastros com DW |
| `sync-perdcomp` | Sincronização de PERDCOMP com DW |
| `gerar-sintese-executiva` | Síntese executiva de desempenho via IA |
| `gerar-recomendacoes-pessoas` | Recomendações de gestão de pessoas via IA |
| `gerar-relatorio-individual` | Relatório individual de desempenho via IA |

### 7.2 Regras de implementação

- Todas com `verify_jwt = false` em `config.toml` — validação de JWT manual obrigatória no código
- Padrão: extrair `Authorization` header → `supabase.auth.getUser(token)` → validar
- CORS: tratar `OPTIONS` separadamente retornando headers adequados
- Secrets configurados via Lovable Cloud (nunca hardcoded)

---

## 8. Trilha de Auditoria

### 8.1 Hook `useAuditLog`

```typescript
interface AuditLogEntry {
  area: 'tax' | 'osg' | 'estrutura' | 'cadastros' | 'dev';
  entity_type: 'project' | 'task' | 'subtask'
    | 'cluster' | 'area' | 'equipe' | 'membro' | 'lider'
    | 'produto_segmento' | 'servico' | 'centro_custo' | 'empresa'
    | 'cliente' | 'contribuinte' | 'representante' | 'ordem_servico'
    | 'regra_pis_cofins' | 'procedimento'
    | 'ciclo_avaliacao' | 'meta' | 'kpi_meta' | 'feedback' | 'reuniao_1a1' | 'analise_semestral';
  entity_id: string;
  entity_name: string;
  action: 'created' | 'updated' | 'deleted';
  changed_fields?: Record<string, { old: unknown; new: unknown }>;
  details?: string;
}
```

`performed_by` = `auth.uid()` (preenchido automaticamente pelo hook).

### 8.2 Uso obrigatório

Toda operação de **criação**, **edição** ou **exclusão** DEVE chamar `logAction()` com diff de campos alterados (`changed_fields`).

**Auditoria granular de cadastro de clientes:**
- `useSaveClientTransaction` compara o draft com `originalSnapshot` (snapshot dos dados carregados do banco, capturado por `useClientEditData`)
- Usa `computeFieldDiff` e `computeEntityListDiff` de `src/lib/diffUtils.ts` para gerar diffs campo-a-campo
- Formato: `{ campo: { old: valorAnterior, new: valorNovo } }`
- Para criações: `old = null`, `new = valor`
- Para exclusões: registra `action: 'deleted'` com `entity_name` do snapshot original

### 8.3 Utilitário de diff (`src/lib/diffUtils.ts`)

```typescript
computeFieldDiff(oldObj, newObj, fieldsToCompare) → Record<string, { old, new }>
computeEntityListDiff(oldList, newList, dbIdField, fieldsToCompare) → { entityId, diff }[]
```

### 8.4 Formatação de campos (`auditFieldFormatter.ts`)

- `FIELD_LABELS` — traduz nomes internos para português (ex: `setor_cliente` → "Área do Negócio")
- `BOOLEAN_FIELDS` — campos booleanos formatados como "Sim"/"Não" (inclui `ativo`, `acesso_chamados`, `contribuinte_faturamento`, `simples_nacional`, `fixo`)
- `UUID_FIELDS` — resolve UUIDs para nomes legíveis via lookup maps
- `formatChangedFields()` — transforma o diff bruto em lista de `{ label, oldValue, newValue }` para exibição

### 8.5 Visualização

- `/equipe/tax/auditoria` — logs do módulo Tax
- `/equipe/osg/auditoria` — logs do módulo OSG
- Aba "Histórico" no modal de cliente — logs de cadastro
- Componente: `AuditLogTable` com formatação de campos via `auditFieldFormatter.ts`

---

## 9. Roteamento de Chamados por Cluster

### 9.1 Fluxo de criação (CreateTicketDialog.tsx)

O formulário de criação de chamados pela gestão segue o fluxo:

1. **Usuário** — select de profiles com role `client` → grava `tickets.user_id`
2. **Empresa** — select da tabela `cliente` (filtro `ativo=true`, `excluido=false`, `ambiente=currentAmbiente`) → grava `tickets.cliente_id`
3. **Área** — ao selecionar empresa, busca clusters via `cliente_clusters` → filtra `estrutura_areas` por `cluster_id IN (clusters)` → grava `tickets.estrutura_area_id`. Se empresa sem clusters, mostra todas as áreas ativas (fallback). Auto-seleciona se houver 1 área só.
4. **Assunto** — select hardcoded (ICMS/IPI, PIS/COFINS, etc.) → grava `tickets.department`. É classificação do tema, **não** roteamento.

> **TODO pendente**: Quando `representante.user_id` estiver preenchido, filtrar empresas pelo vínculo representante → cliente (Ação 4 do plano de cadastros).

### 9.2 Campos obrigatórios no submit

`user_id`, `cliente_id`, `estrutura_area_id`, `title`, `description`. `department` e `priority` são opcionais.

---

## 10. Integrações Externas

### 9.1 API Backend (GCP Cloud Run)

Dois ambientes com URLs distintas (ver seção 6.4). Autenticação via `useApiAuth` hook que injeta token JWT do Supabase nos headers.

### 9.2 Sincronização com Data Warehouse

Fire-and-forget via Edge Functions (`sync-perdcomp`, `sync-cadastros`). Token de autenticação: secret `DW_SYNC_TOKEN`. Lib auxiliar: `src/lib/syncPerdcomp.ts`.

---

## 11. Tipos de Domínio (`src/types/`)

| Arquivo | Conteúdo |
|---|---|
| `clientForm.ts` | `DraftEntity`, `DraftRepresentante`, `DraftOrdemServico`, `DraftProdutoContratado`, `InscricaoIE`, `NewClientModalProps` |
| `workPackage.ts` | Tipos de work packages (projetos) |
| `efd.ts` | Tipos de EFD Contribuições |
| `correcoesSped.ts` | Tipos de correções SPED (C170, A170, D100, F100) |
| `pisCofins.ts` | Tipos de apuração PIS/COFINS |
| `difal.ts` | Tipos de DIFAL |
| `ibscbs.ts` | Tipos de IBS/CBS |
| `efdcIcms.ts` | Tipos de EFD ICMS |
| `efdcXml.ts` | Tipos de cruzamento EFD x XML |
| `auditoriaCruzada.ts` | Tipos de auditoria cruzada |
