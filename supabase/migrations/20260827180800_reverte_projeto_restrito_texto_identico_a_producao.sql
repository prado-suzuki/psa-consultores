-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260827180800, nome `reverte_projeto_restrito_texto_identico_a_producao` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

CREATE OR REPLACE FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    -- Admin vê tudo
    public.has_role(_user_id, 'admin'::app_role)
    -- Membro direto do projeto
    OR public.is_project_member(_user_id, _project_id)
    -- Fallback: responsável, líder ou criador
    OR EXISTS (
      SELECT 1 FROM public.org_projects p
      WHERE p.id = _project_id
        AND (p.responsible_id = _user_id OR p.leader_id = _user_id OR p.created_by = _user_id)
    )
    -- Líder: algum membro do projeto pertence a uma das áreas do líder
    OR (
      public.has_role(_user_id, 'lider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
      )
    )
    -- Sublíder: algum membro do projeto pertence a uma das equipes do sublíder
    OR (
      public.has_role(_user_id, 'sublider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.visible_org_project_ids(_uid uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT pid), '{}')::uuid[]
  FROM (
    -- membro direto
    SELECT opm.project_id AS pid
    FROM public.org_project_members opm
    WHERE opm.user_id = _uid

    UNION

    -- responsável, líder ou criador
    SELECT p.id
    FROM public.org_projects p
    WHERE p.responsible_id = _uid
       OR p.leader_id = _uid
       OR p.created_by = _uid

    UNION

    -- líder: membros do projeto pertencem a alguma equipe/área do líder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    -- sublíder: membros do projeto pertencem a equipe do sublíder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_uid))
  ) s
  WHERE pid IS NOT NULL;
$function$;
