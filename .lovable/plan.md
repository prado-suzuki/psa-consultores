

## Plano: Chamados da Equipe com Acesso Controlado

### Problema Atual
1. **Membros da equipe nao conseguem ver os chamados atribuidos a eles** -- a politica de seguranca do banco de dados (RLS) nao possui uma regra de leitura para membros da equipe verem tickets onde `assigned_to = auth.uid()`.
2. **A pagina `/equipe/chamados` nao esta registrada no controle de acessos**, entao o administrador nao pode liberar/restringir acesso por usuario.

### Solucao

#### 1. Corrigir politica de seguranca no banco de dados
Adicionar uma politica SELECT na tabela `tickets` para que membros da equipe possam ver os chamados atribuidos a eles:

```sql
CREATE POLICY "Team members can view assigned tickets"
ON public.tickets FOR SELECT
USING (
  has_role(auth.uid(), 'team_member') AND assigned_to = auth.uid()
);
```

Tambem adicionar uma politica UPDATE para que possam atualizar o status dos chamados atribuidos:

```sql
CREATE POLICY "Team members can update assigned tickets"
ON public.tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'team_member') AND assigned_to = auth.uid()
);
```

#### 2. Registrar a pagina no controle de acessos
Adicionar `/equipe/chamados` no arquivo `src/config/protectedPages.ts` para que o administrador possa gerenciar quem tem acesso:

```text
page_path: /equipe/chamados
page_name: Chamados Equipe
category: geral
requires_team_member: true
```

#### 3. Adicionar PageAccessGate na pagina
Envolver o conteudo de `EquipeChamados` com o componente `PageAccessGate` para verificar a permissao granular do usuario antes de exibir a pagina. Isso sera feito na rota em `App.tsx`:

```text
/equipe/chamados → TeamRoute → PageAccessGate → EquipeChamados
```

#### 4. Fazer o mesmo para a pagina de detalhes
A rota `/equipe/chamados/:id` tambem precisa do `PageAccessGate` para que o usuario consiga acessar os detalhes do chamado.

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | 2 novas politicas RLS (SELECT e UPDATE para team_member) |
| `src/config/protectedPages.ts` | Adicionar entrada para `/equipe/chamados` |
| `src/App.tsx` | Envolver rotas `/equipe/chamados` e `/equipe/chamados/:id` com `PageAccessGate` |

### Resultado Esperado
- Administradores poderao liberar acesso a `/equipe/chamados` para usuarios especificos no painel de Controle de Acessos
- Usuarios com acesso verao **somente os chamados atribuidos a eles**
- Usuarios com permissao de gestao (lider) continuam vendo todos os chamados

