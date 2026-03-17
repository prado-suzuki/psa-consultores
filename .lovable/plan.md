

# Plano: Migrar `external_client_id` de 13 projetos para `cliente_dev`

## Ação

Executar um único UPDATE que cruza `tax_projects` → `cliente` (por nome) → `cliente_dev` para substituir os IDs de produção pelos IDs de desenvolvimento. Os 2 projetos "Grupo Bahia Potrich" ficam inalterados (sem equivalente em `cliente_dev`).

## SQL a executar (via insert tool)

```sql
UPDATE tax_projects tp
SET external_client_id = cd.id
FROM cliente c
JOIN cliente_dev cd ON cd.nome = c.nome AND cd.excluido = false
WHERE c.id = tp.external_client_id
  AND tp.external_client_id IS NOT NULL
  AND cd.id IS NOT NULL;
```

## Resultado esperado

- **13 projetos** atualizados com UUIDs de `cliente_dev`
- **2 projetos** inalterados (Grupo Bahia Potrich)
- O trigger `trg_validate_tax_project_external_client` aceita IDs de ambas as tabelas — sem risco de rejeição

## Após execução

Rodar query de verificação para confirmar que os IDs foram atualizados corretamente.

