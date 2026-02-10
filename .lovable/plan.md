

# Reestruturacao do Modal PER e Tabela DCOMP

## Resumo

Cinco mudancas interconectadas no sistema PERDCOMP: reestruturar o modal de detalhamento, adicionar campo de ressarcimento no PER, separar colunas de retificacao no DCOMP, e remover coluna desnecessaria.

---

## 1. Migracao de Banco de Dados

### Tabela `per` — apenas `vlr_ressarcido` (nova)

A coluna `dt_pagamento` **ja existe em `per_situacao`** e continuara sendo usada de la. Somente o valor ressarcido precisa ser persistido, pois hoje e calculado em tempo real como `vlr_credito - totalCompensado` (logica que sera substituida).

```text
ALTER TABLE public.per ADD COLUMN vlr_ressarcido numeric DEFAULT 0;
```

### Tabela `dcomp` — nova coluna `nr_dcomp_orig`

```text
ALTER TABLE public.dcomp ADD COLUMN nr_dcomp_orig character varying;
```

Logica de retificacao:
- DCOMP original (A): `nr_dcomp_orig = null`, `nr_dcomp_ret = null`
- Retificacao 1 (B): `nr_dcomp_orig = A`, `nr_dcomp_ret = A`
- Retificacao 2 (C): `nr_dcomp_orig = A`, `nr_dcomp_ret = B`
- O `nr_dcomp_orig` sempre aponta para o primeiro da cadeia

---

## 2. Modal de Detalhamento PER (`PerDetailModal.tsx`)

### Renomear secao
- **Antes**: "DCOMPs Vinculados"
- **Depois**: "Lancamentos PER"

### Dois botoes no header da area
- "Novo DCOMP" (existente, sem mudanca)
- "Novo Ressarcimento" (novo) — abre um mini-dialog com:
  - **Valor Ressarcido (R$)** — input numerico
  - **Data do Pagamento** — input date (fara UPDATE em `per_situacao` adicionando um registro com a data, mantendo a logica atual)
  - Ao salvar: UPDATE `per.vlr_ressarcido` + INSERT `per_situacao` com `dt_pagamento`

### Tabela de DCOMPs — colunas atualizadas
| Antes | Depois |
|---|---|
| N Documento | N DCOMP Original (`nr_dcomp_orig` ou `nr_documento` se for original) |
| — | N DCOMP Retificado (`nr_documento` quando `nr_dcomp_orig` existe) |
| Tipo Credito | **REMOVIDO** |
| Demais colunas | Sem mudanca |

---

## 3. Formulario DCOMP (`DcompFormModal.tsx`)

### Alteracoes
- Remover campo `tp_credito` do formulario (manter no insert como copia do `imposto` para compatibilidade)
- Adicionar campo "N DCOMP Original" (select dos DCOMPs existentes do mesmo PER)
- Quando preenchido, o sistema busca o ultimo DCOMP vigente da cadeia e preenche `nr_dcomp_ret` automaticamente
- Substituir o toggle "Original/Retificadora" por logica automatica: se `nr_dcomp_orig` esta preenchido, e retificacao

---

## 4. Tabela Principal (`ControlePerdcomp.tsx`)

### Coluna "Ressarcido"
- **Antes**: `vlr_credito - totalCompensado` quando `per_situacao.dt_pagamento` existe
- **Depois**: lido diretamente de `per.vlr_ressarcido`

### Coluna "Data Pagamento"
- Continua vindo de `per_situacao.dt_pagamento` (sem mudanca)

### Coluna "Saldo Disponivel"
- Calculo ajustado: `vlr_credito - totalCompensado - (per.vlr_ressarcido || 0)`

---

## 5. Sync DW (`syncPerdcomp.ts`)

Adicionar `vlr_ressarcido` na interface `PerSync`.

---

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | `vlr_ressarcido` em `per`; `nr_dcomp_orig` em `dcomp` |
| `PerDetailModal.tsx` | Renomear secao, botao "Novo Ressarcimento", colunas DCOMP |
| `DcompFormModal.tsx` | Logica de retificacao com `nr_dcomp_orig`, remover tp_credito da UI |
| `ControlePerdcomp.tsx` | Usar `per.vlr_ressarcido` direto, ajustar saldo |
| `syncPerdcomp.ts` | Adicionar campo na interface |

