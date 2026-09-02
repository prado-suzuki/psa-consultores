-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827135312, nome `projeto_restrito_fundacao` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

ALTER TABLE public.org_projects
  ADD COLUMN IF NOT EXISTS restricted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.org_projects.restricted IS
  'Projeto confidencial: quando true, so quem esta em org_project_members ve o projeto e as tarefas dele. Quem altera esta coluna e limitado pelo trigger trg_org_projects_guarda_restricted, nao por RLS: policy nao restringe coluna.';

ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS project_restricted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.org_tasks.project_restricted IS
  'Espelho de org_projects.restricted, mantido por trigger. Existe para a policy de org_tasks nao pagar subconsulta por linha no board. Nunca escrever a mao.';

INSERT INTO public.org_project_members (project_id, user_id, role)
SELECT p.id, p.created_by, 'member'
FROM public.org_projects p
WHERE p.created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO public.org_project_members (project_id, user_id, role)
SELECT p.id, p.leader_id, 'leader'
FROM public.org_projects p
WHERE p.leader_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO public.org_project_members (project_id, user_id, role)
SELECT p.id, p.responsible_id, 'responsible'
FROM public.org_projects p
WHERE p.responsible_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.org_projects_sincroniza_membros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.org_project_members (project_id, user_id, role)
    SELECT NEW.id, u, r
    FROM (VALUES (NEW.leader_id, 'leader'),
                 (NEW.responsible_id, 'responsible'),
                 (NEW.created_by, 'member')) AS v(u, r)
    WHERE u IS NOT NULL
    ON CONFLICT (project_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF NEW.leader_id IS DISTINCT FROM OLD.leader_id THEN
    IF OLD.leader_id IS NOT NULL THEN
      DELETE FROM public.org_project_members m
       WHERE m.project_id = NEW.id
         AND m.user_id    = OLD.leader_id
         AND m.role       = 'leader'
         AND OLD.leader_id IS DISTINCT FROM NEW.responsible_id
         AND OLD.leader_id IS DISTINCT FROM NEW.created_by;
    END IF;

    IF NEW.leader_id IS NOT NULL THEN
      INSERT INTO public.org_project_members (project_id, user_id, role)
      VALUES (NEW.id, NEW.leader_id, 'leader')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
  END IF;

  IF NEW.responsible_id IS NOT NULL AND NEW.responsible_id IS DISTINCT FROM OLD.responsible_id THEN
    INSERT INTO public.org_project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.responsible_id, 'responsible')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.org_projects_sincroniza_membros() IS
  'Mantem lider, responsavel e criador dentro de org_project_members, para a lista de membros ser literalmente a lista de acesso. Criador so na criacao; lider antigo sai ao trocar.';

DROP TRIGGER IF EXISTS trg_org_projects_sincroniza_membros ON public.org_projects;
CREATE TRIGGER trg_org_projects_sincroniza_membros
  AFTER INSERT OR UPDATE OF leader_id, responsible_id ON public.org_projects
  FOR EACH ROW EXECUTE FUNCTION public.org_projects_sincroniza_membros();

CREATE OR REPLACE FUNCTION public.org_projects_espelha_restricted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.org_tasks
     SET project_restricted = NEW.restricted
   WHERE project_id = NEW.id
     AND project_restricted IS DISTINCT FROM NEW.restricted;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_org_projects_espelha_restricted ON public.org_projects;
CREATE TRIGGER trg_org_projects_espelha_restricted
  AFTER UPDATE OF restricted ON public.org_projects
  FOR EACH ROW EXECUTE FUNCTION public.org_projects_espelha_restricted();

CREATE OR REPLACE FUNCTION public.org_tasks_herda_restricted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  SELECT p.restricted INTO NEW.project_restricted
  FROM public.org_projects p WHERE p.id = NEW.project_id;
  NEW.project_restricted := coalesce(NEW.project_restricted, false);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_org_tasks_herda_restricted ON public.org_tasks;
CREATE TRIGGER trg_org_tasks_herda_restricted
  BEFORE INSERT OR UPDATE OF project_id ON public.org_tasks
  FOR EACH ROW EXECUTE FUNCTION public.org_tasks_herda_restricted();

CREATE OR REPLACE FUNCTION public.org_projects_guarda_restricted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.restricted IS DISTINCT FROM OLD.restricted
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Somente lider ou admin pode marcar ou desmarcar projeto confidencial'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_org_projects_guarda_restricted ON public.org_projects;
CREATE TRIGGER trg_org_projects_guarda_restricted
  BEFORE UPDATE OF restricted ON public.org_projects
  FOR EACH ROW EXECUTE FUNCTION public.org_projects_guarda_restricted();

DROP POLICY IF EXISTS rls_org_project_members_insert ON public.org_project_members;
CREATE POLICY rls_org_project_members_insert
  ON public.org_project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      NOT EXISTS (SELECT 1 FROM public.org_projects p
                   WHERE p.id = project_id AND p.restricted)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.org_projects p
                  WHERE p.id = project_id
                    AND (p.leader_id = auth.uid() OR p.responsible_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS rls_org_project_members_update ON public.org_project_members;
CREATE POLICY rls_org_project_members_update
  ON public.org_project_members FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (
      NOT EXISTS (SELECT 1 FROM public.org_projects p
                   WHERE p.id = project_id AND p.restricted)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.org_projects p
                  WHERE p.id = project_id
                    AND (p.leader_id = auth.uid() OR p.responsible_id = auth.uid()))
    )
  );
