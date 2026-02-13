
## Plano: Selecao de Papel (Role) ao Criar Usuario

### Problema
Na tela de Controle de Acessos (`/equipe/acessos`), ao criar um novo usuario, o formulario so permite marcar "administrador" via checkbox. O usuario e sempre criado automaticamente como `team_member`, sem opcao de escolher entre **admin**, **team_member** ou **client**.

### Solucao
Substituir o checkbox unico "Conceder acesso de administrador" por um seletor de papeis com checkboxes multiplos, permitindo escolher qualquer combinacao de roles ao criar o usuario.

### Alteracoes

#### 1. Frontend -- `src/pages/equipe/EquipeControleAcessos.tsx`

**Estado do formulario**: trocar `is_admin: boolean` por `roles: string[]` (ex: `['team_member', 'client']`).

**UI do formulario**: substituir o checkbox unico por 3 opcoes:
- Administrador (`admin`)
- Membro da Equipe (`team_member`)
- Cliente (`client`)

Cada opcao com checkbox, icone e label, seguindo o mesmo padrao visual ja usado em `AdminUsuarios.tsx`.

**Chamada da edge function**: enviar `roles` em vez de `is_admin` no body da requisicao.

#### 2. Backend -- `supabase/functions/create-team-member/index.ts`

Atualizar a edge function para aceitar um campo `roles` (array de strings) em vez de `is_admin` (boolean).

Logica:
- Se `roles` for enviado, inserir cada role no `user_roles`
- Se `roles` nao for enviado (compatibilidade), manter comportamento atual (`team_member` + `admin` se `is_admin`)
- Nao inserir `team_member` automaticamente se nao estiver na lista

#### 3. Gestao de roles na lista de usuarios

Adicionar botoes de adicionar/remover roles diretamente na lista de usuarios do painel, similar ao que ja existe em `AdminUsuarios.tsx`. Ao selecionar um usuario, alem de ver as permissoes de pagina, mostrar os papeis atuais com opcao de alterar.

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/pages/equipe/EquipeControleAcessos.tsx` | Trocar `is_admin` por `roles[]` no state; atualizar formulario com 3 checkboxes; atualizar body da mutation |
| `supabase/functions/create-team-member/index.ts` | Aceitar campo `roles` (array); inserir cada role individualmente; manter retrocompatibilidade com `is_admin` |

### Resultado Esperado
- Ao criar usuario, o admin escolhe exatamente quais papeis atribuir
- Papeis disponiveis: Administrador, Membro da Equipe, Cliente
- O sistema nao atribui `team_member` automaticamente -- so o que for selecionado
- Retrocompatibilidade mantida caso o campo `roles` nao seja enviado
