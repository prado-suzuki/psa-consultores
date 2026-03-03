
# Integração Estrutura → Módulos (Migrar e Deprecar)

## ✅ Concluído

### 1. Migration SQL
- Coluna `estrutura_area_id` (UUID, nullable, FK → `estrutura_areas`) adicionada em `catalog_clients`

### 2. Hook `useUserEstrutura`
- `src/hooks/useUserEstrutura.ts` — resolve equipes, áreas e clusters do usuário logado via `estrutura_equipe_membros`

### 3. UI — Mapeamento no Controle de Acessos
- Select "Vincular à Estrutura Organizacional" no dialog de criar/editar área interna (`catalog_clients`)
- Admin faz o mapeamento uma vez por área

### 4. Acesso automático por membership
- Coluna `page_categories text[]` em `estrutura_areas`
- `usePageAccess.ts` verifica membership na estrutura + categoria da página
- UI multi-select de categorias no form de área (EstruturaManager)
- Categoria `geral` → qualquer team_member tem acesso automático
- Chamados: membros veem apenas os atribuídos a eles (filtro existente)

## Próximas etapas (fora de escopo)
- Usar `useUserEstrutura` nos dashboards para filtro automático por área/cluster
- Substituir referências diretas a `catalog_clients` nos outros módulos
