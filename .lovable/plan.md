

# Registrar página "Clientes TAX" nas permissões

## Problema

A nova página `/equipe/tax/projetos/clientes` não foi adicionada ao array `PROTECTED_PAGES` em `src/config/protectedPages.ts`. Esse array é a fonte de verdade que sincroniza com a tabela `page_permissions` no banco. Sem essa entrada, a página não aparece na listagem de permissões em "Usuários Estrutura".

## Correção

Adicionar uma entrada em `src/config/protectedPages.ts`, na seção TEX PAGES, com categoria `tax`:

```typescript
{
  page_path: '/equipe/tax/projetos/clientes',
  page_name: 'Tax Clientes',
  page_description: 'Cadastros de clientes da área Tax',
  category: 'tax',
  requires_admin: false,
  requires_team_member: true,
},
```

Nenhuma outra alteração necessária — o hook `useSyncProtectedPages` sincroniza automaticamente novas entradas com o banco.

## Arquivo

| Arquivo | Alteração |
|---|---|
| `src/config/protectedPages.ts` | Nova entrada para `/equipe/tax/projetos/clientes` |

