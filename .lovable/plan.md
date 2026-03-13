

# Plano — Fases 1 e 2: Bridge de area_servicos e tax_projects

## Estado atual confirmado

- `area_servicos`: 51 registros, **sem** coluna `estrutura_area_id` (apenas `id`, `area_id`, `servico_id`)
- `tax_projects`: 17 projetos com `area_id` populado, `estrutura_area_id` existe mas **todos NULL**

## Fase 1 — area_servicos (Migration SQL)

Uma única migration com 3 operações:

```sql
-- 1.1 Adicionar coluna
ALTER TABLE area_servicos ADD COLUMN estrutura_area_id uuid;

-- 1.2 Popular via JOIN com tax_areas
UPDATE area_servicos ars
SET estrutura_area_id = ta.estrutura_area_id
FROM tax_areas ta
WHERE ta.id = ars.area_id;

-- 1.3 Adicionar FK
ALTER TABLE area_servicos
ADD CONSTRAINT area_servicos_estrutura_area_id_fkey
FOREIGN KEY (estrutura_area_id) REFERENCES estrutura_areas(id) ON DELETE CASCADE;
```

Coluna `area_id` original **permanece** como backup.

## Fase 2 — tax_projects (Data UPDATE)

Sem alteração de schema — apenas popular dados via insert tool:

```sql
UPDATE tax_projects tp
SET estrutura_area_id = ta.estrutura_area_id
FROM tax_areas ta
WHERE ta.id = tp.area_id
  AND tp.area_id IS NOT NULL
  AND tp.estrutura_area_id IS NULL;
```

## Validação final

```sql
SELECT 'area_servicos' as tabela, COUNT(*) as total,
       COUNT(estrutura_area_id) as populados,
       COUNT(*) - COUNT(estrutura_area_id) as nulls
FROM area_servicos
UNION ALL
SELECT 'tax_projects',
       COUNT(*) FILTER (WHERE area_id IS NOT NULL),
       COUNT(estrutura_area_id) FILTER (WHERE area_id IS NOT NULL),
       COUNT(*) FILTER (WHERE area_id IS NOT NULL) - COUNT(estrutura_area_id) FILTER (WHERE area_id IS NOT NULL)
FROM tax_projects;
```

Esperado: 0 nulls em ambas.

## O que NÃO será feito

- Nenhum arquivo frontend alterado
- Nenhuma coluna `area_id` removida
- Nenhuma RLS policy alterada
- Nenhuma FK existente removida

