-- Novidades: o marketing passa a gerenciar, ao lado do admin.
--
-- Até aqui só admin escrevia em `novidades`, e a área de marketing do grupo
-- precisa publicar e manter as novidades do site sem receber nenhum outro
-- acesso. Depende do papel criado em 20260806190000_app_role_marketing.sql.
--
-- O predicado fica numa função só, em vez de repetido em quatro políticas: se a
-- regra mudar (entrar outro papel, sair o marketing), muda em um lugar e as
-- quatro acompanham. Segue o padrão de `has_role` e `has_role_or_higher`, que
-- já são SECURITY DEFINER com search_path fixo.

CREATE OR REPLACE FUNCTION public.pode_gerenciar_novidades(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role_or_higher(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'marketing'::public.app_role)
$$;

COMMENT ON FUNCTION public.pode_gerenciar_novidades(uuid) IS
  'Quem cria, edita, apaga e enxerga novidades inativas: admin ou marketing.';

-- ── Leitura ampla ───────────────────────────────────────────────────────────
-- A tela de gestão lista com `select *` SEM filtrar `ativo`, apoiada nesta
-- política. Sem incluir o marketing aqui, desativar uma novidade a faria sumir
-- da lista deles, sem erro nenhum na tela e sem caminho de volta para reativar.
--
-- O nome antigo ("Admins podem ver todas novidades") passaria a mentir sobre o
-- que a política faz, por isso ela é substituída e não apenas alterada.
DROP POLICY IF EXISTS "Admins podem ver todas novidades" ON public.novidades;

CREATE POLICY novidades_select_gestao
  ON public.novidades
  FOR SELECT
  TO authenticated
  USING (public.pode_gerenciar_novidades(auth.uid()));

-- `novidades_select_publico` (ativo = true, para anon e authenticated) fica
-- intacta: o site continua lendo as novidades no ar sem exigir sessão.

-- ── Escrita ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS rls_novidades_insert ON public.novidades;
CREATE POLICY rls_novidades_insert
  ON public.novidades
  FOR INSERT
  TO authenticated
  WITH CHECK (public.pode_gerenciar_novidades(auth.uid()));

DROP POLICY IF EXISTS rls_novidades_update ON public.novidades;
CREATE POLICY rls_novidades_update
  ON public.novidades
  FOR UPDATE
  TO authenticated
  USING (public.pode_gerenciar_novidades(auth.uid()))
  WITH CHECK (public.pode_gerenciar_novidades(auth.uid()));

-- Apagar entra por decisão do usuário em 06/08/2026: a área ganha autonomia
-- completa sobre as próprias novidades. Não existe lixeira, então o caminho
-- reversível continua sendo desativar, não apagar.
DROP POLICY IF EXISTS rls_novidades_delete ON public.novidades;
CREATE POLICY rls_novidades_delete
  ON public.novidades
  FOR DELETE
  TO authenticated
  USING (public.pode_gerenciar_novidades(auth.uid()));
