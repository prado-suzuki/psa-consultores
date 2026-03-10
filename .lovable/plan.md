

## Plano: Filtrar responsável pela área do projeto selecionado

### Problema
O dropdown de "Responsável" no TaskModal mostra todos os membros da equipe, sem filtrar pela área do projeto selecionado.

### Alteração em `src/components/equipe/fiscal/tasks/TaskModal.tsx`

1. **Alterar query de projetos** para incluir `area_id`:
   ```ts
   .select('id, name, external_client_id, area_id')
   ```

2. **Nova query: buscar `estrutura_area_id` da `tax_areas`** com base no `area_id` do projeto selecionado:
   ```ts
   const selectedProject = projects.find(p => p.id === watchedProjectId);
   const projectAreaId = selectedProject?.area_id;
   ```
   Query em `tax_areas` para obter `estrutura_area_id` do `area_id`.

3. **Nova query: buscar membros da área** (reutilizando o padrão de FiscalProjetosCadastro):
   - Buscar líderes de `estrutura_area_lideres`
   - Buscar sublíderes de `estrutura_equipes`
   - Buscar membros de `estrutura_equipe_membros` via equipes da área
   - Unir todos em um Set de IDs

4. **Filtrar `teamMembers`** no dropdown de Responsável:
   ```ts
   const filteredTeamMembers = useMemo(() => {
     if (!areaMemberSet.size) return teamMembers; // fallback
     return teamMembers.filter(m => areaMemberSet.has(m.id));
   }, [teamMembers, areaMemberSet]);
   ```
   Usar `filteredTeamMembers` no Select de Responsável (linha 618) em vez de `teamMembers`.

5. **Limpar responsável ao trocar projeto** se o responsável atual não pertencer à nova área.

### Regras
- Se o projeto não tiver `area_id` ou a área não tiver `estrutura_area_id`, fallback para todos os membros (comportamento atual)
- Nenhuma alteração de banco

