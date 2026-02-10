
# Ajustes na Tabela Principal do PERDCOMP

## 1. Filtro "N do Processo" busca tambem por DCOMP

O filtro `processoFilter` atualmente so filtra pelo `numero_processo_per`. Sera alterado para tambem verificar se algum DCOMP vinculado ao PER contem o texto digitado no campo `nr_documento`.

## 2. Nova ordem das colunas

A tabela sera reordenada conforme solicitado:

```text
N Processo | Situacao | Ultima atualizacao | Data da solicitacao | Exercicio | Trimestre | Tipo do credito | Valor credito | Valor compensado | Valor ressarcido | Data do pagamento | Saldo disponivel | Vlr. Corrigido | Editar
```

Isso move "Ultima atualizacao" e "Data do pagamento" para posicoes diferentes, e coloca "Vlr. Corrigido" como penultima coluna (antes de "Editar").

## 3. Totais movidos para a parte superior

Os cards de totais (Valor Credito, Valor Corrigido, Valor Compensado, Valor Ressarcido, Saldo Disponivel) serao exibidos em cards acima da tabela (entre o header "Resultados - PER" e a tabela). O `TableFooter` com totais sera removido.

A logica de calculo dos totais (`totals` useMemo) permanece a mesma, apenas a renderizacao muda de `TableFooter` para cards no topo.

## Detalhes tecnicos

**Arquivo**: `src/pages/equipe/dev/ControlePerdcomp.tsx`

### Filtro por DCOMP (linha 267)
- Alterar a condicao `processoFilter` para verificar tambem se existe algum DCOMP cujo `nr_documento` contem o texto:
```ts
if (processoFilter) {
  const matchPer = item.numero_processo_per.includes(processoFilter);
  const matchDcomp = dcompData.some(d => d.nr_per_orig === item.numero_processo_per && d.nr_documento.includes(processoFilter));
  if (!matchPer && !matchDcomp) return false;
}
```

### Reordenacao das colunas (linhas 392-493)
- Reordenar `TableHead` e `TableCell` na sequencia: N Processo, Situacao, Ultima atualizacao, Data da solicitacao, Exercicio, Trimestre, Tipo do credito, Valor credito, Valor compensado, Valor ressarcido, Data do pagamento, Saldo disponivel, Vlr. Corrigido, Editar

### Totais no topo (linhas 497-521 e 646-660)
- Remover o `TableFooter`
- Adicionar cards de totais entre o `CardHeader` e o `CardContent` do card de resultados, exibidos apenas quando `searched && filteredPerData.length > 0`
- 5 mini-cards em grid: Valor Credito, Vlr. Corrigido, Valor Compensado, Valor Ressarcido, Saldo Disponivel
- Atualizar colSpan do "Nenhum registro" para 14
