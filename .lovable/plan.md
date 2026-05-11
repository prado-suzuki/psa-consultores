# Ajustes na tabela "Apuração por anexo" (Calculadora IBS/CBS)

## Contexto

Auditoria das colunas mostrou duas inconsistências semânticas:

1. A coluna apresentada como **"Δ carga"** (com triângulo) na verdade calcula `tributoDepois ÷ faturamento`, ou seja, é a **carga tributária DEPOIS** da reforma — não uma variação. O título e o ícone induzem o usuário ao erro.
2. A coluna **"Alíq. média"** usa `aliq_ibs_cbs` do CSV, que segundo a investigação do mock já é a **alíquota efetiva** (= `ibs_cbs_base × (1 − reducao_aliq)`). O CSV traz separadamente a alíquota **nominal** em `ibs_cbs_base` (sempre 27,5%) mas ela é ignorada. Por isso "Alíq média × (1−Redução média) = Carga DEPOIS" sempre bate, e a coluna Alíq. média acaba sendo redundante.

Demais colunas validadas com os números do print e estão corretas (Faturamento, % fat., Trib. ANTES, Trib. DEPOIS, NFs, Itens).

## Mudanças

### 1. Coluna "% carga" → "Carga DEPOIS"

Arquivo: `src/components/equipe/dev/calculadora-ibs-cbs/AbaPorAnexo.tsx`

- Trocar título da coluna de **"Δ carga"** para **"Carga DEPOIS"**.
- Remover o triângulo (▲/▼/▬) — não é variação.
- Voltar a exibir o percentual puro (`fmtPct(a.cargaPct)` sem o split do "%").
- Neutralizar a paleta de cores do badge: hoje vermelho/âmbar/verde sugere "alta = ruim". Trocar para uma única cor neutra (slate) ou manter um leve degradê só para dar densidade visual, sem juízo de valor (slate-50 / slate-100 / slate-200).

### 2. Coluna "Alíq. média" → "Alíq. efetiva"

Arquivo: `src/components/equipe/dev/calculadora-ibs-cbs/AbaPorAnexo.tsx`

- Renomear cabeçalho para **"Alíq. efetiva"** — fica honesto sobre o que está sendo mostrado (já vem do CSV pós-redução).
- Sem mudança de cálculo: continua `Σ(aliq_ibs_cbs × valor) ÷ Σ(valor)` em `calc.ts`.
- Adicionar tooltip no cabeçalho explicando: *"Alíquota IBS/CBS já após a redução do anexo. Quando há ICMS monofásico (ex.: Seção VI), a carga DEPOIS pode ser maior que a alíquota efetiva."*

### 3. Limpeza do CSV de exportação (opcional, escopo desta correção)

Renomear a coluna do export `Carga_pct` se existir para `Carga_DEPOIS_pct` para manter consistência.

## Detalhes técnicos

```text
Antes (errado):
  Header: "Δ carga"
  Conteúdo: "▲ 6,12" com badge vermelho
  Significado real: tributoDepois / faturamento  (carga DEPOIS, não variação)

Depois:
  Header: "Carga DEPOIS"
  Conteúdo: "6,12%" com badge neutro
  Significado claro
```

```text
Antes:
  Header: "Alíq. média"
  Mostra: alíquota efetiva (já reduzida)  → confunde com "Redução média" ao lado

Depois:
  Header: "Alíq. efetiva" (+ tooltip)
  Mantém o mesmo número, só esclarece que é pós-redução
```

Sem alteração em `calc.ts`, `types.ts` ou no CSV mock — toda a mudança é cosmética/de rótulos no componente `AbaPorAnexo.tsx`.

## Fora de escopo

- Não tocar nas abas "Resumo" e "Por Produto".
- Não recalcular nada no `useApuracaoIbsCbs`.
- Não introduzir coluna nova de variação real (Δ pp = depois − antes) nesta rodada — pode ser proposta futura caso queira comparar.
