-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827150038, nome `projeto_restrito_auditoria` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

CREATE OR REPLACE FUNCTION public.audit_log_projeto(_entity_type text, _entity_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE _entity_type
    WHEN 'task'    THEN (SELECT t.project_id FROM public.org_tasks    t WHERE t.id = _entity_id)
    WHEN 'subtask' THEN (SELECT t.project_id FROM public.org_tasks    t WHERE t.id = _entity_id)
    WHEN 'project' THEN (SELECT p.id         FROM public.org_projects p WHERE p.id = _entity_id)
    WHEN 'org_comment' THEN (SELECT c.project_id FROM public.org_comments c WHERE c.id = _entity_id)
    ELSE NULL
  END;
$function$;

COMMENT ON FUNCTION public.audit_log_projeto(text, uuid) IS
  'Traduz (entity_type, entity_id) de audit_logs para o projeto, porque a tabela nao tem project_id. Devolve NULL para o que nao pertence a projeto nenhum, e essas linhas continuam visiveis.';

DROP POLICY IF EXISTS rls_audit_logs_select ON public.audit_logs;
CREATE POLICY rls_audit_logs_select
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR entity_type NOT IN ('task', 'subtask', 'project', 'org_comment')
      OR NOT EXISTS (
        SELECT 1 FROM public.org_projects p
         WHERE p.id = public.audit_log_projeto(entity_type, entity_id)
           AND p.restricted
      )
      OR is_project_member(auth.uid(), public.audit_log_projeto(entity_type, entity_id))
    )
  );
