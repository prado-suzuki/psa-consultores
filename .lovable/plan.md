

# Melhorar placeholders dos filtros na tabela de auditoria

## Resumo

Atualizar os textos placeholder/valor padrao dos filtros na barra de filtros do `AuditLogTable` para deixar claro o que cada filtro faz.

## Mudancas

### Arquivo: `src/components/equipe/audit/AuditLogTable.tsx`

Atualizar os textos dos `SelectValue` e do `Input` placeholder:

- Input de busca: manter "Buscar por nome..." (ja esta claro)
- Filtro de entidade: trocar placeholder de "Entidade" para "Filtrar por tipo"
- Filtro de acao: trocar placeholder de "Acao" para "Filtrar por acao"
- Filtro de usuario: trocar placeholder de "Usuario" para "Filtrar por usuario"

