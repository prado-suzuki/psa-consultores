

# Relacionar Serviços Prestados às Áreas da Estrutura Organizacional

## Problema atual
- A tabela `tax_categorias` possui apenas `id` e `nome` — sem vínculo com áreas.
- A sub-aba "Serviços Prestados" em Cadastro Categorias é apenas um alias para `CategoriasTab` (`return <CategoriasTab />`), sem funcionalidade própria.
- Não existe correlação entre os serviços e as áreas cadastradas em `estrutura_areas`.

## Solução

### 1. Migração SQL — adicionar FK de área
Adicionar coluna `estrutura_area_id` (nullable) à tabela `tax_categorias`, com FK para `estrutura_areas`:

```sql
ALTER TABLE tax_categorias
  ADD COLUMN estrutura_area_id uuid REFERENCES estrutura_areas(id) ON DELETE SET NULL;
```

### 2. Reescrever `ServicosTab` em `CadastroCategorias.tsx`
Transformar de alias para componente completo:

- **Query de áreas**: buscar `estrutura_areas` com `select('id, name')` para popular o dropdown.
- **Query de serviços**: buscar `tax_categorias` com join em `estrutura_areas` para exibir o nome da área.
- **Formulário**: adicionar campo `Select` de "Área" (opcionalm com as áreas vindas de `estrutura_areas`).
- **Tabela**: adicionar coluna "Área" exibindo o nome da área associada (ou "—" se não tiver).
- **CRUD**: salvar/atualizar `estrutura_area_id` junto com `nome`.

### 3. Exibição no Cadastro de Clientes (OS)
Na aba OS do `NewClientModal`, onde os serviços contratados são selecionados, agrupar os serviços por área no dropdown para facilitar a seleção (opcionalmente, exibir a área como badge ao lado do serviço selecionado).

### Resumo de arquivos alterados
- **SQL migration**: adicionar coluna `estrutura_area_id`
- **`src/components/equipe/CadastroCategorias.tsx`**: reescrever `ServicosTab` com CRUD próprio e seleção de área
- **`src/components/equipe/dev/NewClientModal.tsx`**: agrupar serviços por área no dropdown (melhoria visual)

