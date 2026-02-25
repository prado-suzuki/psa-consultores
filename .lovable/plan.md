

## Plano: Adicionar categoria "Revisão ICMS"

Inserir um novo registro na tabela `tax_categorias` com o nome "Revisão ICMS".

### Alteração

Uma única migration SQL:

```sql
INSERT INTO tax_categorias (nome) VALUES ('Revisão ICMS');
```

Nenhum arquivo de código precisa ser alterado — a categoria aparecerá automaticamente nos seletores que consultam `tax_categorias`.

