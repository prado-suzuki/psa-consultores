
Objetivo: fazer a tela `/equipe/acessos` mostrar corretamente as demais telas relevantes do sistema e garantir que elas possam ser realmente controladas por permissão.

O que verifiquei
- O preview de `/equipe/acessos` está carregando normalmente: cabeçalho, cards, abas e tabela aparecem.
- O problema não é mais “sem preview”; o problema é de cobertura/visualização das telas.
- A aba “Páginas” não lê as rotas do app diretamente. Ela mostra apenas o que existe em `page_permissions`.
- `page_permissions` é alimentada pelo botão “Atualizar lista”, mas essa sincronização usa como fonte `src/config/protectedPages.ts`.
- Em `src/App.tsx` existem várias rotas funcionais que não estão em `PROTECTED_PAGES`, então nunca aparecem no controle de acessos.
- Além disso, várias rotas da equipe ainda não usam `PageAccessGate`, então hoje nem seriam controladas por página mesmo que fossem cadastradas.
- A UI também esconde parte dos itens por categoria com o limite inicial de 5 páginas + “Mostrar mais”.

Causa raiz
Há um desalinhamento entre:
1. as rotas reais do sistema em `App.tsx`
2. o catálogo de páginas gerenciáveis em `protectedPages.ts`
3. as rotas que realmente aplicam `PageAccessGate`

Plano de implementação
1. Completar o catálogo de páginas
- Revisar as rotas funcionais de `App.tsx` e incluir no `PROTECTED_PAGES` tudo que deve aparecer no controle de acessos.
- Incluir as rotas core que hoje não aparecem, como por exemplo:
  - `/equipe/dashboard`
  - `/equipe/relatorios`
  - `/equipe/kanban`
  - `/equipe/sprints`
  - `/equipe/daily`
  - `/equipe/rotinas`
  - `/equipe/tarefas`
  - `/equipe/tarefas/nova`
  - `/equipe/processos`
  - `/equipe/projetos`
  - `/equipe/biblioteca`
  - `/equipe/backlog`
- Manter fora apenas rotas técnicas/auth/fluxo estrutural, como login, reset, primeiro acesso e afins.

2. Fazer a permissão valer nas telas faltantes
- Envolver com `PageAccessGate` as rotas que entrarem no catálogo e hoje usam apenas `TeamRoute`.
- Seguir o padrão já existente nas áreas Dev/Tax/OSG/Board, inclusive para rotas dinâmicas que reutilizam um `pagePath` base.

3. Melhorar a visualização da aba “Páginas”
- Ajustar a UX para não parecer que faltam telas:
  - expandir categorias por padrão, ou
  - adicionar “Expandir tudo / Recolher tudo”.
- Manter agrupamento por categoria, mas facilitar auditoria completa.

4. Sincronizar os registros
- Depois de completar `PROTECTED_PAGES`, rodar o fluxo atual de sincronização para popular `page_permissions` com as rotas faltantes.
- Conferir se a contagem e a listagem em `/equipe/acessos` passam a refletir o conjunto esperado.

5. Evitar regressão
- Adicionar uma checagem simples para evitar novo desencontro entre rotas e catálogo.
- A solução mais enxuta é um teste/validação que avise quando uma nova rota protegida for criada sem registro correspondente em `PROTECTED_PAGES`.

Detalhes técnicos
- Arquivos principais:
  - `src/App.tsx`
  - `src/config/protectedPages.ts`
  - `src/components/acessos/PagesTab.tsx`
- Comportamento atual importante:
  - `PagesTab` usa `usePagePermissions()`
  - `useSyncProtectedPages()` só insere páginas que já existem em `PROTECTED_PAGES`
  - por isso clicar “Atualizar lista” não resolve rotas ausentes do catálogo
- Regras atuais a preservar:
  - admin continua com acesso total
  - páginas da categoria `geral` continuam acessíveis a usuários internos
  - páginas por área continuam respeitando estrutura/categoria e acessos explícitos

Resultado esperado
- `/equipe/acessos` passa a exibir todas as telas relevantes de negócio que precisam de controle de acesso.
- As telas listadas também passam a ser efetivamente controladas por permissão.
- O administrador consegue enxergar e auditar o sistema com menos itens ocultos e menos divergência entre rota real e catálogo de acessos.
