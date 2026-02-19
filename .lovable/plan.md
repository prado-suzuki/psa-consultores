
# Corrigir filtro de categorias nas tarefas

## Problema identificado

Quando voce cria um projeto e seleciona categorias especificas, essas categorias sao salvas na tabela `tax_project_categorias`. Porem, quando voce cria uma tarefa e seleciona um projeto, o dropdown de categorias busca **todas as categorias da area** (via `tax_area_categorias`) em vez de buscar **apenas as categorias vinculadas ao projeto** (via `tax_project_categorias`).

Ou seja, as categorias selecionadas no cadastro do projeto nao estao sendo usadas para filtrar as opcoes nas tarefas.

## Solucao

Alterar a query de categorias no `TaskModal.tsx` para buscar da tabela `tax_project_categorias` em vez de `tax_area_categorias`.

## Detalhes tecnicos

**Arquivo**: `src/components/equipe/fiscal/tasks/TaskModal.tsx` (linhas 165-185)

**Antes** (busca todas as categorias da area):
```typescript
const { data: proj } = await supabase
  .from('tax_projects')
  .select('area_id')
  .eq('id', watchedProjectId)
  .single();
if (!proj?.area_id) return [];
const { data } = await supabase
  .from('tax_area_categorias')
  .select('categoria_id, categoria:tax_categorias(id, nome)')
  .eq('area_id', proj.area_id);
```

**Depois** (busca apenas as categorias vinculadas ao projeto):
```typescript
const { data } = await supabase
  .from('tax_project_categorias')
  .select('categoria_id, categoria:tax_categorias(id, nome)')
  .eq('project_id', watchedProjectId);
```

Isso elimina a necessidade de buscar o `area_id` do projeto primeiro, simplificando a query e garantindo que apenas as categorias selecionadas no cadastro do projeto aparecam como opcao nas tarefas.
