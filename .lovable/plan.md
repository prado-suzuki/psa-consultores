

# Mover "Gestão de Clientes" para a área de Acessos

## Resumo
Remover a página "Gestão de Clientes" do menu Digital Dev e adicioná-la como uma nova aba "Cadastros Clientes" dentro da página `EquipeControleAcessos` (área de Acessos).

## Alterações

### 1. `src/components/equipe/dev/DevLayout.tsx` (linha 60)
Remover o item de menu `Gestão de clientes` do sidebar do Dev.

### 2. `src/pages/equipe/dev/GestaoClientes.tsx`
Refatorar para exportar o conteúdo **sem** o wrapper `<DevLayout>`, criando um componente reutilizável (ex: `GestaoClientesContent`) que pode ser embarcado como aba. Manter o export default com DevLayout para compatibilidade de rota (caso queira manter a rota legada) ou remover.

### 3. `src/pages/equipe/EquipeControleAcessos.tsx`
- Adicionar nova `TabsTrigger` chamada **"Cadastros Clientes"** (após a aba "Clientes" existente, ~linha 842)
- Adicionar `TabsContent` correspondente que renderiza o conteúdo de `GestaoClientes` (sem DevLayout)
- Importar o componente refatorado

### 4. `src/App.tsx` (linha 148)
Remover ou redirecionar a rota `/equipe/dev/gestao-clientes`. Opcionalmente adicionar redirect para `/equipe/acessos`.

### 5. `src/config/protectedPages.ts`
Remover a entrada `'/equipe/dev/gestao-clientes'` da lista de páginas protegidas (já que agora faz parte da página de Acessos, que é `AdminRoute`).

