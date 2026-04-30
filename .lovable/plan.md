## Objetivo

Fazer o dropdown "Responsável" em `/gestao/chamados` (e demais telas que usam `useTicketAgents`) listar **todos os usuários internos** — ou seja, qualquer pessoa com role `team_member`, `sublider`, `lider` ou `admin` — em vez de apenas `team_member` + `admin`.

Hoje membros do Fiscal que têm apenas role `lider` ou `sublider` ficam de fora do dropdown.

## Mudança

### 1. Nova função SQL `get_internal_users()` (SECURITY DEFINER)

Não dá para chamar `has_role_or_higher` diretamente do client em cima de cada user_id (seria N+1). Criar uma RPC que devolve todos os usuários internos:

```sql
create or replace function public.get_internal_users()
returns table(id uuid, first_name text, last_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name, p.last_name
  from public.profiles p
  where exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('team_member','sublider','lider','admin')
  )
  order by p.first_name, p.last_name;
$$;
```

Equivalente semanticamente a `has_role_or_higher(p.id, 'team_member')` — qualquer role >= team_member na hierarquia.

Acesso: chamável por usuários autenticados (a função em si não expõe dados sensíveis — só nome).

### 2. Atualizar `useTicketAgents` em `src/hooks/useTickets.ts`

Substituir a query atual (que filtra `role in ('admin','team_member')` e cruza com `profiles_safe`) por uma única chamada:

```ts
const { data, error } = await supabase.rpc('get_internal_users');
```

Mantém a mesma `queryKey` (`['tickets','agents']`) e o mesmo shape de retorno (`TicketProfile[]`), então nenhum consumidor precisa mudar.

## Impacto

Telas afetadas automaticamente (todas consomem `useTicketAgents`):
- `src/pages/gestao/GestaoChamados.tsx`
- `src/pages/gestao/GestaoDetalhesChamado.tsx`
- `src/pages/admin/AdminChamados.tsx`
- `src/pages/equipe/EquipeChamados.tsx`

Resultado: o dropdown passa a mostrar líderes e sublíderes também, cobrindo o time Fiscal completo.

## Fora de escopo

- Não filtra por área/cluster do ticket (lista continua global, como hoje).
- Não mexe em RLS de `tickets` nem em outras telas de atribuição (tarefas, projetos).