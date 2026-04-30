
## Diagnóstico

### `/admin/chamados` (legado — a remover)
- Componentes: `AdminChamados.tsx` + `AdminDetalhesChamado.tsx`.
- Substituída integralmente por `/gestao/chamados` (controle granular via `page_permissions`, layout `GestaoLayout`, melhorias recentes como seletor de Prazo).
- Usada em 4 lugares apenas: `App.tsx` (rotas), `AdminDashboard.tsx` (card), `AdminLayout.tsx` (NotificationPopover + PendingTicketsAlert).

### `/admin/clientes` — qual a função hoje
A rota renderiza `AdminClientes.tsx`, que:
- Faz um `select * from profiles` direto (viola a regra do projeto: nada de Supabase em componente, e direct-select em `profiles` deveria usar `profiles_safe`/RPC).
- Lista perfis com nome, telefone, empresa e data de cadastro, com busca por nome/empresa.
- **Não edita, não exclui, não cria** — é apenas uma listagem read-only de profiles.
- Sobreposição funcional: o módulo real de clientes (pessoa jurídica/contribuinte) vive em `/equipe/tax/projetos/clientes` (`FiscalCadastrosClientes`) e `/equipe/dev/gestao-clientes`. Gestão de **usuários** acontece em `/equipe/acessos` (`EquipeControleAcessos`) e `/gestao/acessos`.
- Conclusão: `/admin/clientes` é uma tela órfã, redundante e fora do padrão arquitetural. Único acesso é o card no `AdminDashboard`.

## Plano de execução

### 1. Remover `/admin/chamados` (e detalhe)
- `src/App.tsx`: remover imports `AdminChamados`, `AdminDetalhesChamado` e as duas `<Route>` correspondentes.
- `src/pages/admin/AdminDashboard.tsx`: trocar o card "Gerenciar Chamados" para navegar a `/gestao/chamados` (mantém atalho útil para admins).
- `src/components/administracao/AdminLayout.tsx`: trocar `navigateTo="/admin/chamados"` por `"/gestao/chamados"` no `NotificationPopover` e `PendingTicketsAlert`.
- Excluir arquivos `src/pages/admin/AdminChamados.tsx` e `src/pages/admin/AdminDetalhesChamado.tsx`.

### 2. Remover `/admin/clientes`
- `src/App.tsx`: remover import `AdminClientes` e a `<Route>`.
- `src/pages/admin/AdminDashboard.tsx`: remover o card "Gerenciar Clientes" (ou substituir por atalho a `/equipe/acessos` se quiser preservar um caminho rápido para gestão de usuários — confirmar abaixo).
- Excluir `src/pages/admin/AdminClientes.tsx`.

### 3. Verificação
- Rodar `rg "admin/chamados|admin/clientes|AdminChamados|AdminClientes|AdminDetalhesChamado"` para garantir zero referências remanescentes.

## Pergunta antes de executar

O card "Gerenciar Clientes" do `AdminDashboard` deve:
- (a) ser **simplesmente removido** (recomendado — gestão de clientes/usuários já tem páginas próprias), ou
- (b) ser **redirecionado** para `/equipe/acessos` (gestão de usuários) ou `/equipe/tax/projetos/clientes` (cadastro fiscal de clientes)?

Posso prosseguir com a opção (a) por padrão se você aprovar sem responder.
