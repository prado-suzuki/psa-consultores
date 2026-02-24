

# Atualizar permissoes de criacao de tarefas e projetos Tax

## Resumo

Ajustar as politicas de seguranca (RLS) no banco de dados para refletir as regras corretas de acesso:

- **Criar tarefas fiscais**: `team_member`, `admin` ou `lider`
- **Criar projetos tax**: somente `admin` ou `lider`

## Situacao atual

| Tabela | Acao | Roles permitidas atualmente |
|--------|------|---------------------------|
| `fiscal_tasks` | INSERT | `team_member`, `admin` |
| `tax_projects` | INSERT | `team_member`, `admin` |
| `tax_projects` | DELETE | `admin` |

## Mudancas necessarias

### 1. fiscal_tasks - INSERT
Adicionar `lider` a politica de criacao de tarefas.

**De:** `team_member` OR `admin`
**Para:** `team_member` OR `admin` OR `lider`

### 2. tax_projects - INSERT
Restringir criacao de projetos somente a `admin` e `lider`, removendo `team_member`.

**De:** `team_member` OR `admin`
**Para:** `admin` OR `lider`

### 3. tax_projects - DELETE
Adicionar `lider` para poder deletar projetos tambem (consistencia com permissao de criacao).

**De:** `admin`
**Para:** `admin` OR `lider`

## Detalhes tecnicos

Uma unica migracao SQL sera criada com os seguintes comandos:

```text
-- 1. fiscal_tasks: adicionar lider ao INSERT
DROP POLICY "Team members can create fiscal tasks" ON fiscal_tasks;
CREATE POLICY "Team members can create fiscal tasks" ON fiscal_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'team_member') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );

-- 2. tax_projects: restringir INSERT a admin e lider
DROP POLICY "Team members can create tax_projects" ON tax_projects;
CREATE POLICY "Admins and leaders can create tax_projects" ON tax_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );

-- 3. tax_projects: adicionar lider ao DELETE
DROP POLICY "Admins can delete tax_projects" ON tax_projects;
CREATE POLICY "Admins and leaders can delete tax_projects" ON tax_projects
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'lider')
  );
```

Nenhuma alteracao de codigo frontend e necessaria -- as regras sao aplicadas diretamente no banco.

