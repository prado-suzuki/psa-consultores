## Objetivo
Na página `/equipe/acessos`, aba "Usuários Estrutura", adicionar uma barra de abas no topo do painel "Usuários" para filtrar a lista por role (Admin, Líder, Sublíder, Team member, Client, Timecliente, Todos). Hoje os usuários aparecem agrupados por role em uma única lista rolável; o pedido é trocar isso por abas — clico em "Admin" e só vejo admins, etc.

## Escopo
- Somente o painel esquerdo "Usuários" do componente `src/components/acessos/UsersTab.tsx`.
- Sem mudanças no painel direito de permissões, sem mudanças em hooks, RLS, dados ou rotas.
- Sem mexer em `AdminAcessos.tsx` / `GestaoAcessos.tsx` (que são read-only e fora do pedido).

## Mudanças

### `src/components/acessos/UsersTab.tsx`
1. Acrescentar estado `roleFilter: AppRole | 'all'` (default `'all'`).
2. Renderizar uma `Tabs` horizontal no topo do card "Usuários", logo acima do input de pesquisa, com as abas:
   - Todos
   - Admin
   - Líder
   - Sublíder
   - Team member
   - Client
   - Timecliente
   
   Cada aba mostra a contagem entre parênteses (ex.: `Admin (7)`), calculada a partir de `useUsersWithRoles()` já consumido no componente. Usuários sem nenhuma role contam só em "Todos".
3. Aplicar o filtro combinado com a busca por nome/email já existente:
   - `roleFilter === 'all'` → comportamento atual (agrupado por role).
   - Caso contrário → lista plana só com usuários que possuem aquela role, ordenada por nome, sem o cabeçalho "ADMIN (n)" repetido (a aba já indica).
4. Manter seleção do usuário ativo; se o usuário selecionado sumir do filtro atual, manter selecionado mas sem destaque na lista (não limpar a seleção para não recarregar o painel direito).
5. Layout responsivo: abas com `overflow-x-auto` em telas estreitas, mantendo o estilo teal já usado nas outras Tabs da página.

## Fora de escopo
- Nenhuma alteração no painel direito (permissões), nos cards de estatísticas, no Supabase, nas policies, ou nas outras abas (`Páginas`, `Cadastros Estrutura`, `Cadastros Clientes`, `Cadastro Categorias`).
- Não alterar a ordenação interna dos grupos nem renomear roles.

## Validação
- Abrir `/equipe/acessos` → aba "Usuários Estrutura" → clicar em cada aba e confirmar que só aparecem usuários daquela role e que a contagem bate com a do agrupamento atual.
- Pesquisa por nome continua funcionando dentro da aba selecionada.
- Selecionar um usuário ainda abre o painel direito de permissões normalmente.
