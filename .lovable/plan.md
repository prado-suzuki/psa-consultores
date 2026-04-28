## Diagnóstico

A causa **não é** RLS, código de rota ou alteração no `PageAccessGate` / `usePageAccess`. O fluxo de visibilidade é:

> Página cadastrada em `page_permissions` exige registro explícito em `user_page_access`. Sem registro → "Acesso Negado".

O **padrão** de provisionamento (`useSyncUserAreaAccess` em `src/hooks/useUserPageAccess.ts`) já é correto: marcar a área "Tax" no form concede em bloco **todas as páginas** com `category = 'tax'`. Confirmação no banco: para 11 usuários, os grants das 3 páginas Tax originais foram inseridos no mesmo segundo.

O dashboard (`/equipe/tax/dashboard`) só foi cadastrado em `page_permissions` em **19/02/2026**. Os 10 afetados (Anderson, Hercio, Geizi, João, Maria, Mayara, Monica, Diego, Gabriel, Marcely) já existiam antes disso ou tiveram seus acessos editados em momento que essa página ficou de fora — por isso eles têm `auditoria`, `cadastro`, `tarefas`, `clientes` mas **não** `dashboard`. Nenhuma RLS ou código quebrou; é apenas drift histórico de dados em `user_page_access`.

## Correção (duas frentes)

### 1) Backfill dos 10 usuários — via migration (é o padrão)

A migration faz exatamente o que `useSyncUserAreaAccess` já faria se você reabrisse cada usuário e clicasse "Salvar": insere em `user_page_access` o `page_permission_id` do Tax Dashboard para todo `user_id` que já tenha acesso a **qualquer outra** página da `category = 'tax'` e ainda não tenha o registro do dashboard. `ON CONFLICT DO NOTHING` garante idempotência. Isso **não é gambiarra** — é a mesma operação que o hook do form executa (`INSERT INTO user_page_access (user_id, page_permission_id, granted_by)`). A migration apenas executa em lote o que o hook faria 10 vezes manualmente.

```sql
INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
SELECT DISTINCT upa.user_id,
       (SELECT id FROM public.page_permissions WHERE page_path = '/equipe/tax/dashboard'),
       NULL  -- backfill automático, sem actor humano
FROM public.user_page_access upa
JOIN public.page_permissions pp ON pp.id = upa.page_permission_id
WHERE pp.category = 'tax'
  AND upa.user_id NOT IN (
    SELECT user_id FROM public.user_page_access
    WHERE page_permission_id = (SELECT id FROM public.page_permissions WHERE page_path = '/equipe/tax/dashboard')
  )
ON CONFLICT (user_id, page_permission_id) DO NOTHING;
```

Validação pós-execução: `users_with_access` para `/equipe/tax/dashboard` passa de 11 → 21, alinhando com as outras páginas Tax.

### 2) Prevenir o problema no futuro — trigger automático

Para garantir que **qualquer nova página** cadastrada numa categoria de área seja automaticamente provisionada para todos os usuários que já têm acesso àquela área (sem depender de re-edição manual de cada usuário), criar um trigger `AFTER INSERT ON page_permissions`:

```sql
CREATE OR REPLACE FUNCTION public.auto_grant_new_page_to_area_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para cada usuário que já tem acesso a outra página da MESMA categoria,
  -- conceder acesso à página recém-criada.
  INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
  SELECT DISTINCT upa.user_id, NEW.id, NULL
  FROM public.user_page_access upa
  JOIN public.page_permissions pp ON pp.id = upa.page_permission_id
  WHERE pp.category = NEW.category
    AND pp.id <> NEW.id
  ON CONFLICT (user_id, page_permission_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_grant_new_page
AFTER INSERT ON public.page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_new_page_to_area_users();
```

Isso elimina o risco de drift sempre que uma nova página for adicionada a uma categoria (`tax`, `osg`, `board`, `dev`, `rotina`, `gestao`).

**Pré-requisito**: garantir índice único em `user_page_access (user_id, page_permission_id)` para o `ON CONFLICT` funcionar. Vou verificar e, se faltar, incluir na migration:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS user_page_access_user_page_uniq
ON public.user_page_access (user_id, page_permission_id);
```

## Sobre o "endpoint" / código

**Nenhuma alteração de código necessária.** O `PageAccessGate`, `usePageAccess`, `useSyncUserAreaAccess` e `EditUserDialog` já estão corretos e seguem o padrão. A correção é 100% de **dados + trigger preventivo** via migration.

## Passos

1. Criar migration única contendo:
   - Índice único em `user_page_access (user_id, page_permission_id)` (idempotente).
   - INSERT de backfill do Tax Dashboard para os 10 usuários.
   - Função + trigger `auto_grant_new_page_to_area_users`.

2. Pedir aos usuários que recarreguem (ou aguardem ~5 min — `staleTime` do React Query).

3. Validar contagens em `user_page_access` por página Tax (esperado: todas com 21 ou ≥20).

Sem mudanças em arquivos `.ts`/`.tsx`.