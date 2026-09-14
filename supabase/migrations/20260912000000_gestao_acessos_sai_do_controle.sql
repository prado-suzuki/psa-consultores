-- `/gestao/acessos` deixa de existir como página, e a linha dela sai do controle
-- de acessos.
--
-- POR QUE. A rota montava a matriz de papéis (`UsersRolesView variant="full"`)
-- dentro do `GestaoLayout` — cuja barra lateral tem DOIS itens, Novidades e
-- Contatos, nenhum deles este. Nada no produto linkava para ela: a tela existia,
-- funcionava, e só abria digitando a URL. O conteúdo virou a seção "Papéis" de
-- `/equipe/acessos`, que é onde o resto do controle de acesso já mora, e a rota
-- virou `Navigate` para lá.
--
-- POR QUE UMA MIGRAÇÃO, E NÃO SÓ TIRAR DO `protectedPages.ts`. Porque o
-- sincronizador **insere e atualiza, mas nunca apaga** o que sumiu daquele
-- arquivo — está escrito no próprio `src/config/protectedPages.ts`, ao lado de
-- `/gestao/contatos`, e foi o mesmo motivo pelo qual `/gestao/chamados` precisou
-- de migração quando as telas dele mudaram de área. Sem este DELETE a linha fica
-- em `page_permissions` para sempre, aparecendo na aba "Páginas" como uma página
-- que não existe mais.
--
-- O QUE ISSO APAGA JUNTO, MEDIDO EM PRODUÇÃO EM 12/09/2026. A FK
-- `user_page_access_page_permission_id_fkey` é `ON DELETE CASCADE`, então as
-- concessões penduradas na linha vão junto:
--
--     concessões em /gestao/acessos ....... 14
--     concessões em /equipe/acessos ........  9
--     nas duas ............................  9
--     só na que sai .......................  5   <- destas, 1 é admin
--
-- O admin não perde nada: `usePageAccess` devolve `true` para admin antes de
-- olhar a tabela. As outras 4 são não-admin e hoje CONSEGUIRIAM abrir a tela —
-- o `GestaoAccessGate` só consulta `usePageAccess`, então o `requires_admin` do
-- cadastro nunca foi aplicado ali. Depois do redirect elas batem no `AdminRoute`
-- de `/equipe/acessos` e vão para `/cliente`. É perda real, e é aceita: a tela
-- não tinha como ser alcançada por menu nenhum.
--
-- Idempotente: rodar duas vezes não faz diferença.

DELETE FROM public.page_permissions
WHERE page_path = '/gestao/acessos';

-- O sufixo "(Equipe)" existia só para distinguir de `/gestao/acessos`, que era a
-- MESMA permissão cadastrada duas vezes: mesma categoria `gestao`, mesmo
-- `requires_admin`, mesmo `requires_team_member`. Com aquela fora, o parêntese
-- só confunde quem lê a lista.
--
-- O sincronizador atualizaria este nome sozinho na próxima vez que alguém
-- clicasse em "Atualizar" na aba Páginas. Fazer aqui evita que o banco fique
-- discordando do `protectedPages.ts` enquanto ninguém clica.
UPDATE public.page_permissions
SET page_name = 'Controle de Acessos'
WHERE page_path = '/equipe/acessos'
  AND page_name <> 'Controle de Acessos';
