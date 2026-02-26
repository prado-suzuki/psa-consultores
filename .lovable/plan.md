

## Corrigir vínculo da categoria "Revisão ICMS"

Alterar o registro na tabela `tax_area_categorias` para mover "Revisão ICMS" da área "Levantamento de Credito" para a área "Fixos".

### Ação
Uma única migração SQL:
1. Atualizar o registro `f6f7114a-1c2f-4e90-a922-f64277ea469d` mudando `area_id` de `55448e04-...` (Levantamento de Credito) para `7089d134-...` (Fixos)

