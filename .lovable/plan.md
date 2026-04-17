

## Plano: Adicionar busca por texto no filtro de coluna

### Contexto
O `ColumnFilterDropdown` (compartilhado por C170, A170, F100, F120, F130, D100, ApuracaoDataTable, etc.) hoje lista todos os valores únicos da coluna com checkboxes, mas não tem campo de busca. Em colunas com muitos valores (ex: NCM, CFOP, descrições), encontrar um item específico fica inviável.

### Alteração
Arquivo único: `src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx`

1. Adicionar estado local `search` (string) e ícone `Search` do `lucide-react`.
2. Inserir um `<Input>` compacto logo acima da `ScrollArea`, com placeholder "Buscar..." e ícone de lupa à esquerda.
3. Filtrar a lista `sorted` pelo termo digitado (case-insensitive, `includes`) antes de renderizar os checkboxes — funciona para texto, números e códigos (NCM/CFOP) já que tudo é string.
4. Resetar `search` para `""` quando o popover abrir/fechar (`handleOpen`).
5. Manter "Selecionar tudo" / "Limpar" operando sobre **todos** os `uniqueValues` (não só os filtrados visualmente), para não confundir o usuário — comportamento padrão Excel.
6. Se a busca não retornar resultados, mostrar mensagem discreta "Nenhum valor encontrado".

### Escopo
- 1 arquivo modificado
- Sem mudanças em hooks, schema, RLS ou nas tabelas que consomem o componente
- Beneficia automaticamente todas as tabelas fiscais que usam o dropdown compartilhado

