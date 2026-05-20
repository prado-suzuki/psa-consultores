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

Criar uma Edge Function `backfill-dcomp-valor-original` (service role) que:

1. Lista DCOMPs ativos com pelo menos uma linha `valor_original IS NULL`.
2. Para cada DCOMP, busca a `dt_solicitada` do PER pai.
3. Reaproveita o cálculo SELIC já existente (mesma API/regra usada em `useSelicTaxaAt` e `selicCalculator`) para obter o fator vigente em `dt_envio`.
4. Faz `UPDATE` linha a linha em `distribuicao_dcomp` preenchendo `valor_original` (usando upsert/update seletivo — sem delete+insert).
5. Retorna um resumo `{ dcomps_processados, linhas_atualizadas, erros }`.

Gatilho: botão **"Backfill Valor Original"** visível só para admin/líder no header da página `ControlePerdcomp`, com confirmação e toast de progresso. Execução idempotente — rodar várias vezes não altera linhas já preenchidas.

## Detalhes técnicos

- Manter padrão: nenhuma chamada Supabase nova em componente; encapsular em hook (`useBackfillValorOriginal`).
- Auditar a operação de backfill via `useAuditLog` no acionamento do botão.
- A Edge Function deve validar JWT (`supabase.auth.getUser()`) e checar `has_role_or_higher(uid, 'lider')`.
- Não alterar RLS — a função usa service role.
- Sem mudanças de schema.
