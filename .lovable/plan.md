## Regra geral RLS (REORGANIZACAO_RLS)

**Toda policy (SELECT/INSERT/UPDATE/DELETE) deve usar `public.has_role_or_higher(auth.uid(), _role)` em vez de combinar roles com OR.**

A função `has_role_or_higher` já garante a hierarquia oficial:
`admin ⊇ lider ⊇ sublider ⊇ team_member ⊇ client`

Exemplos:
- ✅ `USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))` — admin/lider/sublider/team_member
- ❌ `USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'team_member'))` — redundante e incompleto (esquece lider/sublider)

Toda nova tabela com RLS habilitado **DEVE** ter ao menos uma policy SELECT — caso contrário o Postgres bloqueia toda leitura, inclusive admin.
