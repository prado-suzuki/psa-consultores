

# Reestruturacao do Modal PER e Tabela DCOMP (Revisado - Sem nr_dcomp_orig)

## Resumo

Quatro mudancas no sistema PERDCOMP, usando apenas a estrutura de banco existente (exceto `vlr_ressarcido` no `per`). A coluna "DCOMP Original" sera derivada no frontend percorrendo a cadeia de `nr_dcomp_ret`.

---

## 1. Migracao de Banco de Dados

Apenas **uma coluna nova**:

```text
ALTER TABLE public.per ADD COLUMN vlr_ressarcido numeric DEFAULT 0;
```

**Nenhuma nova coluna em `dcomp`** — o campo `nr_dcomp_ret` ja existente e suficiente. O "DCOMP Original" sera calculado no frontend percorrendo a cadeia.

---

## 2. Logica de "DCOMP Original" (derivada no frontend)

Com os DCOMPs do mesmo PER ja carregados, construimos um mapa para encontrar o original:

```text
Exemplo:
  A (nr_dcomp_ret = null) -> Original
  B (nr_dcomp_ret = A)    -> Original = A (via B.nr_dcomp_ret)
  C (nr_dcomp_ret = B)    -> Original = A (C -> B -> A, onde A.nr_dcomp_ret = null)
```

Funcao utilitaria que percorre a cadeia ate encontrar um DCOMP sem `nr_dcomp_ret` (o original).

---

## 3. Modal de Detalhamento PER (`PerDetailModal.tsx`)

### Renomear secao
- "DCOMPs Vinculados" passa a ser **"Lancamentos PER"**

### Dois botoes no header
- **"Novo DCOMP"** (existente)
- **"Novo Ressarcimento"** (novo) — abre mini-dialog com:
  - Valor Ressarcido (R$) — input numerico
  - Data do Pagamento — input date
  - Ao salvar: `UPDATE per SET vlr_ressarcido = X` + `INSERT per_situacao` com `dt_pagamento`

### Tabela de DCOMPs — colunas atualizadas

| Antes | Depois |
|---|---|
| N Documento (com "(Retifica: X)" inline) | N DCOMP Original (derivado pela cadeia de nr_dcomp_ret) |
| — | N DCOMP Retificado (nr_documento do DCOMP atual, exibido apenas quando nr_dcomp_ret existe) |
| Tipo Credito | **REMOVIDO** |
| Demais colunas | Sem mudanca |

---

## 4. Formulario DCOMP (`DcompFormModal.tsx`)

### Alteracoes
- Remover toggle "Original/Retificadora"
- Substituir por campo "DCOMP a Retificar" (select dos DCOMPs vigentes do mesmo PER)
  - Se preenchido: `nr_dcomp_ret` recebe o valor selecionado (e retificacao)
  - Se vazio: `nr_dcomp_ret` fica null (e original)
- Remover campo `tp_credito` da UI (manter no insert como copia do `imposto`)

---

## 5. Tabela Principal (`ControlePerdcomp.tsx`)

### Coluna "Ressarcido"
- **Antes**: calculado como `vlr_credito - totalCompensado` quando `per_situacao.dt_pagamento` existe
- **Depois**: lido diretamente de `per.vlr_ressarcido`

### Coluna "Data Pagamento"
- Continua vindo de `per_situacao.dt_pagamento` (sem mudanca)

### Coluna "Saldo Disponivel"
- Calculo: `vlr_credito - totalCompensado - (per.vlr_ressarcido || 0)`

### Totais do rodape
- Ajustados para usar `per.vlr_ressarcido`

---

## 6. Sync DW (`syncPerdcomp.ts`)

Adicionar `vlr_ressarcido` na interface `PerSync`.

---

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | `vlr_ressarcido` em `per` (unica mudanca de schema) |
| `PerDetailModal.tsx` | Renomear secao, botao "Novo Ressarcimento", colunas DCOMP com derivacao do original |
| `DcompFormModal.tsx` | Campo "DCOMP a Retificar" substitui toggle, remover tp_credito da UI |
| `ControlePerdcomp.tsx` | Usar `per.vlr_ressarcido` direto, ajustar saldo e totais |
| `syncPerdcomp.ts` | Adicionar campo na interface |

