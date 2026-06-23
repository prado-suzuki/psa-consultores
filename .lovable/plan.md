## Causa raiz

Em `src/pages/equipe/EquipeSprints.tsx` (linhas 107–111), a query que popula o dropdown "Projeto" do modal **Criar Nova Sprint** filtra por `status = 'active'`:

```ts
const { data: projectsData } = await supabase
  .from('projects')
  .select('id, name')
  .eq('status', 'active')
  .order('name');
```

Mas na tabela `public.projects` os únicos valores de `status` em uso hoje são `Melhorias` (10) e `Mapeamento` (6) — nenhum projeto tem `status = 'active'`. Resultado: `projectsData` vem vazio e o `<Select>` fica sem opções.

Outras telas que listam projetos (Kanban, Análise Inteligente, Daily) não aplicam esse filtro e funcionam normalmente.

## Correção proposta

Remover o filtro inválido e alinhar com o padrão das demais páginas de equipe, mantendo a ordenação por nome:

```ts
const { data: projectsData } = await supabase
  .from('projects')
  .select('id, name')
  .order('name');
```

Mudança mínima, em um único arquivo (`src/pages/equipe/EquipeSprints.tsx`, função `fetchData`). Sem alterações de schema, hooks ou UI.

## Validação após aplicar

1. Abrir `/equipe/sprints` → clicar em "Nova Sprint" → o select "Projeto" deve listar os 16 projetos existentes.
2. Conferir que a listagem de sprints abaixo do modal continua igual (a query de sprints não muda).
