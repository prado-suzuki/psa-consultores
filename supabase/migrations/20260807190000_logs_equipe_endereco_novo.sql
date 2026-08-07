-- Auditoria vira "Logs de Equipe", dentro do dropdown Gerencial da Tax e da OSG.
--
-- ATENÇÃO AO MOTIVO DE ISTO SER UMA MIGRAÇÃO, e não trabalho do sincronizador
-- de páginas (`useSyncProtectedPages`): ele casa os registros pelo CAMINHO. Um
-- caminho novo, para ele, é uma página nova. Ele inseriria um registro zerado,
-- sem permissão para ninguém, e deixaria o antigo para trás carregando as
-- permissões de todo mundo apontando para uma tela que não existe mais.
--
-- Resultado prático de deixar por conta dele: as 25 pessoas com a auditoria da
-- Tax e as 15 da OSG perderiam a tela de uma vez, e a árvore de permissões
-- continuaria mostrando tudo marcado, porque as marcações seguiriam existindo
-- apontando para o endereço morto.
--
-- Fazendo UPDATE no registro que já existe, a identidade é preservada e as
-- permissões vêm junto sem ninguém precisar reconceder. Ninguém ganha e ninguém
-- perde acesso.
--
-- ORDEM: esta migração roda ANTES do sincronizador. Invertendo, ele cria as
-- duplicatas primeiro e o estrago já está feito.
--
-- Idempotente: o WHERE não casa nada na segunda execução.

UPDATE public.page_permissions
   SET page_path = '/equipe/tax/gerencial/logs-equipe',
       page_name = 'Logs de Equipe (Tax)'
 WHERE page_path = '/equipe/tax/auditoria';

UPDATE public.page_permissions
   SET page_path = '/equipe/osg/gerencial/logs-equipe',
       page_name = 'Logs de Equipe (OSG)'
 WHERE page_path = '/equipe/osg/auditoria';

-- Conferência (não altera nada). Esperado: duas linhas, com a contagem de
-- pessoas idêntica à de antes — 25 na Tax e 15 na OSG em 07/08/2026.
--
--   SELECT pp.page_path, pp.page_name,
--          (SELECT count(*) FROM user_page_access u
--            WHERE u.page_permission_id = pp.id) AS pessoas
--     FROM page_permissions pp
--    WHERE pp.page_path LIKE '%logs-equipe';
