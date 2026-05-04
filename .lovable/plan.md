# Organizar lista de usuários em Acessos

## Objetivo
Na aba "Usuários" do Controle de Acessos (`UsersTab`), reorganizar a lista lateral para ficar agrupada por **role** (RLS) e, dentro de cada grupo, **ordem alfabética** pelo nome.

## Onde
- `src/components/acessos/UsersTab.tsx` (lista lateral à esquerda).

## Como

### 1. Ordem das roles (hierarquia visual)
Seguir a hierarquia já usada no projeto:
1. Admin
2. Líder Geral
3. Sublíder
4. Membro (team_member)
5. Time Cliente (timecliente)
6. Cliente (client)
7. Sem role (fallback)

A "role principal" de cada usuário é a primeira encontrada nessa ordem dentro de `user.roles`.

### 2. Ordenação
- Agrupar usuários pela role principal seguindo a ordem acima.
- Dentro de cada grupo: ordenar alfabeticamente por `first_name + last_name` (case-insensitive, `localeCompare` pt-BR).

### 3. UI
Adicionar um pequeno cabeçalho (label) por grupo na lista lateral, reutilizando `ROLE_SHORT_LABELS` e `ROLE_BADGE_CLASSES` de `roleOptions.ts`, no mesmo estilo discreto (texto pequeno, uppercase, slate-500), para facilitar a leitura. Cards de usuário permanecem iguais.

## Detalhes técnicos
- Computar a lista ordenada via `useMemo` sobre `users` retornados por `useUsersWithRoles`.
- Sem mudanças em hooks, queries ou banco — apenas apresentação no componente `UsersTab`.
- Sem novas dependências.

## Fora de escopo
- Não alterar `UsersRolesView` (views compactas em `/administracao/acessos` e `/gestao/acessos`), apenas a aba de gestão em `/equipe/acessos`. Posso estender depois se quiser.
