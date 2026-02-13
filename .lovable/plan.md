

## Plano: Membros de Projeto Tax com Visibilidade Restrita

### Problema Atual
Hoje, qualquer membro da equipe com role `team_member` pode ver **todos** os projetos Tax e todas as tarefas. O formulario de criacao de projeto permite selecionar apenas 1 Responsavel Interno e 1 Lider, sem opcao de associar multiplos membros. Nao existe mecanismo para restringir a visibilidade dos projetos e tarefas apenas aos membros associados.

### Solucao

#### 1. Criar tabela de membros do projeto (`tax_project_members`)

Nova tabela de juncao N:N entre `tax_projects` e `profiles`:

```text
tax_project_members
- id (uuid, PK)
- project_id (uuid, FK -> tax_projects.id ON DELETE CASCADE)
- user_id (uuid, FK -> auth.users.id)
- role (text) -- 'member', 'leader', 'responsible'
- created_at (timestamptz)
```

RLS: membros da equipe podem ver membros dos projetos a que pertencem; admins veem tudo. INSERT/UPDATE/DELETE restrito a admins e lideres do projeto.

#### 2. Atualizar politicas RLS de `tax_projects`

Substituir a politica SELECT atual por uma que verifica se o usuario e membro do projeto:

```sql
-- Admins veem tudo
CREATE POLICY "Admins can view all tax_projects"
ON public.tax_projects FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Membros so veem projetos associados
CREATE POLICY "Members can view their tax_projects"
ON public.tax_projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tax_project_members
    WHERE project_id = tax_projects.id
    AND user_id = auth.uid()
  )
);
```

Mesma logica para UPDATE -- so membros do projeto podem editar.

#### 3. Atualizar politicas RLS de `fiscal_tasks`

Substituir a politica SELECT atual por uma que verifica se o usuario e membro do projeto vinculado:

```sql
-- Admins veem tudo
CREATE POLICY "Admins can view all fiscal_tasks"
ON public.fiscal_tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Membros veem tarefas dos seus projetos ou sem projeto
CREATE POLICY "Members can view their project fiscal_tasks"
ON public.fiscal_tasks FOR SELECT
USING (
  project_id IS NULL
  OR EXISTS (
    SELECT 1 FROM tax_project_members
    WHERE project_id = fiscal_tasks.project_id
    AND user_id = auth.uid()
  )
);
```

#### 4. Atualizar formulario de criacao/edicao de projeto

No modal de criacao (`FiscalProjetosCadastro.tsx`):

- Adicionar campo **"Membros do Projeto"** com selecao multipla de membros da equipe (checkboxes ou multi-select)
- Ao criar o projeto, inserir automaticamente os membros selecionados na tabela `tax_project_members`
- O Responsavel Interno e o Lider Responsavel sao automaticamente adicionados como membros (roles `responsible` e `leader`)
- Ao editar, exibir os membros atuais e permitir adicionar/remover

Mudancas no `formData`:
```text
member_ids: string[]  -- novo campo
```

Na mutation de criacao, apos inserir o projeto, inserir os membros:
```text
1. Insert tax_project
2. Insert tax_project_members (member_ids + responsible_id + leader_id)
```

#### 5. Filtrar projetos na listagem

Na query de listagem de projetos, a RLS ja cuidara de filtrar automaticamente -- o usuario so vera os projetos dos quais e membro. Nenhuma mudanca no frontend de listagem e necessaria alem de invalidar queries corretamente.

### Resumo das Alteracoes

| Componente | Alteracao |
|---|---|
| Migracao SQL | Criar tabela `tax_project_members` com RLS |
| Migracao SQL | Substituir RLS de `tax_projects` (SELECT/UPDATE baseado em membership) |
| Migracao SQL | Substituir RLS de `fiscal_tasks` (SELECT/UPDATE baseado em membership do projeto) |
| `FiscalProjetosCadastro.tsx` | Adicionar multi-select de membros no formulario; salvar membros na tabela de juncao |
| `useFiscalTasks.ts` | Nenhuma mudanca necessaria (RLS filtra automaticamente) |

### Resultado Esperado
- Ao criar um projeto, o lider seleciona quais membros fazem parte
- Somente membros associados ao projeto podem ver e editar o projeto e suas tarefas
- Admins continuam com visibilidade total
- Membros nao associados nao veem o projeto na listagem

