# Recalcular Saldo Disponível do PER

## Problema

Hoje o **Saldo Disponível / Saldo Restante do PER** é calculado como:

```
saldo = vlr_credito (PER) − Σ dcomp.vlr_compensado (vigentes) − vlr_ressarcido
```

`dcomp.vlr_compensado` é o valor **atualizado pela SELIC** na data de envio da DCOMP. Logo, o saldo está sendo abatido por valores corrigidos, e não pelo principal de fato consumido do crédito. O correto, agora que `distribuicao_dcomp.valor_original` está populado, é abater pelo somatório do **valor original** de todos os tributos de todas as DCOMPs vigentes daquele PER:

```
saldo = vlr_credito (PER) − Σ distribuicao_dcomp.valor_original (de todas as DCOMPs vigentes) − vlr_ressarcido_original (quando houver, senão vlr_ressarcido)
```

## Mudanças

### 1. `PerDetailModal.tsx` — card "Saldo Restante do PER"

Trocar `saldoRestante` para somar `valor_original` das linhas de `distribuicao_dcomp` já carregadas em `distribuicoesPorDcomp` (filtradas aos `dcompsVigentesNrDocs`):

```
totalOriginalCompensado = Σ linha.valor_original (fallback linha.valor_tributo quando NULL)
saldoRestante = round2(vlr_credito − totalOriginalCompensado − vlrRessarcidoOriginal)
```

Usar `vlr_ressarcido_original` quando existir (já tratado para rateio Atualizado/Original); cair para `vlr_ressarcido` quando não houver. Manter o `normalizeCurrencyZero` e o arredondamento atual.

Esse mesmo `saldoRestante` alimenta o card "Valor Atualizado SELIC" — não precisa mexer na fórmula SELIC, só na base.

### 2. `ControlePerdcomp.tsx` — colunas Saldo Disp., Vlr. Selic e totais

Hoje a tabela usa `dcompTotalMap` (soma de `dcomp.vlr_compensado` por PER). Substituir por um novo mapa `dcompOriginalMap` que soma `valor_original` por `nr_per_orig`:

- Nova query `useQuery(['perdcomp-distribuicoes', contribuinteId, searched])` em `distribuicao_dcomp` puxando `nr_documento, valor_tributo, valor_original`, restrita aos `nr_documento` dos DCOMPs vigentes (mesma lista usada hoje para `dcompTotalMap`).
- `dcompOriginalMap[nr_per_orig] = Σ valor_original ?? valor_tributo` por DCOMP vigente.
- Substituir `dcompTotalMap` por `dcompOriginalMap` no cálculo do `saldo` (linhas 454, 473, 505, 507, 705) — a coluna "Vlr. Compensado" continua mostrando `dcompTotalMap` (atualizado), só o saldo muda de base.

Atualizar `selicCorrectionMap` e `totals.corrigido` para usarem o novo `saldo` (já feito implicitamente quando substituímos `valSaldo`).

### 3. Loading e fallback

Enquanto a query de distribuições não chega, manter o cálculo antigo (fallback para `vlr_compensado`) para não exibir saldo zerado/errado no primeiro render — ou simplesmente exibir loader na coluna.

## Observações

- A coluna "Vlr. Compensado" continua mostrando o valor atualizado (`vlr_compensado` somado por PER) — o usuário entende esse número como "quanto já foi efetivamente compensado em valores correntes".
- O "Saldo Disp." passa a ser o saldo de principal real do crédito original, coerente com `vlr_credito` que é o principal.
- Não há mudança de schema, RLS, edge functions nem nada de backend além de uma nova leitura via Supabase.
