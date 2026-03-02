

# Plano: Nova aba "Clientes" no Controle de Acessos

## Objetivo

Adicionar uma quarta aba "Clientes" em `EquipeControleAcessos.tsx` focada em usuarios com role `client`. A aba mostra a lista de clientes, permite selecionar um e gerenciar permissoes restritas apenas as paginas do ambiente de chamados (rotas `/cliente/*`).

---

## Alteracoes em `EquipeControleAcessos.tsx`

### 1. Nova aba no TabsList

Adicionar tab "Clientes" com icone `Users` apos "Cadastros":

```text
<TabsTrigger value="clientes">
  <Users /> Clientes
</TabsTrigger>
```

### 2. Filtro de usuarios clientes

Derivar lista `clientUsers` filtrando `users` por quem tem role `client`:

```text
const clientUsers = users?.filter(u => u.roles.includes('client'));
```

### 3. Filtro de paginas de chamados

Filtrar `pages` para exibir apenas as da categoria `gestao` (chamados) ou com path iniciando em `/cliente`:

```text
const clientPages = pages?.filter(p => 
  p.category === 'gestao' || p.page_path.startsWith('/cliente')
);
```

### 4. Conteudo da aba

Layout identico a aba "Usuarios" (grid 1/3 + 2/3):
- **Coluna esquerda**: lista de usuarios clientes com busca, nome, email e badges
- **Coluna direita**: permissoes do cliente selecionado, mostrando apenas paginas de chamados com botoes Conceder/Revogar
- Reutilizar `selectedUserId`, `hasAccess`, `grantAccessMutation` e `revokeAccessMutation` ja existentes
- Adicionar estado `selectedClientId` separado para nao conflitar com a aba de usuarios da equipe

### 5. Sem criacao de usuario na aba

Nao incluir botao "Criar Novo Usuario" -- clientes sao cadastrados via Gestao de Clientes. Apenas visualizacao e controle de permissoes.

---

## Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| `EquipeControleAcessos.tsx` | Nova aba "Clientes", estado `selectedClientId`, filtros de usuarios e paginas |

Nenhuma migracao SQL necessaria -- reutiliza as tabelas `page_permissions` e `user_page_access` existentes.

