-- Reorganização do dropdown Gerencial: Logs de Equipe e Chamados em Tax e OSG.
--
-- POR QUE ISTO É UMA MIGRAÇÃO, e não trabalho do sincronizador de páginas
-- (`useSyncProtectedPages`): ele casa os registros pelo CAMINHO, insere o que é
-- novo e atualiza metadados, mas NUNCA copia permissão nem apaga o que sumiu do
-- código. Deixado por conta dele, o resultado seria telas novas cadastradas e
-- vazias, e as permissões de todo mundo penduradas nos endereços velhos.
--
-- ORDEM: roda ANTES do sincronizador. Invertendo, ele cria os registros novos
-- zerados e esta migração passa a não ter o que preencher.
--
-- Tudo aqui é idempotente: os WHERE não casam nada na segunda execução.

-- ── 1. Logs de Equipe: a auditoria muda de endereço ─────────────────────────
--
-- UPDATE no registro que já existe, e não INSERT de um novo: assim a identidade
-- é preservada e as permissões vêm junto, sem ninguém precisar reconceder.

UPDATE public.page_permissions
   SET page_path = '/equipe/tax/gerencial/logs-equipe',
       page_name = 'Logs de Equipe (Tax)'
 WHERE page_path = '/equipe/tax/auditoria';

UPDATE public.page_permissions
   SET page_path = '/equipe/osg/gerencial/logs-equipe',
       page_name = 'Logs de Equipe (OSG)'
 WHERE page_path = '/equipe/osg/auditoria';

-- ── 2. Chamados: registros novos em Tax e OSG ───────────────────────────────
--
-- Aqui NÃO dá para mudar o endereço do registro antigo: uma página vira duas
-- (Tax e OSG), e um registro não se divide. Então nascem dois pares novos, e o
-- passo 3 copia as permissões para eles ANTES de o passo 4 apagar os antigos.

INSERT INTO public.page_permissions
  (page_path, page_name, page_description, category, requires_admin, requires_team_member, is_active)
VALUES
  ('/equipe/tax/gerencial/chamados', 'Gestão de Chamados (Tax)',
   'Lista e gestão dos chamados dos clientes (somente líder+)', 'tax', false, true, true),
  ('/equipe/tax/gerencial/chamados/dashboard', 'Dashboard de Chamados (Tax)',
   'Panorama de chamados: KPIs, prazos e rankings (somente líder+)', 'tax', false, true, true),
  ('/equipe/osg/gerencial/chamados', 'Gestão de Chamados (OSG)',
   'Lista e gestão dos chamados dos clientes (somente líder+)', 'osg', false, true, true),
  ('/equipe/osg/gerencial/chamados/dashboard', 'Dashboard de Chamados (OSG)',
   'Panorama de chamados: KPIs, prazos e rankings (somente líder+)', 'osg', false, true, true)
ON CONFLICT (page_path) DO NOTHING;

-- ── 3. As permissões: todo líder ou admin recebe as quatro telas ────────────
--
-- A trava da rota é dupla (papel + permissão nominal), então conceder a quem
-- não é líder não abriria nada. Conceder a TODOS os líderes de uma vez cobre os
-- 11 que já tinham a tela antiga e os 3 que não tinham (Alexandre Silva, James
-- Funaro e a conta de automação), sem precisar de lista fixa de ids.
--
-- Consequência conhecida e desejada: o usuário de marketing tem hoje o
-- dashboard antigo de chamados e NÃO recebe os novos, porque não é líder. É o
-- combinado — a área de Marketing fica com Novidades e Contatos.

INSERT INTO public.user_page_access (user_id, page_permission_id)
SELECT u.user_id, pp.id
  FROM (SELECT DISTINCT user_id FROM public.user_roles
         WHERE role IN ('lider'::app_role, 'admin'::app_role)) u
 CROSS JOIN public.page_permissions pp
 WHERE pp.page_path IN (
         '/equipe/tax/gerencial/chamados',
         '/equipe/tax/gerencial/chamados/dashboard',
         '/equipe/osg/gerencial/chamados',
         '/equipe/osg/gerencial/chamados/dashboard')
ON CONFLICT (user_id, page_permission_id) DO NOTHING;

-- ── 4. Só agora os cadastros antigos saem ───────────────────────────────────
--
-- As rotas `/gestao/chamados` e `/gestao/chamados/dashboard` passaram a
-- redirecionar, então estes registros ficariam órfãos: permissões vivas na
-- árvore de acessos apontando para telas que não existem mais, e um admin
-- marcando a caixinha achando que libera algo.
--
-- As permissões saem primeiro por causa da referência.

DELETE FROM public.user_page_access
 WHERE page_permission_id IN (
   SELECT id FROM public.page_permissions
    WHERE page_path IN ('/gestao/chamados', '/gestao/chamados/dashboard'));

DELETE FROM public.page_permissions
 WHERE page_path IN ('/gestao/chamados', '/gestao/chamados/dashboard');

-- ── Conferência (não altera nada) ───────────────────────────────────────────
--
-- Esperado: seis linhas, nenhuma com zero pessoas, e as quatro de chamados com
-- a mesma contagem (todo líder ou admin). Os endereços antigos não devem
-- aparecer.
--
--   SELECT pp.page_path, pp.page_name,
--          (SELECT count(*) FROM user_page_access u
--            WHERE u.page_permission_id = pp.id) AS pessoas
--     FROM page_permissions pp
--    WHERE pp.page_path LIKE '%logs-equipe'
--       OR pp.page_path LIKE '%gerencial/chamados%'
--       OR pp.page_path LIKE '/gestao/chamados%'
--    ORDER BY pp.page_path;
