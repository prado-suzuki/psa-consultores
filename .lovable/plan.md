

## Linha expansível de contribuintes na tabela de Clientes

### Alteração

**1 arquivo:** `src/pages/equipe/fiscal/GestaoClientes.tsx`

### Implementação

1. **State:** Adicionar `expandedClienteId: string | null` (accordion — só um aberto por vez).

2. **Coluna chevron:** Adicionar uma `<TableHead>` vazia como primeira coluna do header. Na primeira `<TableCell>` de cada row, renderizar `ChevronRight` com rotação condicional (`rotate-90` quando expandido). Click no chevron faz toggle (com `e.stopPropagation()` para não abrir o modal).

3. **Sub-row de contribuintes:** Após cada `<TableRow>` do cliente, renderizar condicionalmente (quando `expandedClienteId === row.id`) um segundo `<TableRow>` com um único `<TableCell colSpan={totalCols}>` contendo:
   - Query inline via `useQuery` encapsulada num sub-componente `ContribuinteSubTable` que recebe `clienteId`
   - Busca em `contribuinte` filtrado por `cliente_id`, `excluido=false`, `ambiente`
   - Seleciona: `cpf_cnpj`, `nome_razao_social`, `inscricao_estadual`, `simples_nacional`
   - Se vazio: texto "Nenhum contribuinte cadastrado"
   - Se tem dados: mini-tabela com fundo `bg-muted/50` e bordas sutis

4. **Import:** Adicionar `ChevronRight` ao import de lucide (já tem `ChevronLeft`/`ChevronRight` para paginação, adicionar apenas se não estiver).

5. **Visual:** Chevron com `transition-transform duration-200`. Sub-tabela com `ml-8 bg-muted/50 rounded-lg p-3`.

**Total: 1 arquivo alterado, ~60 linhas adicionadas.**

