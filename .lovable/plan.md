

# Ajustar ConsultaXMLs para novo formato da API NFe

## O que muda

A API agora retorna os mesmos campos de antes (chave, cUF, natOp, mod, serie, nNF, dhEmi, tpNF, emit com IE, dest com IE/UF), mas substituiu:
- `produtos[]` por `contItens` (contagem de itens) e `vlrTotal` (valor total da NFe)
- Removeu `ICMSTot` e `infAdic` (nao eram exibidos na tabela)

Campos novos adicionados: `dEmi`, `tipo_mov`, `id_contribuinte`, `cNF`, `indPag`, `cMunFG`, `dhSaiEnt` (podem ser ignorados por enquanto, sem uso na tabela).

## Alteracoes

### `src/pages/equipe/dev/ConsultaXMLs.tsx`

1. **Remover interface `NFeProduto`** (linhas 48-87) - nao existe mais no response

2. **Atualizar interface `NFeRecord`** (linhas 103-123):
   - Remover `produtos: NFeProduto[]`
   - Remover `ICMSTot: { vICMS, vICMSST }`
   - Remover `infAdic: { infAdFisco, infCpl }`
   - Adicionar `contItens: number`
   - Adicionar `vlrTotal: number`
   - Adicionar `tipo_mov: string` (opcional, pode ser util no futuro)

3. **Atualizar celula de valor na tabela** (linha 1119):
   - De: `formatCurrency(record.produtos.reduce((sum, p) => sum + p.vProd, 0))`
   - Para: `formatCurrency(record.vlrTotal)`

4. **Atualizar celula de contagem de itens** (linha 1122):
   - De: `record.produtos.length`
   - Para: `record.contItens`

### `src/components/equipe/dev/ExportDialog.tsx`

5. **Atualizar interface `NFeRecord` interna** com as mesmas mudancas (remover `produtos`, `ICMSTot`, `infAdic`, adicionar `contItens`, `vlrTotal`). A exportacao real usa o endpoint CSV da API, entao nao e afetada.

## Interfaces Emit e Dest

Permanecem iguais - a API continua retornando `IE` e `UF` em ambas.

## Impacto

- Mudancas minimas: apenas 2 celulas da tabela e limpeza de interfaces/tipos nao utilizados
- Nenhuma mudanca em filtros, paginacao, busca ou download
- Exportacao CSV continua funcionando normalmente (endpoint independente)

