

## Vincular "Revisao ICMS" a area "Levantamento de Credito"

### Diagnostico
- **Area:** "Levantamento de Credito" (id: `55448e04-d9ea-4fd7-bde8-7396fdb01376`) ja possui 9 categorias vinculadas.
- **Categoria:** "Revisao ICMS" (id: `f5919709-cffe-4144-9719-efc90db66963`) ja existe em `tax_categorias` mas nao esta vinculada a essa area.

### Implementacao
Uma unica migracao SQL para inserir o vinculo na tabela `tax_area_categorias`:

```sql
INSERT INTO tax_area_categorias (area_id, categoria_id)
VALUES (
  '55448e04-d9ea-4fd7-bde8-7396fdb01376',
  'f5919709-cffe-4144-9719-efc90db66963'
);
```

### Resultado
- Nenhuma alteracao de codigo frontend necessaria — o formulario de cadastro de projetos ja carrega as categorias dinamicamente via `tax_area_categorias`.
- "Revisao ICMS" aparecera automaticamente na lista ao selecionar a area "Levantamento de Credito".

