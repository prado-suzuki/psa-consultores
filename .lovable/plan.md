

# Adicionar filtro de usuario na tabela de auditoria

## Resumo

Adicionar um quarto filtro (Select de usuario) na barra de filtros do componente `AuditLogTable`, ao lado dos filtros existentes de busca, entidade e acao.

## Mudancas

### Arquivo: `src/components/equipe/audit/AuditLogTable.tsx`

1. Adicionar estado `userFilter` com valor inicial `'all'`
2. Usar o `profilesMap` (ja carregado) para popular as opcoes do Select
3. Adicionar um novo `Select` na barra de filtros com placeholder "Usuario" e as opcoes vindas de `profilesMap`
4. No filtro de `filteredLogs`, alem do filtro de busca por nome, aplicar tambem o filtro `log.performed_by === userFilter` quando nao for `'all'`

A ordem dos filtros ficara: Busca por nome | Entidade | Acao | Usuario

