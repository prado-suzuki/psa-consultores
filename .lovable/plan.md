

# Cadastro de Estrutura Organizacional

## Contexto Atual

A aba "Cadastros Estrutura" hoje gerencia apenas a tabela `catalog_clients` (áreas internas com nome, líder, cor e status). Precisamos expandir para uma hierarquia completa:

```text
Cluster (ex: "Tributário")
  └── Centro de Custo (ex: "CC-001")
  └── Área (ex: "Fiscal", "OSG", "ADVS")
        └── Líder Responsável (1 usuário com role 'lider')
              └── Sublíder(es) (0..N, opcional)
                    └── Equipe (nome + membros)
```

## 1. Novas Tabelas no Banco de Dados

Serão criadas 5 tabelas para representar a hierarquia:

### `estrutura_clusters`
- `id` UUID PK
- `name` TEXT UNIQUE NOT NULL
- `cost_center` TEXT (centro de custo)
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

### `estrutura_areas`
- `id` UUID PK
- `cluster_id` UUID FK → `estrutura_clusters`
- `name` TEXT NOT NULL
- `color` TEXT
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`
- UNIQUE(`cluster_id`, `name`)

### `estrutura_area_lideres`
- `id` UUID PK
- `area_id` UUID FK → `estrutura_areas`
- `user_id` UUID FK → `profiles(id)` (deve ter role `lider`)
- UNIQUE(`area_id`) — 1 líder por área

### `estrutura_equipes`
- `id` UUID PK
- `area_id` UUID FK → `estrutura_areas`
- `name` TEXT NOT NULL (nome da equipe)
- `sublider_id` UUID FK → `profiles(id)` (nullable — pode não ter sublíder)
- `is_active` BOOLEAN DEFAULT true
- `created_at`

### `estrutura_equipe_membros`
- `id` UUID PK
- `equipe_id` UUID FK → `estrutura_equipes`
- `user_id` UUID FK → `profiles(id)`
- UNIQUE(`equipe_id`, `user_id`)

**RLS**: Leitura para `team_member`, escrita para `admin` e `lider` (usando `has_role`).

## 2. Interface — Substituir conteúdo da aba "Cadastros Estrutura"

O componente será extraído para um arquivo dedicado `src/components/equipe/estrutura/EstruturaManager.tsx` para não sobrecarregar o arquivo de Controle de Acessos.

### Layout da interface

A tela terá uma navegação em árvore/accordion com CRUD inline:

1. **Painel superior**: botão "Novo Cluster" + contadores (clusters, áreas, equipes)
2. **Lista de Clusters** (accordion expansível):
   - Cada cluster mostra nome + centro de custo + botões editar/excluir
   - Ao expandir, mostra suas **Áreas** com botão "Nova Área"
3. **Dentro de cada Área**:
   - Líder Responsável (select de usuários com role `lider`)
   - Lista de **Equipes** com botão "Nova Equipe"
4. **Dentro de cada Equipe**:
   - Nome da equipe + Sublíder (select de usuários)
   - Membros (multi-select de usuários `team_member`)

Cada nível terá um Dialog/modal de criação/edição.

## 3. Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| **Migration SQL** | Criar 5 tabelas + RLS policies |
| `src/components/equipe/estrutura/EstruturaManager.tsx` | Componente principal com toda a UI |
| `src/pages/equipe/EquipeControleAcessos.tsx` | Substituir conteúdo da `TabsContent value="cadastros"` por `<EstruturaManager />` |

## 4. Detalhes técnicos

- Selects de líderes filtrarão `profiles` JOIN `user_roles` WHERE `role = 'lider'`
- Selects de membros filtrarão `profiles` JOIN `user_roles` WHERE `role = 'team_member'`
- A tabela `catalog_clients` existente continuará funcionando para os módulos que já a referenciam (processos, projetos, kanban, sprints) — sem breaking changes
- Futuramente poderá haver uma migração para vincular `catalog_clients` aos clusters, mas isso fica fora deste escopo inicial

