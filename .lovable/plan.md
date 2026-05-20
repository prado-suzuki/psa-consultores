# Ajustes Controle PERDCOMP

Quatro mudanças, todas no módulo PERDCOMP.

## 1. Aviso de permissão no SoftDeleteModal

Mesma UX que já foi aplicada no `DcompFormModal`: quando um `team_member` (sem direito de editar/excluir) abrir o modal de Excluir/Cancelar DCOMP, mostrar um badge vermelho no canto superior direito do header, alinhado ao título: **"Você não tem permissão para editar/excluir este DCOMP"**.

- Renderizar o badge apenas quando `!canWrite` (variável já existe no componente).
- Manter o botão Confirmar desabilitado e o toast já existente como fallback.
- Aplicar somente para `type === 'dcomp'` (PER segue regra existente).

## 2. Renomear label no DcompFormModal

No grid do rateio de tributos (cabeçalho do bloco), trocar:

- "Valor Atualizado" → **"Valor Utilizado nesta DCOMP"**

Sem mudanças de comportamento, apenas texto. As referências em outros modais (ex.: PerDetailModal/Ressarcimento) **não** são alteradas.

## 3. Coluna VLR.SELIC na tabela principal

Hoje a coluna mostra `saldo × (1 + fator)` (valor total já corrigido). O usuário quer ver apenas a **parcela bruta da SELIC em R$**, ou seja, `saldo × fator`.

- Em `ControlePerdcomp.tsx`, na renderização da célula (linha ~750) trocar `correction.valorCorrigido` por `correction.valorCorrigido - saldo` (equivalente a `saldo × fator`).
- Ajustar o tooltip para algo como "Parcela SELIC em R$ — Fator: {fator}".
- Ajustar o total do rodapé (`totals.corrigido`) para somar `valorCorrigido − saldo` em vez de `valorCorrigido`.
- Atualizar o `getSortValue` da coluna `vlr_corrigido` para usar a mesma fórmula nova.
- Manter a regra de "Em carência" e estados de loading.

## 4. Backfill de `valor_original` nas distribuições já lançadas

Para todas as linhas em `distribuicao_dcomp` com `valor_original IS NULL` e cujo DCOMP pai não está excluído, calcular e persistir o valor original conforme regra atual da UI:

```
fatorSelic(dt_envio do DCOMP, dt_solicitada do PER)
proporcaoOriginal = fatorSelic > 0 ? 1/(1+fatorSelic) : 1
valor_original    = round2(valor_tributo * proporcaoOriginal)
```

Quando a `dt_envio` estiver dentro da carência (360 dias após `dt_solicitada`), `valor_original = valor_tributo`.

### Implementação

Atualização **única** via migration SQL — sem botão, sem hook, sem Edge Function. Daqui pra frente todo DCOMP novo já grava `valor_original` na inserção (lógica já existente no `DcompFormModal`).

A migration faz um único `UPDATE` em `distribuicao_dcomp` onde `valor_original IS NULL`, com join em `dcomp` e `per` (filtrando os não excluídos), aplicando:

- Se `dcomp.dt_envio <= per.dt_solicitada + 360 dias` (carência): `valor_original = valor_tributo`.
- Caso contrário, como o fator SELIC histórico não está armazenado no banco e não há como chamar a API SELIC em SQL, manter `valor_original = valor_tributo` para esses casos legados (mesmo fallback usado hoje na UI quando o fator não está disponível).

Sem mudanças de schema, sem alteração de RLS, sem novos componentes.

> Observação: se mais à frente o usuário quiser refinar os DCOMPs fora da carência com o fator SELIC histórico real (via API), será necessário um script à parte. Confirmar antes.
