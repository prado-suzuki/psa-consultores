

# Análise — Coluna Bridge `tax_areas.estrutura_area_id`

## Situação Atual

A coluna **já existe** e a FK `tax_areas_estrutura_area_id_fkey` já está criada. Dos 5 registros, **3 já estão populados** e **2 estão NULL**:

| tax_area | estrutura_area_id | Status |
|---|---|---|
| Fixos | `fd2eab19...` | ✅ Populado |
| Levantamento de Credito | `201bb999...` | ✅ Populado |
| Pontuais | `5c71affa...` | ✅ Populado |
| Estudos e Pesquisas | `nil` | ❌ NULL |
| Societario | `nil` | ❌ NULL |

## Plano

Apenas **2 UPDATEs** são necessários — nenhuma migration de schema:

```sql
UPDATE tax_areas SET estrutura_area_id = '947fc502-91cd-4fc2-8d88-76cd9d829754'
WHERE id = '922774b9-ede8-4e0e-9709-7185a84a79c4';  -- Estudos e Pesquisas

UPDATE tax_areas SET estrutura_area_id = 'a76d5f03-de4b-499d-9fb2-d9764b26422a'
WHERE id = '26a6cdd4-ac56-4d4a-93bf-a32181f4f158';  -- Societario
```

Nenhuma alteração de schema, frontend ou RLS é necessária. Aprove para executar os 2 UPDATEs.

