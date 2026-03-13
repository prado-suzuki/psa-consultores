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
>
> ### Obrigações absolutas
> - **SEMPRE** usar `useToast` ou `sonner` para feedback ao usuário.
> - **SEMPRE** registrar operações CUD (Create/Update/Delete) em projetos e tarefas via `useAuditLog`.
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
├── pages/           → Páginas por módulo (equipe/, cliente/, admin/, gestao/, administracao/)
├── components/      → Componentes por domínio (equipe/fiscal/, equipe/dev/, ui/, etc.)
│   └── equipe/fiscal/client-form/  → Abas e utilitários do NewClientModal (ver 3.5)
├── hooks/           → Custom hooks — ÚNICA camada permitida para data fetching
├── contexts/        → AuthContext — ÚNICO contexto global
├── config/          → api.ts (URLs/ambientes), protectedPages.ts (registro de rotas)
├── lib/             → Utilitários puros (dateUtils, selicCalculator, markdownRenderer, etc.)
├── types/           → Tipos de domínio (workPackage, efd, difal, ibscbs, clientForm)
├── constants/       → brandColors, efdConfig, exportConfig
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
| `useTaxAreas` | Áreas organizacionais com category 'tax' (consulta `estrutura_areas`) |
| `useTaxProjects` | CRUD de projetos fiscais (JOIN com `estrutura_areas` via `estrutura_area_id`) |
| `useTaxReferenceData` | Dados de referência para módulo Tax |
| `useEstruturaArea` | Gestão de áreas organizacionais |
| `useEstruturaManager` | Gestão completa da estrutura organizacional |
| `useCategorias` | Gestão de serviços prestados (catálogo) |
| `useServicosContratados` | Serviços contratados por cliente |
| `useFiscalClients` | Clientes do módulo fiscal |
| `useDevClients` | Clientes do módulo Dev |
| `useClientFormOptions` | Opções de formulário de clientes (líderes, serviços, clusters, centros de custo) |
| `useClientEditData` | Carrega dados existentes de cliente para edição |
| `useExternalConsults` | Consultas externas (BrasilAPI CNPJ, ViaCEP) |
| `useSaveClientTransaction` | Persistência transacional de cliente (upsert contribuintes, participantes, OS) |

> **Exceções toleradas**: queries inline com `useQuery` em páginas de listagem simples. Migração gradual para hooks dedicados.

### 3.3 Layouts por módulo

Cada módulo possui layout dedicado com sidebar/nav próprio:
`FiscalLayout`, `DevLayout`, `EquipeLayout`, `AdminLayout`, `GestaoLayout`, `OsgLayout`, `BoardLayout`, `FixosLayout`, `ProjetosLayout`.

### 3.4 Componentes UI

- Fonte única: `src/components/ui/` (shadcn-ui)
- Feedback: `useToast` (`src/hooks/use-toast.ts`) ou `sonner` — nunca `alert()`
- Cores: sempre tokens semânticos do design system (HSL via CSS variables). Nunca hardcoded.

### 3.5 Componentes client-form

Pasta `src/components/equipe/fiscal/client-form/` — módulos isolados do `NewClientModal`:

| Arquivo | Propósito |
|---|---|
| `constants.ts` | Máscaras de formatação (CPF/CNPJ, CEP, telefone), formatação BRL, opções de dropdown |
| `DateFieldWithInput.tsx` | Input de data com máscara dd/mm/aaaa |
| `CurrencyField.tsx` | Input monetário BRL (centavos → valor formatado) |
| `ClienteTab.tsx` | Aba dados do cliente (nome, setor, região, UF, telefone) |
| `ContribuintesTab.tsx` | Aba contribuintes com lista expansível, edição inline, gestão de IE |
| `ParticipantesTab.tsx` | Aba participantes com formulário de criação, edição inline |
| `ContratosTab.tsx` | Aba contratos/OS com seleção de serviço agrupada, distribuição de receita |
| `FaturamentoTab.tsx` | Aba faturamento (em desenvolvimento — Fase 6.3) |

Todos os componentes de aba recebem estados de rascunho (drafts) e handlers do `NewClientModal` via props, mantendo o estado no nível do orquestrador.

### 3.6 Refatoração NewClientModal (status)

| Fase | Descrição | Status |
|---|---|---|
| 1 | `useAuditLog` expandido + `confirm()` → `AlertDialog` | ✅ |
| 2 | Extrair dicionários para `useClientFormOptions` | ✅ |
| 3 | Extrair loadData para `useClientEditData` | ✅ |
| 4 | Extrair consultas externas (CNPJ/CEP) para `useExternalConsults` | ✅ |
| 5 | Extrair executeSave para `useSaveClientTransaction` | ✅ |
| 6.1–6.2 | Extrair abas Participantes + Contribuintes | ✅ |
| 6.3 | Extrair aba Faturamento | 🔄 Em execução |

---

## 4. Roteamento e Controle de Acesso (Frontend)

### 4.1 Guardas de rota

| Componente | Regra |
|---|---|
| `ProtectedRoute` | Qualquer usuário autenticado |
| `AdminRoute` | Role `admin` |
| `TeamRoute` | Role `team_member` ou `admin` |
| `PageAccessGate` | Verificação granular via `user_page_access` + categoria de área |
| `GestaoAccessGate` | Admin ou permissão explícita de gestão |

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

```
tax_projects.estrutura_area_id → estrutura_areas.id (FK direta)
area_servicos.estrutura_area_id → estrutura_areas.id (FK direta)
Caminho de joins: tax_projects → estrutura_areas → estrutura_equipes → estrutura_equipe_membros / estrutura_area_lideres
```

> **Nota**: a tabela `tax_areas` ainda existe como backup (colunas `area_id` legadas preservadas). Fase 5 (drop `tax_areas`) pendente.

---

## 6. Arquitetura de Back-end (Banco de Dados)

### 6.1 Princípios

- **RLS obrigatório** em toda tabela com dados de usuário
- `user_id` referencia `profiles.id`, nunca `auth.users.id` diretamente em FK
- Roles em `user_roles`, checadas via `has_role(uuid, app_role)` — função SECURITY DEFINER
- Membership de projetos checada via `is_project_member(uuid, uuid)` — função SECURITY DEFINER
- Membership de áreas checada via `is_area_member(uuid, uuid)` — função SECURITY DEFINER
- Nunca `CHECK` com `now()`; usar triggers de validação

### 6.2 Tabelas-chave por domínio

**Auth/Org:**
`profiles`, `user_roles`, `user_page_access`, `page_permissions`, `access_change_log`, `gestao_area_password`, `estrutura_clusters`, `estrutura_areas`, `estrutura_equipes`, `estrutura_equipe_membros`, `estrutura_area_lideres`

**Tax/Fiscal:**
`tax_projects`, `tax_project_members`, `fiscal_tasks`, `fiscal_task_comments`, `catalog_clients`, `audit_logs`
> Legado: `tax_areas` (preservada como backup — Fase 5 pendente)

**Cadastros de serviços:**
`servicos_prestados` (ex-`tax_categorias`), `area_servicos` (ex-`tax_area_categorias`), `project_servicos` (ex-`tax_project_categorias`), `produto_segmento`
> Renomeações aplicadas: `categoria_id` → `servico_id` em `fiscal_tasks` e `area_servicos`

**Chamados:**
`tickets`, `ticket_messages`, `ticket_attachments` (inferido), `documents`

**Dev/Tributário:**
`cliente` / `cliente_dev`, `contribuinte` / `contribuinte_dev`, `contrato` / `contrato_dev`, `per`, `per_situacao` (inferido), `dcomp`, `contribuinte_bal_config`, `difal_sessao`, `difal_decisao`, `export_profiles`

**Projetos/Sprints:**
`projects`, `sprints`, `sprint_deliverables`, `deliverable_attachments`, `daily_standups`, `routines`, `demand_items`, `processes`, `process_stages` (inferido), `sops` (inferido), `process_improvements`, `improvement_savings_details`, `improvement_team_members` (inferido)

**Visibilidade cliente:**
`client_visible_projects`, `client_documents`

**Cadastros organizacionais:**
`empresas_faturamento`, `centros_custo`

**Contatos:**
`contatos`

### 6.3 Ambientes dev vs prod

Detecção automática em `src/config/api.ts` via `window.location.hostname`.

| Hostname | Ambiente | API URL |
|---|---|---|
| `psa-consultores.lovable.app`, `psaconsultores.com.br` | prod | `psa-backend-api-1010211821554...` |
| Outros (preview Lovable) | dev | `psa-backend-api-456879351254...` |

Tabelas com sufixo `_dev` para desenvolvimento: `cliente_dev`, `contribuinte_dev`, `contrato_dev`. Mapeamento em `TABLE_NAMES` de `api.ts`.

### 6.4 Migração tax_areas → estrutura_areas (status)

| Fase | Descrição | Status |
|---|---|---|
| 1 | Adicionar `estrutura_area_id` em `tax_projects` + `area_servicos` com FK | ✅ |
| 2 | Migrar dados (`area_id` → `estrutura_area_id` via lookup) | ✅ |
| 3 | Frontend: substituir `tax_areas` por `estrutura_areas` em hooks e componentes | ✅ |
| 4 | Simplificar RLS policies (remover JOIN com `tax_areas`) | ✅ |
| 5 | Drop `tax_areas` e colunas `area_id` legadas | ⏳ Pendente |

**Arquivos frontend atualizados (Fase 3):** `useTaxAreas`, `useTaxProjects`, `FiscalDashboard`, `FiscalProjetosCadastro`, `TaskModal`, `AuditLogTable`, `auditFieldFormatter`.

**RLS simplificadas (Fase 4):** policies de `tax_projects` e `fiscal_tasks` usam `estrutura_area_id` direto, sem JOIN com `tax_areas`.

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
| `restructure-novidade` | Reestruturação de novidades via IA |
| `restructure-process` | Reestruturação de processos via IA |
| `sync-cadastros` | Sincronização de cadastros com DW |
| `sync-perdcomp` | Sincronização de PERDCOMP com DW |

### 7.2 Regras de implementação

- Todas com `verify_jwt = false` em `config.toml` — validação de JWT manual obrigatória no código
- Padrão: extrair `Authorization` header → `supabase.auth.getUser(token)` → validar
- CORS: tratar `OPTIONS` separadamente retornando headers adequados
- Secrets configurados via Lovable Cloud (nunca hardcoded)

---

## 8. Trilha de Auditoria

### 8.1 Hook `useAuditLog`

```typescript
type AuditArea = 'tax' | 'osg' | 'estrutura' | 'cadastros' | 'dev';

type AuditEntityType =
  | 'project' | 'task' | 'subtask'
  | 'cluster' | 'area' | 'equipe' | 'membro' | 'lider'
  | 'produto_segmento' | 'servico' | 'centro_custo' | 'empresa'
  | 'cliente' | 'contribuinte' | 'participante' | 'ordem_servico';

interface AuditLogEntry {
  area: AuditArea;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name: string;
  action: 'created' | 'updated' | 'deleted';
  changed_fields?: Record<string, { old: unknown; new: unknown }>;
  details?: string;
}
```

`performed_by` = `auth.uid()` (preenchido automaticamente pelo hook).

### 8.2 Uso obrigatório

Toda operação de **criação**, **edição** ou **exclusão** em projetos (`tax_projects`) e tarefas (`fiscal_tasks`) DEVE chamar `logAction()` com diff de campos alterados.

### 8.3 Visualização

- `/equipe/tax/auditoria` — logs do módulo Tax
- `/equipe/osg/auditoria` — logs do módulo OSG
- Componente: `AuditLogTable` com formatação de campos via `auditFieldFormatter.ts`

---

## 9. Integrações Externas

### 9.1 API Backend (GCP Cloud Run)

Dois ambientes com URLs distintas (ver seção 6.3). Autenticação via `useApiAuth` hook que injeta token JWT do Supabase nos headers.

### 9.2 Sincronização com Data Warehouse

Fire-and-forget via Edge Functions (`sync-perdcomp`, `sync-cadastros`). Token de autenticação: secret `DW_SYNC_TOKEN`. Lib auxiliar: `src/lib/syncPerdcomp.ts`.
