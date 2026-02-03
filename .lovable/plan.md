

# Plano: Remover Entrada Duplicada "Auditoria Fiscal"

## Problema

O hook `useSyncProtectedPages` apenas insere novas páginas mas não remove as obsoletas. Resultado: duas entradas no banco para a mesma ferramenta.

| Entrada | Caminho | Status |
|---------|---------|--------|
| Auditoria Fiscal | /equipe/dev/auditoria-fiscal | **Obsoleta** (rota não existe mais) |
| DIFAL Inteligente | /equipe/dev/difal-inteligente | Atual |

## Solução

Executar uma migração SQL para deletar o registro antigo da tabela `page_permissions`.

## SQL a Executar

```sql
-- Primeiro, deletar acessos de usuário vinculados à página antiga
DELETE FROM user_page_access 
WHERE page_permission_id IN (
  SELECT id FROM page_permissions 
  WHERE page_path = '/equipe/dev/auditoria-fiscal'
);

-- Depois, deletar a página antiga
DELETE FROM page_permissions 
WHERE page_path = '/equipe/dev/auditoria-fiscal';
```

## Resultado Esperado

Após a migração, apenas a entrada "DIFAL Inteligente" permanecerá na lista de controle de acessos.

## Melhoria Futura (Opcional)

Atualizar o hook `useSyncProtectedPages` para também:
- Atualizar nomes/descrições de páginas existentes
- Remover páginas que não estão mais no código

Isso evitaria duplicações futuras.

