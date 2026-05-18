## Problema

Em `/equipe/acessos` → Cadastros Estrutura, os selects de **Gestor** e **Membro** filtram por role exata:

- `EstruturaManager.tsx:365` → Gestor usa só `liderProfiles` (role = `lider`). Admins ficam de fora.
- `EstruturaManager.tsx:331` → Membro usa `memberProfiles ∪ subliderProfiles` (apenas roles exatas). Líderes e admins ficam de fora.

Além disso, o filtro `allMembroIds` (linha 330) remove qualquer pessoa que já seja membro de **qualquer** equipe, o que junto com o `availableMembers.length > 0` (linha 390) faz o select de adicionar membro sumir.

A função SQL `public.has_role_or_higher(_user_id, _minimum_role)` já existe com a hierarquia:
`team_member < sublider < lider < admin`.

## Plano

### 1. Backend — novo RPC `get_profiles_with_min_role`

Criar função `SECURITY DEFINER` que retorna `id, first_name, last_name, email` dos usuários cujo `has_role_or_higher(user_id, _minimum_role)` é verdadeiro. Reaproveita a hierarquia oficial e evita duplicar a regra no frontend.

```sql
CREATE OR REPLACE FUNCTION public.get_profiles_with_min_role(_minimum_role app_role)
RETURNS TABLE (id uuid, first_name text, last_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE public.has_role_or_higher(p.id, _minimum_role)
$$;
GRANT EXECUTE ON FUNCTION public.get_profiles_with_min_role(app_role) TO authenticated;
```

### 2. Frontend — `EstruturaManager.tsx`

- Substituir os `useProfiles('lider' | 'sublider' | 'team_member')` por dois hooks novos:
  - `useProfilesMinRole('team_member')` → candidatos a **Membro**.
  - `useProfilesMinRole('lider')` → candidatos a **Gestor**.
- Remover `memberProfiles`/`subliderProfiles`/`liderProfiles` separados e a deduplicação manual.
- No bloco do select de membros (linhas 329-334), trocar o filtro de "todas as equipes" por **apenas a equipe atual**, e renderizar o select sempre (desabilitado/placeholder quando lista vazia):
  ```ts
  const equipeMembroIds = new Set(equipeMembros.map(m => m.user_id));
  const availableMembers = memberCandidates.filter(p => !equipeMembroIds.has(p.id));
  ```
- Select de Gestor (linha 365) passa a iterar `gestorCandidates` (≥ lider).

### 3. Sem mudanças em RLS, types ou outros componentes

`profiles_safe`/`get_profiles_with_email` continuam intactos. Tipos do Supabase serão regenerados automaticamente após a migração.

## Arquivos

- nova migração SQL: `get_profiles_with_min_role`
- `src/components/equipe/estrutura/EstruturaManager.tsx` (hook `useProfiles`, blocos de cálculo de elegíveis, selects de gestor e membro)
