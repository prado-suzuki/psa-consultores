

# Plano: Filtrar apenas clientes puros na aba "Clientes"

## Problema

A aba "Clientes" usa `u.roles.includes('client')`, que inclui usuarios que possuem role `client` E tambem `team_member`/`admin`/`lider`. Precisamos mostrar apenas usuarios que sao exclusivamente clientes.

## Alteracao

Em `EquipeControleAcessos.tsx`, linha 1501, ajustar o filtro para excluir usuarios que possuam roles de equipe:

```typescript
// De:
const clientUsers = users?.filter(u => u.roles.includes('client')) || [];

// Para:
const clientUsers = users?.filter(u => 
  u.roles.includes('client') && 
  !u.roles.some(r => ['admin', 'team_member', 'lider'].includes(r))
) || [];
```

Isso garante que apenas usuarios com role `client` (sem nenhuma role de equipe) apareçam na aba.

## Arquivo impactado

| Arquivo | Alteracao |
|---|---|
| `EquipeControleAcessos.tsx` | Ajustar filtro `clientUsers` para excluir roles de equipe |

