

# Migração: RLS SELECT de page_permissions → has_role_or_higher

## O que será feito

Uma única migração SQL que substitui a policy SELECT de `page_permissions` para aceitar qualquer role interno (team_member, sublider, lider, admin) via `has_role_or_higher`.

## SQL da migração

```sql
DROP POLICY "Team members podem ver permissões de página" ON public.page_permissions;

CREATE POLICY "Team members podem ver permissões de página"
  ON public.page_permissions
  FOR SELECT
  TO authenticated
  USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));
```

## Verificação pós-migração

```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'page_permissions';
```

Resultado esperado: 2 policies — a ALL de admin (inalterada) e a SELECT agora com `has_role_or_higher`.

## Impacto

- Resolve o bug da Maria Lizot: subliders/liders poderão ler `page_permissions`, desbloqueando `checkAreaAccess`
- Nenhuma policy de INSERT/UPDATE/DELETE alterada
- Nenhum outro arquivo modificado

