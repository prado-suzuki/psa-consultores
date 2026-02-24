

# Renomear rotas de /equipe/tex/ para /equipe/tax/

## Resumo

Corrigir os caminhos de URL da area Tax, substituindo `/equipe/tex/` por `/equipe/tax/` em todos os arquivos do frontend e nos registros do banco de dados.

## Arquivos a alterar

### 1. src/App.tsx
Atualizar as 4 rotas:
- `/equipe/tex/dashboard` -> `/equipe/tax/dashboard`
- `/equipe/tex/projetos/cadastro` -> `/equipe/tax/projetos/cadastro`
- `/equipe/tex/projetos/tarefas` -> `/equipe/tax/projetos/tarefas`
- `/equipe/tex/auditoria` -> `/equipe/tax/auditoria`

### 2. src/components/equipe/fiscal/FiscalSidebar.tsx
Atualizar os 4 caminhos no array `menuItems`.

### 3. src/config/protectedPages.ts
Atualizar os 4 `page_path` de `/equipe/tex/` para `/equipe/tax/`.

### 4. src/pages/equipe/EquipeAuth.tsx
Atualizar o redirecionamento `tax: '/equipe/tex/dashboard'` para `tax: '/equipe/tax/dashboard'`.

### 5. Banco de dados (page_permissions)
Atualizar os registros existentes na tabela `page_permissions`:

```text
UPDATE page_permissions SET page_path = '/equipe/tax/dashboard' WHERE page_path = '/equipe/tex/dashboard';
UPDATE page_permissions SET page_path = '/equipe/tax/projetos/cadastro' WHERE page_path = '/equipe/tex/projetos/cadastro';
UPDATE page_permissions SET page_path = '/equipe/tax/projetos/tarefas' WHERE page_path = '/equipe/tex/projetos/tarefas';
UPDATE page_permissions SET page_path = '/equipe/tax/auditoria' WHERE page_path = '/equipe/tex/auditoria';
```

## Impacto

- 4 arquivos frontend alterados (substituicao direta de texto)
- 4 registros no banco atualizados
- Nenhuma logica de negocio alterada, apenas correcao de nomenclatura nas URLs

