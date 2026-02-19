

# Implementar Areas e Categorias com tabela de vinculo para projetos Tax

## Resumo
Criar tabelas de referencia (tax_areas, tax_categorias, tax_area_categorias), uma tabela de vinculo projeto-categoria (tax_project_categorias), alterar tax_projects para usar area_id (UUID FK), e atualizar o formulario para buscar dados do banco com filtragem dinamica.

## 1. Migration SQL

### Passo 1: Deletar projeto de teste existente
```sql
DELETE FROM tax_project_members WHERE project_id = '78ecc13f-9f8f-4d1f-b250-c2660eee370a';
DELETE FROM tax_projects WHERE id = '78ecc13f-9f8f-4d1f-b250-c2660eee370a';
```

### Passo 2: Criar tabelas de referencia
- **tax_areas** (id uuid PK, nome text UNIQUE NOT NULL)
- **tax_categorias** (id uuid PK, nome text UNIQUE NOT NULL)
- **tax_area_categorias** (id uuid PK, area_id FK, categoria_id FK, UNIQUE(area_id, categoria_id))

### Passo 3: Criar tabela de vinculo projeto-categoria
- **tax_project_categorias** (id uuid PK, project_id FK -> tax_projects ON DELETE CASCADE, categoria_id FK -> tax_categorias ON DELETE RESTRICT, UNIQUE(project_id, categoria_id))

### Passo 4: Alterar tax_projects
- DROP colunas `area` (text) e `categories` (text[])
- ADD coluna `area_id` (uuid, FK para tax_areas, nullable)

### Passo 5: Popular dados
Inserir as 5 areas e ~47 categorias unicas com todos os vinculos many-to-many.

### Passo 6: RLS
- tax_areas, tax_categorias, tax_area_categorias: SELECT para team_member/admin; INSERT/UPDATE/DELETE para admin
- tax_project_categorias: SELECT para team_member/admin; INSERT/DELETE para team_member/admin (necessario para criar/editar projetos)

## 2. Alteracoes no formulario (FiscalProjetosCadastro.tsx)

### Interface e formData
- `area` passa a ser `area_id` (UUID)
- `categories` passa a ser `category_ids` (UUID[])

### Queries adicionais
- Buscar `tax_areas` (id, nome)
- Buscar `tax_categorias` (id, nome)
- Buscar `tax_area_categorias` (area_id, categoria_id)
- Ao editar: buscar `tax_project_categorias` onde project_id = id

### Remover
- Constantes `AREA_OPTIONS` e `CATEGORY_OPTIONS`

### Campo Area (Select)
- Exibe nome da area, salva UUID (area_id)
- Ao trocar area, limpa categorias selecionadas (useEffect)

### Campo Categoria (Checkboxes)
- Filtradas pela area selecionada via tax_area_categorias
- Exibe nome da categoria, salva UUID

### Mutations
- **Criar**: insere em tax_projects com area_id, depois insere em tax_project_categorias uma linha por categoria
- **Editar**: atualiza tax_projects com area_id, deleta vinculos existentes em tax_project_categorias, reinsere os novos
- **Deletar**: ON DELETE CASCADE remove vinculos automaticamente

### Listagem
- Query de projetos faz join: `area_ref:tax_areas(id, nome)`
- Para categorias na listagem, buscar separadamente ou exibir apenas na edicao
- `getAreaLabel` usa o join para exibir o nome

## 3. Dados populados

**Areas**: Fixos, Pontuais, Levantamento de Credito, Societario, Estudos e Pesquisas

**Categorias e vinculos**: conforme especificado pelo usuario (47 categorias unicas com vinculos many-to-many entre areas)

## Detalhes tecnicos

### Fluxo de criacao de projeto
```text
1. Usuario preenche formulario, seleciona area_id e category_ids
2. INSERT em tax_projects (com area_id, sem categories)
3. INSERT em tax_project_categorias (uma linha por categoria_id)
4. INSERT em tax_project_members (responsavel, lider, membros)
```

### Fluxo de edicao
```text
1. Carregar projeto com join em tax_areas
2. Carregar vinculos de tax_project_categorias onde project_id = id
3. Popular formData com area_id e category_ids
4. UPDATE tax_projects (area_id)
5. DELETE FROM tax_project_categorias WHERE project_id = id
6. INSERT novos vinculos em tax_project_categorias
```

### Filtragem de categorias no formulario
```text
1. useMemo: filtrar tax_area_categorias onde area_id === formData.area_id
2. Retornar lista de categoria_ids vinculados
3. Buscar nomes em tax_categorias
4. Renderizar checkboxes apenas para categorias filtradas
5. useEffect: ao mudar area_id, limpar category_ids
```

