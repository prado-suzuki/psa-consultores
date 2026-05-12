
# Coluna "Área" puxando de estrutura_equipes (e limpeza de fontes legadas)

A coluna/filtro "Área" em `/equipe/projetos` (e variantes em `/equipe/processos`) hoje vem de fontes erradas: lista hardcoded `PROJECT_AREAS`, regex `extractArea(description)` e `catalog_clients.name`. Vamos centralizar tudo em `estrutura_equipes` + `estrutura_areas` (mesma fonte de `/equipe/acessos`).

## 1. Banco

Migration única:
- `ALTER TABLE projects ADD COLUMN equipe_id uuid REFERENCES estrutura_equipes(id)` (nullable).
- Índice em `projects.equipe_id`.
- Trigger `BEFORE INSERT/UPDATE` em `projects`: quando `equipe_id` for setado, popular `projects.area` (cache) com `estrutura_areas.name` correspondente. Mantém `projects.area` apenas como cache derivado.
- Backfill (via insert tool, não migration): casar `projects.area` antigo (`'fiscal'`, `'transversal'`, etc.) com `estrutura_areas.name` (`'Área Fiscal'`, etc.) por `LIKE`. Sem match → `equipe_id` fica NULL e o usuário ajusta na UI.

`processes.equipe_id` já existe e já está parcialmente preenchido — nenhuma mudança de schema lá.

## 2. `/equipe/projetos` — `EquipeProjetos.tsx`

Trocar/remover:
- ❌ `const PROJECT_AREAS` (linha 109) → remover.
- ❌ `extractArea(description)` (linha 152) e `extractAreaFromCliente` (306) → remover (não vamos mais ler área de regex em `description`).
- ❌ `getAreaBadge` / `getAreaBadgeFromClient` baseados em mapa de cores hardcoded (linhas 873-899) → substituir por badge único usando token do design system; nome da área vem do join.
- ❌ Selects de área no "Novo Projeto" (linha 1035) e "Editar Projeto" (1503) → trocar por **select de Equipe** alimentado por `useEstruturaEquipes`, agrupado por `estrutura_areas.name` (igual ao que `CreateProcessModal` já faz).
- ❌ Filtro "Todas as áreas" (linha 1227) → passar a listar `estrutura_areas` (9 áreas reais).
- ❌ Coluna Área das tabelas (linhas 1291, 1341, 1658) → exibir `project.equipe.area.name` via join, com fallback para `projects.area` (cache) quando `equipe_id` for NULL.
- ❌ Drawer "Adicionar processo" embutido nessa página: já grava `processes.area` como texto livre — trocar para `equipe_id` (mesma fonte do select novo).

Mapear estado:
- `newProject.area` / `editProject.area` → `equipe_id` (uuid). `area` continua sendo gravado pelo trigger automaticamente.

## 3. `/equipe/processos` — `EquipeProcessos.tsx`

- ❌ `extractAreaFromCliente` (linha 241, 284) → remover (resíduo do importer CSV).
- ❌ Filtro `areaFilter` (linhas 166, 685, 883) que hoje compara com `clientName` (catalog_clients) → trocar para listar áreas de `estrutura_areas` e filtrar por `processes.equipe.area_id`.
- A criação via `CreateProcessModal` já usa `equipe_id` correto — nada a fazer ali.

## 4. Hook compartilhado

Reuso de `useEstruturaEquipes` (já existe em `src/hooks/`). Se ainda não retorna agrupado por área, criar `useEstruturaEquipesAgrupadas` que devolve `{ areaId, areaName, equipes: [{id, name}] }[]` para alimentar os selects.

## 5. Tipos

`src/integrations/supabase/types.ts` regenerado automaticamente após a migration (campo `projects.equipe_id` aparece). Nenhuma edição manual.

## Fora do escopo desta rodada

- `processes.area` text continua existindo como cache (já é populado parcialmente). Deprecação fica para outra leva.
- `org_projects` não é tocado.
- `catalog_clients` não é renomeado/removido.
- `generate_process_code()` segue derivando sigla de `catalog_clients` — ok.
- `EquipeDashboard`, `BoardDashboard`, `ImpactDashboard`, `usePerformanceData`, `useAuditLog` usam `.area` mas em contextos não relacionados a esta troca (auditoria, dashboards agregados) — não mexer agora.

## Resumo das remoções

| Arquivo | Remover/Trocar |
|---|---|
| `EquipeProjetos.tsx` | `PROJECT_AREAS`, `extractArea`, `extractAreaFromCliente`, `getAreaBadge*` hardcoded, 2 selects de área, filtro |
| `EquipeProcessos.tsx` | `extractAreaFromCliente`, filtro `areaFilter` baseado em catalog_clients |
| `projects` (DB) | +`equipe_id`, +trigger sync `area` |

Após aprovação: rodo a migration, faço o backfill via insert tool, edito os 2 arquivos, e valido na preview.
