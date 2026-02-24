

# Correcao: Heranca automatica de projeto/processo nas subtarefas

## Problema identificado
Analisando o banco de dados, existem **327 subtarefas** no total. Destas:
- **92 subtarefas** estao sem `project_id` mas a tarefa pai tem
- **65 subtarefas** estao sem `process_id` mas a tarefa pai tem

Isso impede o calculo correto de ROI por projeto/processo.

## Solucao em 2 partes

### Parte 1: Corrigir dados historicos (migracao SQL)

Executar um UPDATE que propaga `project_id` e `process_id` do pai para todos os filhos que estejam sem esses campos:

```sql
UPDATE sprint_deliverables child
SET 
  project_id = COALESCE(child.project_id, parent.project_id),
  process_id = COALESCE(child.process_id, parent.process_id)
FROM sprint_deliverables parent
WHERE child.parent_id = parent.id
  AND (
    (child.project_id IS NULL AND parent.project_id IS NOT NULL)
    OR
    (child.process_id IS NULL AND parent.process_id IS NOT NULL)
  );
```

Isso corrige as 92 + 65 subtarefas de uma vez, sem alterar subtarefas que ja tenham valores proprios.

### Parte 2: Prevenir o problema em novas criacoes (3 pontos no codigo)

**Arquivo: `src/pages/equipe/EquipeSprintDetalhes.tsx`**

1. **Formulario manual de criacao (linha ~2276)**: Ao selecionar tarefa pai, preencher automaticamente `project_id` e `process_id` do pai:
   - Buscar o registro pai em `deliverables`
   - Setar `project_id` e `process_id` no estado do formulario

2. **Importacao Excel simplificada (linha ~599-610)**: Ao montar o objeto de cada subtask, incluir `project_id` e `process_id` herdados do `parentData` recem-inserido.

**Arquivo: `src/lib/excelImporter.ts`**

3. **Importacao Excel avancada (funcao `convertToDeliverables`)**: Quando a subtarefa nao tem projeto/processo proprio, usar como fallback os valores do `parentDeliverable` ja montado no mesmo grupo.

## Resultado esperado
- Todas as 92+65 subtarefas historicas serao corrigidas imediatamente
- Novas subtarefas criadas (manual ou importacao) herdam automaticamente do pai
- O calculo de ROI por projeto/processo ficara coerente

