

# Registrar "Tax Clientes" no array de páginas protegidas

## Problema

A página `/equipe/tax/projetos/clientes` foi criada (rota, componente, sidebar), mas nunca foi adicionada ao array `PROTECTED_PAGES` em `src/config/protectedPages.ts`. O botão de sincronização lê esse array — se a página não está lá, ele não a cria no banco.

## Correção

### `src/config/protectedPages.ts`

1. Adicionar comentário-guia no topo do arquivo (antes do `export interface`) para prevenir esse erro no futuro:

```typescript
/**
 * IMPORTANTE: Toda nova página/rota protegida DEVE ser registrada neste array.
 * Sem isso, ela NÃO aparecerá no controle de permissões mesmo após clicar em "Atualizar".
 */
```

2. Na seção TEX PAGES (~linha 145, após "Tax Tarefas"), adicionar:

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

Após essa alteração, o botão de sincronização detectará a nova entrada e a criará no banco automaticamente.

## Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/config/protectedPages.ts` | Nova entrada + comentário preventivo |

