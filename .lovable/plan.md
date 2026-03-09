

## Plano: Soft-delete de clientes (coluna `excluido`)

### 1. Migração SQL
Adicionar coluna `excluido` nas duas tabelas:
```sql
ALTER TABLE public.cliente ADD COLUMN excluido boolean NOT NULL DEFAULT false;
ALTER TABLE public.cliente_dev ADD COLUMN excluido boolean NOT NULL DEFAULT false;
```

### 2. `GestaoClientes.tsx`
- **`handleDeleteConfirm`**: Trocar os `DELETE` em cascata por `UPDATE ... SET excluido = true` apenas na tabela do cliente.
- **Query de listagem** (`clientes-filtrados`): Adicionar `.eq("excluido", false)` para ocultar clientes marcados.
- **Query de dropdown** (`clientes-lista`): Adicionar `.eq("excluido", false)` também.

### Arquivos tocados
1. Migração SQL (2 tabelas)
2. `src/pages/equipe/dev/GestaoClientes.tsx`

