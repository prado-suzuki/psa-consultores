
# Correcao: Pagina de Sprints travada no carregamento

## Problema raiz

A funcao `fetchSprintImpacts` em `EquipeSprints.tsx` (linhas 203-255) busca **todos** os IDs de deliverables de **todas** as sprints e passa em uma unica chamada `.in('sprint_deliverable_id', deliverableIds)`. Com 400+ UUIDs (cada um com 36 caracteres), a URL da requisicao GET excede o limite do PostgREST (~8KB), fazendo a requisicao travar silenciosamente sem erro. O `setLoading(false)` nunca e chamado porque a promise nunca resolve.

## Solucao

### Arquivo: `src/pages/equipe/EquipeSprints.tsx`

**Mudanca 1 - Dividir consulta `.in()` em lotes (chunking):**

Criar uma funcao auxiliar que divide arrays grandes em lotes de no maximo 50 IDs e faz as consultas em paralelo:

```typescript
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};
```

**Mudanca 2 - Aplicar chunking em `fetchSprintImpacts` (linhas 222-226):**

Em vez de uma unica chamada `.in()` com todos os IDs, dividir em lotes:

```typescript
const chunks = chunkArray(deliverableIds, 50);
const allImprovements = [];
for (const chunk of chunks) {
  const { data } = await supabase
    .from('process_improvements')
    .select('sprint_deliverable_id, cost_saved_monthly, time_saved_hours')
    .eq('evaluation_status', 'completed')
    .in('sprint_deliverable_id', chunk);
  if (data) allImprovements.push(...data);
}
```

**Mudanca 3 - Aplicar chunking em `fetchSprintHours` (linhas 166-169):**

A mesma logica para a query de deliverables por sprint (tambem usa `.in()`):

```typescript
const sprintIds = sprintsList.map(s => s.id);
const chunks = chunkArray(sprintIds, 50);
const allDeliverables = [];
for (const chunk of chunks) {
  const { data } = await supabase
    .from('sprint_deliverables')
    .select('sprint_id, assigned_to, estimated_hours')
    .in('sprint_id', chunk);
  if (data) allDeliverables.push(...data);
}
```

**Mudanca 4 - Adicionar try/catch robusto no `fetchData`:**

Garantir que `setLoading(false)` sempre execute, mesmo que uma sub-funcao falhe:

```typescript
const fetchData = async () => {
  try {
    // ... existing code ...
    if (sprintsData && sprintsData.length > 0) {
      await Promise.all([
        fetchSprintHours(sprintsData).catch(err => console.error('Hours error:', err)),
        fetchSprintImpacts(sprintsData).catch(err => console.error('Impacts error:', err))
      ]);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setLoading(false);
  }
};
```

## Resultado esperado

- A pagina de sprints carrega normalmente mesmo com centenas de deliverables
- Consultas sao feitas em lotes de 50 IDs, respeitando limites de URL
- Erros em sub-consultas nao bloqueiam o carregamento da pagina
- As funcoes `fetchSprintHours` e `fetchSprintImpacts` executam em paralelo (mais rapido)
