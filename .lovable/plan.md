

## Plano: Adicionar coluna "Serviço" entre Produto e Cliente

### Contexto
Cada projeto TAX armazena um `servico_id` (referência a `servicos_prestados`), mas esse valor não é resolvido para nome na listagem. A coluna "Produto" já mostra o produto comercial da OS; a nova coluna "Serviço" mostrará o serviço operacional selecionado no projeto.

### Alterações

**Arquivo 1: `src/hooks/useTaxProjects.ts`**
- Adicionar `servico_nome?: string | null` na interface `TaxProject`
- No `queryFn` de `useTaxProjects`, coletar os `servico_id` únicos dos projetos
- Fazer query em `servicos_prestados` para resolver `id → nome`
- Mapear `servico_nome` no retorno de cada projeto

**Arquivo 2: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`**
- Adicionar `<TableHead>` "Serviço" (com sort) entre "Produto" e "Cliente" (após L519)
- Adicionar `<TableCell>` correspondente entre as células de Produto e Cliente (após L562)
- Atualizar `getSortValue` para incluir o case `'servico'`
- Atualizar `colSpan` de 10 para 11

