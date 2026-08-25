# Mapa funcional do cálculo de ITCMD/MT — doação de quotas

Documento de implementação da calculadora. Descreve **como o cálculo é feito**: o que entra, que
tabelas de referência consome, como encadeia e o que sai.

**Âncora:** os dois artefatos que a OSG entregou como modelo —
`Cópia de WP_Cálculo ITCMD_MT - revisado por Luana.xlsx` (aba `Doação`) e
`Apresentação_Eixo Sucessório Santa Terezinha_11.03.pptx`.
Quando os dois divergem, **vale o WP**. Divergências ficam registradas no anexo, sem tratamento.

---

## 1. O que entra

### 1.1 Do cadastro — já existe no sistema

| Dado | Onde mora hoje |
|---|---|
| Bem: denominação, tipo, área, unidade | `bem`, `matricula` |
| Matrícula, cartório, município/UF | `matricula`, `cartorio` |
| Valor **contábil** do bem | `matricula.vlr_contabil` (fallback `bem.vlr_contabil`) |
| Valor de **mercado** do bem | `matricula.vlr_mercado` (fallback `bem.vlr_mercado`) |
| Valor de **ITR/IPTU** do bem | **sem campo canônico** — ver 1.4 |
| Quadro societário: empresa, sócio, quotas | `quadro_societario` |
| Pessoas, cônjuge, filiação, fundador | `pessoa` |
| Titularidade e fração por matrícula | `titularidade` |

A regra de leitura dos valores do bem **já está implementada** em `src/lib/osg/valoresDoBem.ts`:
bem com matrícula → soma das matrículas; bem sem matrícula → valor do próprio bem. Distingue nulo
de zero e declara soma parcial. Cobre contábil e mercado; **falta a terceira métrica**.

### 1.2 Do analista, na simulação — é o que nasce novo

| Entrada | Tipo | Observação |
|---|---|---|
| Empresa cuja quota será doada | ref. `pessoa` (PJ) | define o universo de quotas |
| Doadores e quantas quotas cada um doa | lista | um doador pode doar 100% ou parte |
| Donatários (herdeiros necessários) | lista | |
| Quotas pré-existentes de cada donatário | número | zero no caso do WP; ver passo 3 |
| `% da legítima` | percentual | 50% por padrão (art. 1.846 CC) |
| `fator_base` | 1,00 ou 0,70 | integral ou com reserva de usufruto |
| Competência da UPF | AAAA-MM | resolve a UPF na tabela de referência |
| Reserva de usufruto: sobre quantas quotas, a favor de quem | | alimenta o quadro de usufruto |

### 1.3 Tabelas de referência

**UPF/MT por competência.** Tabela versionada, mantida fora do cálculo. Valores observados:

| Competência | UPF/MT |
|---|---|
| 2026-01 | 254,36 |
| 2026-02 | **255,20** ← usada pelo WP |
| 2026-03 | 256,04 |
| 2026-05 | 260,10 |
| 2026-08 | 263,78 |

A série **não é linear** — não extrapolar. Precisa de dono para atualização mensal.

**Faixas e alíquotas — doação (Lei 7.850/02).** Idênticas nos três trabalhos e nos 20 blocos lidos:

| Faixa | Limite superior | Alíquota | Dedução |
|---|---|---|---|
| 1 | 500 UPF | isento | 0 |
| 2 | 1.000 UPF | 2% | 10 UPF |
| 3 | 4.000 UPF | 4% | 30 UPF |
| 4 | 10.000 UPF | 6% | 110 UPF |
| 5 | — | 8% | 310 UPF |

**Parâmetros de avaliação** — usados só quando o valor de mercado é derivado da área:

| Parâmetro | Valor no WP |
|---|---|
| Preço da saca | R$ 105,00 |
| Sacas por hectare | 900 |
| **Valor por hectare** | **R$ 94.500,00/ha** |

No WP isso está embutido na fórmula (`=(105*900)*área`). Na calculadora é entrada, e o valor de
mercado do bem pode vir digitado em vez de derivado — o analista escolhe.

### 1.4 O único ajuste de cadastro que a calculadora exige

O valor de **ITR/IPTU** não tem campo canônico: `bem.vlr_itr_iptu` está vazio e o valor está sendo
guardado em `matricula.vlr_imposto_anual`, campo cujo nome diz "imposto anual". Precisa de decisão
do tech lead — qual campo passa a ser o oficial — e de estender `valoresDoBem.ts` para a terceira
métrica. É pequeno e mecânico.

---

## 2. Como o cálculo é feito — 6 passos

Cada passo traz a célula de origem no WP, para conferência.

### Passo 1 — Totais por base de avaliação

Soma os bens do acervo, mais moeda corrente, em cada uma das três colunas.

```
total_contabil = Σ valor_contabil(bem)  + moeda        → WP F34
total_itr      = Σ valor_itr(bem)       + moeda        → WP G34
total_mercado  = Σ valor_mercado(bem)   + moeda        → WP H34
```

**Bem sem valor numa coluna entra como zero e reduz aquele total.** A calculadora deve declarar
quantos bens contribuíram para cada total, como `valoresDoBem.ts` já faz.

### Passo 2 — Valor por quota

É o eixo do modelo. O capital em quotas **é** o total contábil, a R$ 1,00 por quota. As outras duas
avaliações viram "reais por quota" dividindo pelo mesmo total contábil.

```
valor_quota_contabil = 1,00                                → WP F35
valor_quota_itr      = total_itr     / total_contabil       → WP G35
valor_quota_mercado  = total_mercado / total_contabil       → WP H35
```

Uma quota vale simultaneamente R$ 1,00 contábil, R$ 4,3848 de ITR e R$ 48,5698 de mercado.

**Nunca arredondar estes dois quocientes.** Guardar em decimal de precisão arbitrária.

### Passo 3 — Distribuição: legítima e disponível

Por doador:

```
legitima_total   = quotas_do_doador × pct_legitima          → WP E41 = C40/2/2 (o /2/2 é isto)
disponivel_total = quotas_do_doador − legitima_total
legitima_i       = legitima_total / nº herdeiros
```

A **disponível** tem duas formas, e a calculadora precisa das duas:

| Situação | Regra | Onde aparece |
|---|---|---|
| Donatários partem de **zero** | disponível divide igualmente | WP (Santa Terezinha) |
| Donatários já têm quotas | disponível **iguala a participação final**:<br>`disponivel_i = alvo_final − pre_existente_i − legitima_i` | Agro Aliança |

O alvo de participação final é **entrada**, não constante — no Agro Aliança foi `capital ÷ nº herdeiros`.
Validado nos dois cenários daquele caso, na quota exata.

**Resto da divisão:** quotas são inteiras. Quando a metade não é exata, o resto vai para a
**legítima** e reduz a disponível. Confirmado em três artefatos, incluindo a minuta da 2ª Alteração
Contratual (3.532.818 → legítima 1.766.410 / disponível 1.766.408).

**Guarda:** se `disponivel_i` sair negativa, a igualação é impossível — o donatário já tem mais que
o alvo. Deve recusar, não truncar em zero. No Agro Aliança a folga era de 0,9% do valor doado.

### Passo 4 — Base de cálculo por donatário

```
quotas_recebidas_i = Σ (legitima_i + disponivel_i) de TODOS os doadores    → WP G57
base_contabil_i    = quotas_recebidas_i × valor_quota_contabil × fator_base → WP C79
base_itr_i         = quotas_recebidas_i × valor_quota_itr      × fator_base → WP F79
base_mercado_i     = quotas_recebidas_i × valor_quota_mercado  × fator_base → WP I79
```

`fator_base` = 1,00 (integral) ou 0,70 (com reserva de usufruto, Decreto 2.125/03).

### Passo 5 — Imposto

```
imposto = alíquota(faixa) × base − dedução(faixa) × UPF
```

onde a faixa é a **primeira** cuja `base ≤ limite × UPF`.

Equivale à soma marginal faixa a faixa e é a forma normativa por ser testável em uma linha.
Reproduz ao centavo os 6 valores do bloco do WP (`E97` a `J97`) e 31 de 32 valores publicados no
caso Agro Aliança, incluindo faixas de 2% e 4% e bases reduzidas a 70%.

**Regras duras:**

1. `imposto ≥ 0` sempre. Negativo é erro — **lançar exceção**, nunca truncar em zero.
2. Base igual ao teto pertence à faixa de baixo.
3. Base até 500 UPF → devolver `isento: true`, não apenas `0`.
4. Arredondar meio para cima, 2 decimais, **uma única vez** — no imposto final.

**Efeito da UPF, contraintuitivo:** como a dedução cresce com a UPF, **UPF maior significa imposto
menor** para a mesma base. Acima de 10.000 UPF, `d(imposto)/d(UPF) = −310`.

### Passo 6 — Consolidação

Cada ato assinado é um **evento tributável** com guia própria. Um donatário que recebe de dois
doadores gera **dois eventos**, cada um com sua base.

```
por evento:   imposto(base_evento, upf_da_competência_do_evento)
por donatário: Σ eventos daquele donatário
por arranjo:   Σ todos os eventos                                → WP C84 / F84 / I84
```

**Progressividade não é aditiva** — somar as bases e calcular uma vez dá resultado diferente de
calcular evento a evento. Dois atos de R$ 1.000.000 com UPF 254,36 dão R$ 64.738,40; um ato de
R$ 2.000.000 dá R$ 92.020,40, 42% mais. Por isso o evento é entidade, não detalhe.

No WP do Santa Terezinha o Quadro 3 tem dois blocos — a doação do Cristiano e a da Fabiane — e o
resumo das linhas 55–59 consolida por donatário. São dois eventos por donatário.

---

## 3. O que sai

### 3.1 Por donatário × base de avaliação

| Campo | Exemplo (WP, Gabriel) |
|---|---|
| quotas recebidas | 3.324.700 |
| base de cálculo | contábil 3.324.700,00 · ITR 14.577.996,03 · mercado 161.480.140,91 |
| faixa aplicada | 8% nas três |
| imposto | 186.864,00 · 1.087.127,68 · 12.839.299,27 |

### 3.2 Quadro de doação

Sócios × quotas × % × legítima × disponível × total recebido × participação final × %
→ WP linhas 55–59, e é o quadro do slide 9 da apresentação.

### 3.3 Quadro de usufruto

Sócios/usufrutuários × quotas × % × propriedade plena × nua propriedade × usufruto × %
→ WP linhas 64–70, e é o quadro do slide 10.

### 3.4 Resumo dos tributos

Totais do acervo, base por donatário e ITCD por donatário, nas três colunas
→ WP linhas 75–84, e é o quadro do slide 12.

### 3.5 Comparação entre bases

A calculadora deve mostrar as três lado a lado e **nunca eleger uma vencedora** — a escolha da base
é decisão do consultor, e a diferença é de ordem de grandeza (R$ 373 mil contábil contra R$ 25,7
milhões de mercado, no caso do WP).

---

## 4. Caso de referência — o exemplo funcional

Extraído do WP, célula por célula. Serve para conferir a implementação de ponta a ponta.

**Entradas:** UPF 255,20 (Fev/2026) · `fator_base` 1,00 · 2 doadores · 2 herdeiros, ambos partindo
de zero · legítima 50%

| Passo | | Valor | Célula |
|---|---|---|---|
| 1 | total contábil | 6.649.400,00 | `F34` |
| 1 | total ITR | 29.155.992,05 | `G34` |
| 1 | total mercado | 322.960.281,82 | `H34` |
| 2 | valor/quota contábil | 1,00 | `F35` |
| 2 | valor/quota ITR | 4,384755323788613 | `G35` |
| 2 | valor/quota mercado | 48,56983815381839 | `H35` |
| 3 | quotas Cristiano | 6.086.672 | `C40` |
| 3 | quotas Fabiane | 562.728 | `C47` |
| 3 | legítima Gabriel (de Cristiano) | 1.521.668 | `E41` |
| 3 | disponível Gabriel (de Cristiano) | 1.521.668 | `F41` |
| 3 | recebido Gabriel (de Cristiano) | 3.043.336 | `G41` |
| 3 | recebido Gabriel (de Fabiane) | 281.364 | `G48` |
| 3 | **recebido Gabriel consolidado** | **3.324.700** | `G57` |
| 4 | base contábil Gabriel | 3.324.700,00 | `C79` |
| 4 | base ITR Gabriel | 14.577.996,03 | `F79` |
| 4 | base mercado Gabriel | 161.480.140,91 | `I79` |
| 5 | tetos das faixas | 127.600 · 255.200 · 1.020.800 · 2.552.000 | `D92:D95` |
| 5 | **imposto contábil** | **186.864,00** | `E97` |
| 5 | **imposto ITR** | **1.087.127,68** | `G97` |
| 5 | **imposto mercado** | **12.839.299,27** | `I97` |
| 6 | total contábil (2 donatários) | 373.728,00 | `C84` |
| 6 | total ITR | 2.174.255,36 | `F84` |
| 6 | total mercado | 25.678.598,55 | `I84` |

Conferência da faixa 5 à mão: `0,08 × 3.324.700 − 310 × 255,20 = 265.976,00 − 79.112,00 = 186.864,00`

**Quadro de usufruto:** Gabriel 3.324.700 em nua propriedade · Rafael 3.324.700 · fundadores com
usufruto sobre 6.649.400 (100%) → `C68`, `F68`, `G67`, `C70`.

Os 63 casos congelados em `golden-master.json` cobrem este caso mais 29 valores publicados do Agro
Aliança e 8 bordas sintéticas. `scripts/itcmd/selftest-golden.py` valida o conjunto.

---

## 5. Anexo — divergências registradas, sem tratamento

Registradas porque apareceram na leitura. **Não são nossas para resolver** e nenhuma trava a
construção: ajuste de imóvel, de valor ou de quotas é operação do analista na tela.

| # | O que é |
|---|---|
| Universo de quotas | WP 6.649.400 · apresentação slide 9 7.326.876 · minutas societárias de 07–10/04 8.042.202 |
| Acervo | a 1ª Alteração da GCB Agro lista a matr. 8.127 (R$ 1.670.000) que não está no WP, e não lista as matr. 970 e 971 (R$ 277.200) que estão |
| Área da matr. 968 | WP 485,9 ha · instrumento 33,3333 ha — afeta só a coluna de mercado |
| Base contábil por donatário | WP 3.324.700 · slide 12 3.663.438, com ITR e mercado do mesmo slide calculados sobre 3.324.700 |
| ITCD de mercado do slide 12 | R$ 74.384.119,18, alíquota efetiva de 46%; não reproduzível por nenhuma variante; o WP traz R$ 12.839.299,27 na célula ao lado |
| Coluna 70% do slide 11 | total impresso 24.493,77; soma das próprias linhas 42.076,63 |
| Competência da UPF | WP fevereiro (255,20) · apresentação março (256,04) — defasagem de data, ambos rotulados corretamente |
| Escalonamento do WP | 4 células do bloco de linha 148 divergem da forma fechada, 2 delas com valor negativo |
| Acumulação de doações ao mesmo par | nenhum artefato trata; se a regra existir, muda a base de quem recebe de mais de um doador |
| Extinção do usufruto | slide 8 diz "mais 70%", slide 12 diz "30% remanescentes" |
| Tabela de *causa mortis* | slide 13 cita topo em 16.000 UPF; fora deste recorte |

Os dois últimos e a acumulação são os únicos que podem mudar o **motor**, e não o dado. Os demais
são conferência de cadastro, feita na tela.
