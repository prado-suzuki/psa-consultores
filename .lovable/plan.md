

# Duplicar Cadastros Clientes no módulo TAX

## Resumo

Criar uma nova página no módulo TAX que renderiza o mesmo componente `GestaoClientesContent`, adicionando-a como submenu em "Projetos" acima de "Cadastro". A edição só será permitida para quem tem acesso à página.

## Alterações

### 1. Nova página `src/pages/equipe/fiscal/FiscalCadastrosClientes.tsx`

Página wrapper simples que usa `FiscalLayout` e renderiza `GestaoClientesContent` (o mesmo componente já usado em Controle de Acessos). Dados compartilham a mesma tabela — qualquer alteração reflete em ambos os locais.

### 2. Rota em `src/App.tsx`

Adicionar rota `/equipe/tax/projetos/clientes` com `TeamRoute` + `PageAccessGate`.

### 3. Menu lateral `src/components/equipe/fiscal/FiscalSidebar.tsx`

Adicionar item filho "Clientes" no submenu "Projetos", **acima** de "Cadastro":

```text
Projetos
  ├── Clientes      ← NOVO (path: /equipe/tax/projetos/clientes)
  ├── Cadastro
  └── Tarefas
```

### 4. Controle de edição

O componente `GestaoClientesContent` já é renderizado dentro de `PageAccessGate`, que garante que apenas quem tem permissão de acesso à página pode visualizá-la. Como o acesso é controlado via `usePageAccess` (membership na estrutura ou permissão manual), somente membros autorizados poderão editar.

## Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalCadastrosClientes.tsx` | **Novo** — wrapper com FiscalLayout + GestaoClientesContent |
| `src/App.tsx` | Nova rota `/equipe/tax/projetos/clientes` |
| `src/components/equipe/fiscal/FiscalSidebar.tsx` | Novo item "Clientes" no submenu Projetos |

