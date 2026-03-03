

# Integração Estrutura → Módulos (sem expor clusters)

## Entendimento

A visão de **cluster é interna/administrativa**. O usuário final continua selecionando **áreas** como já faz hoje. O sistema resolve automaticamente a hierarquia (cluster → área → equipe) pelo vínculo do usuário em `estrutura_equipe_membros`.

## Como funciona

```text
Usuário logado
  └─ estrutura_equipe_membros → sabe qual equipe pertence
       └─ estrutura_equipes.area_id → sabe qual área
            └─ estrutura_areas.cluster_id → sabe qual cluster

Nos módulos (projetos, processos, demandas):
  - Usuário seleciona ÁREA (como já faz via catalog_clients)
  - Sistema resolve cluster/equipe automaticamente
  - Painéis de gestão agrupam por cluster internamente
```

## Alterações

### 1. Migration SQL
Apenas uma coluna ponte:
```sql
ALTER TABLE catalog_clients 
  ADD COLUMN estrutura_area_id UUID REFERENCES estrutura_areas(id) ON DELETE SET NULL;
```
Isso vincula cada área interna legada (`catalog_clients`) à nova `estrutura_areas`. Sem colunas em `projects` — o vínculo é resolvido via `catalog_clients.estrutura_area_id`.

### 2. Hook centralizado: `useUserEstrutura`
Novo hook que, dado o `user.id`, consulta `estrutura_equipe_membros` e resolve automaticamente:
- Quais equipes o usuário pertence
- Quais áreas (via equipe → area)
- Quais clusters (via area → cluster)

Retorna: `{ equipes, areas, clusters, isLoading }`

Isso permite que qualquer módulo saiba a estrutura do usuário sem selects manuais.

### 3. UI — Mapeamento no Controle de Acessos
Na aba "Cadastros Áreas" (`EquipeControleAcessos.tsx`), adicionar um select em cada área interna para vincular à `estrutura_area` correspondente. Apenas admin faz esse mapeamento uma vez.

### 4. Painéis de gestão (uso futuro)
Com o hook `useUserEstrutura` e o mapeamento `catalog_clients → estrutura_areas`, os dashboards poderão filtrar automaticamente por área/cluster sem que o usuário precise selecionar nada extra.

## Arquivos

| Arquivo | Alteração |
|---|---|
| **Migration SQL** | 1 coluna `estrutura_area_id` em `catalog_clients` |
| `src/hooks/useUserEstrutura.ts` | **Novo** — hook de resolução automática |
| `src/pages/equipe/EquipeControleAcessos.tsx` | Select de vinculação no CRUD de áreas |

## Fora de escopo
- Alterar formulários de projetos/processos (continuam usando `catalog_clients` normalmente)
- Permissões de acesso a páginas (próxima etapa)

