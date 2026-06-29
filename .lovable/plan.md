## Diagnóstico (read-only)

### 1) Cluster OSG
Nome real: **`PSA OSG`** (não "OSG" literal). Id: `0523512c-f980-4236-8a7c-53e06c9c7a80`, `is_active=true`.
→ A migration usará o **id exato**, não `ilike '%osg%'`.

### 2) Página `/equipe/chamados`
- `page_permissions.id` = `b0569242-b457-4731-b037-417d92d86090`, categoria `geral`, ativa.
- 25 usuários já têm acesso hoje (Digital, PSA Consultores, Prado etc.).

### 3) Usuários do cluster PSA OSG sem acesso (7)

| # | Nome | user_id |
|---|---|---|
| 1 | Anne Strini | 25828fa1-… |
| 2 | Fernando Machado | bc52f8bb-… |
| 3 | Jakeline Granja | 0c95321e-… |
| 4 | Karlene Gallo | a6ec8be4-… |
| 5 | luana Stelle | 9e895b32-… |
| 6 | Maritsa Padilha | 715d07e9-… |
| 7 | Thiago Santos | e150dd84-… |

Todos os 7 vêm da estrutura PSA OSG (membro de equipe / gestor de equipe / gestor de chamados da área).

### 4) Afetados pela migration
**7 INSERTs** em `user_page_access`. Nenhum outro cluster é tocado — o filtro parte do `cluster_id = 0523512c-…` e o INSERT é restrito à lista acima.

---

## Migration proposta (após APROVAÇÃO)

```sql
BEGIN;

INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
SELECT DISTINCT ou.user_id,
       'b0569242-b457-4731-b037-417d92d86090'::uuid,
       NULL::uuid
FROM (
  SELECT em.user_id
  FROM public.estrutura_equipe_membros em
  JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
  JOIN public.estrutura_areas    a  ON a.id  = eq.area_id
  WHERE a.cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
  UNION
  SELECT eq.gestor_id
  FROM public.estrutura_equipes eq
  JOIN public.estrutura_areas a ON a.id = eq.area_id
  WHERE a.cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
    AND eq.gestor_id IS NOT NULL
  UNION
  SELECT a.gestor_chamados_id
  FROM public.estrutura_areas a
  WHERE a.cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
    AND a.gestor_chamados_id IS NOT NULL
) ou
WHERE ou.user_id IS NOT NULL
ON CONFLICT (user_id, page_permission_id) DO NOTHING;

COMMIT;
```

Características:
- Aditiva e idempotente (`ON CONFLICT DO NOTHING` na UNIQUE `(user_id, page_permission_id)`).
- Transação única.
- Sem mudanças em schema, RLS, policies ou outras tabelas.
- `granted_by = NULL` (sistema), igual ao padrão usado pelo trigger `auto_grant_new_page_to_area_users`.

### Rollback

```sql
BEGIN;

DELETE FROM public.user_page_access
WHERE page_permission_id = 'b0569242-b457-4731-b037-417d92d86090'
  AND user_id IN (
    '25828fa1-e0f5-4975-9491-9b075464c6da',
    'bc52f8bb-89c4-4019-aa0c-612d2c295b7b',
    '0c95321e-7d14-4930-bc57-697690e19539',
    'a6ec8be4-fdc2-4d0a-9844-37e010ec7ad1',
    '9e895b32-fb6f-45cd-b4cc-5795a8192160',
    '715d07e9-1808-463e-909e-39ae5b37dd10',
    'e150dd84-96aa-4244-ae5e-9a111d2ef4c0'
  );

COMMIT;
```
Obs.: o rollback usa a lista exata dos 7 user_ids identificados agora — assim ele não revoga acesso de quem já tinha antes, mesmo que mais alguém entre no cluster entre a migration e o rollback.

---

## Riscos

- **Exposição cross-cluster**: nenhuma. A query parte do `cluster_id = PSA OSG`; a página já filtra chamados por cluster server-side.
- **Duplicidade**: protegida pelo `ON CONFLICT`.
- **Trigger `auto_grant_new_page_to_area_users`**: dispara em INSERT em `page_permissions`, não em `user_page_access` — não há cascata inesperada.
- **Audit log**: a inserção direta não passa por `useAuditLog` (mutação SQL), igual a outras migrations de provisionamento já aplicadas no projeto.

Aguardando **APROVADO** para executar.