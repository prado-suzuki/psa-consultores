# Especificação determinística — motor de cálculo ITCMD/MT (doação de quotas)

**Casos de referência:** Santa Terezinha / GCB · Agro Aliança · Bocolli (ver seção 1)
**Data da especificação:** 24/08/2026
**Status:** núcleo de cálculo congelado e verificado contra 3 trabalhos; **15 divergências abertas** (seção 8) — 6 resolvíveis sem terceiros, 9 dependentes de decisão externa (seção 12)

---

## 0. Estado deste documento

| Bloco | Situação |
|---|---|
| Fórmula do escalonamento (seção 3) | **Congelada.** Reproduz ao centavo 105 de 116 células das duas pastas e **31 de 32 valores publicados ao Agro Aliança** — inclusive faixas de 2% e 4% e bases reduzidas a 70% |
| Entradas e parâmetros (seção 4) | **Classificados.** 100% das entradas do ST-WP mapeadas |
| Modelo de eventos e eixos (seção 5.1–5.3) | **Especificado.** `arranjo` × `base_avaliacao` × `fator_base`, com fato gerador em sequência |
| Rastreabilidade saída → fórmula → célula (seção 6) | **Completa** para a aba visível do ST-WP |
| Casos golden-master (seção 10) | **63 casos congelados e verificados**, pendentes de aprovação funcional |
| Divergências (seção 8) | **Levantadas e quantificadas, não decididas** — 14 itens, dependem de responsável funcional/jurídico |
| Parâmetros legais (UPF, faixas) | **Pendentes de fonte oficial.** Os valores vêm dos artefatos, que definem o requisito mas não o comprovam |

### O que mudou com a leitura do Agro Aliança e do Bocolli

Três coisas que a primeira versão desta spec não sabia:

1. **A fórmula correta já é a praticada.** O deck do Agro Aliança acerta 31 de 32 valores, inclusive nas bordas onde o Santa Terezinha quebra. O motor codifica uma regra já aplicada, não introduz uma nova (seção 3.5).
2. **A UPF não é série linear.** A primeira versão afirmava "+0,84/mês" a partir de três pontos; o quarto ponto (Mai/2026 = R$ 260,10) refuta. O motor **não pode extrapolar** (seção 4.1).
3. **O fato gerador não é único.** Um arranjo pode ter até quatro eventos tributáveis encadeados, e nenhum artefato consolida o total (seção 5.2).

O que **não** está neste recorte: outras UFs, tela final, persistência produtiva, evento *causa mortis* (D10), e a parte de estruturação societária e acordo de sócios dos decks (AA-PPT slides 30–47).

---

## 1. Fontes e proveniência

Três trabalhos, seis artefatos. Os três compartilham a mesma pasta de origem.

| Sigla | Artefato | Cliente | Data |
|---|---|---|---|
| **ST-WP** | `Cópia de WP_Cálculo ITCMD_MT - revisado por Luana(1).xlsx` | Santa Terezinha / GCB | Fev–Mar/2026 |
| **ST-PPT** | `Apresentação_Eixo Sucessório Santa Terezinha_11.03(1).pptx` — 15 slides | Santa Terezinha / GCB | Mar/2026 |
| **AA-PDF** | `Agro Aliança_Eixo Sucessório.pdf` — 24 páginas | Agro Aliança | **Fev/2026** |
| **AA-PPT** | `Apresentação_Agro Aliança_Eixo Sucessório (1).pptx` — 48 slides | Agro Aliança | posterior ao PDF |
| **BO-WP** | `Eixo Sucessório_Família Bocolli 06.05.26 (1).xlsx` | *ver abaixo* | Mai/2026 |
| **OCULTAS** | 4 abas ocultas do ST-WP: `DOAÇÃO 100% COM USUFRUTO `, `Sheet1`, `Cenário III`, `Cenário II` | Agro Aliança | Jan/2026 |

### A cadeia de cópia

As 3 abas ocultas do **ST-WP** são o working paper do **Agro Aliança** — mesmos sócios (Avelino, Iracema, Cristina, Regina), mesmas fazendas, mesma UPF de Jan/2026, mesmos links externos `[1]Planilha1!G35:G37`. Não são "resíduo de template": **são o arquivo que gerou os números entregues ao Agro Aliança**, incluindo o único erro daquela entrega (D13).

O **BO-WP** tem as mesmas 3 abas, desta vez **visíveis**, e contém **zero dado da família Bocolli** — a palavra "Bocolli" aparece só no nome do arquivo. Sócios, fazendas, matrículas e valores são integralmente do Agro Aliança. A aba 1 teve a UPF atualizada para Mai/2026 e o quadro de usufruto alterado (1.284.747 quotas em vez de 426.052), mas sobre a base patrimonial do outro cliente. As abas `Cenário II` e `Cenário III` seguem intactas em Jan/2026.

Consequência prática, e é a mais séria deste levantamento: **quem abre o arquivo do Bocolli vê o patrimônio completo do Agro Aliança** — matrículas, áreas, valores contábeis, de ITR e de mercado, e a partilha entre as duas filhas. No ST-WP a mesma exposição existe, mas escondida atrás do estado `hidden` das abas, que qualquer usuário desfaz com dois cliques.

`Sheet1` (oculta no ST-WP) é o único bloco que pertence ao cliente da pasta: guarda o rateio 50%/50% dos imóveis entre Cristiano e Fabiane. Não alimenta nenhuma fórmula.

### Qual artefato é fonte de quê

| Para | Fonte | Por quê |
|---|---|---|
| **fórmula do escalonamento** | **AA-PDF / AA-PPT** | 31 de 32 valores publicados são exatos, inclusive nas bases pequenas (seção 3.5) |
| tabela de faixas e alíquotas | AA-PDF pág. 8, ST-PPT slide 7 | idênticas nos dois |
| série da UPF | os quatro artefatos | divergente entre si — ver 4.1 e D3 |
| regra de legítima/disponível | AA-PPT slides 17/21/25 | quadros fechados e auditáveis |
| sequência de eventos tributáveis | AA-PPT slides 17–27 | único artefato que modela mais de um fato gerador (seção 5.1) |
| dados patrimoniais do Santa Terezinha | ST-WP aba `Doação` | — |
| **nada** | BO-WP | não contém dado do cliente a que se destina |

---

## 2. Achado estrutural que motiva o motor

As duas pastas usam **uma única função: `SUM`** — 215 ocorrências no ST-WP, 133 no BO-WP. Em nenhuma das duas há **um único** `ROUND`, `IF`, `SE`, `MIN`, `MAX`, `TRUNC` ou `INT`.

Consequência direta: o escalonamento por faixas — que é intrinsecamente condicional ("a base alcança esta faixa?") — foi escrito como aritmética fixa de células, faixa por faixa, à mão. Sem condicional, **cada bloco novo tem de ser conferido e remendado individualmente**, e o remendo não sobrevive à cópia.

O resultado agregado dos três trabalhos, medido por `scripts/itcmd/verificar-blocos.py`:

| Pasta | Blocos | Células | OK | Erradas | das quais negativas |
|---|---|---|---|---|---|
| ST-WP — aba visível `Doação` | 4 | 24 | 20 | **4** | 2 |
| ST-WP — abas ocultas (= Agro Aliança) | 7 | 38 | 36 | 2 | 0 |
| BO-WP | 9 | 54 | 49 | **5** | 0 |
| **total** | **20** | **116** | **105** | **11** | **2** |

105 de 116 células conferem. As 11 que não conferem não vêm de um erro repetido: vêm de **cinco mecanismos distintos** (seção 9), todos consequência da mesma ausência de condicional.

Não é erro de digitação a ser corrigido no Excel: é a razão de existir do motor. E a seção 3.5 mostra que a regra correta já é conhecida e aplicada — o que falha é o meio, não o entendimento.

---

## 3. Núcleo determinístico — escalonamento

### 3.1 Tabela de faixas (doação, ITCMD/MT)

Base legal citada no PPT (slide 7): Lei estadual nº 7.850/02 e Decreto nº 2.125/2003. Faixas expressas em **UPF/MT** (Unidade Padrão Fiscal de Mato Grosso — indexador estadual que reajusta os limites das faixas sem alterar a lei).

| # | Faixa | Alíquota | Parcela a deduzir (em UPF) |
|---|---|---|---|
| 1 | até 500 UPF | isento | 0 |
| 2 | acima de 500 até 1.000 UPF | 2% | 10 |
| 3 | acima de 1.000 até 4.000 UPF | 4% | 30 |
| 4 | acima de 4.000 até 10.000 UPF | 6% | 110 |
| 5 | acima de 10.000 UPF | 8% | 310 |

### 3.2 Fórmula

Progressividade **marginal por faixa**: cada faixa tributa apenas a parcela da base que cai dentro dela.

```
imposto(base, upf) =
    seja k a PRIMEIRA faixa (na ordem 1..5) tal que
        limite_superior(k) é nulo  ou  base ≤ limite_superior(k) * upf
    retorne  aliquota(k) * base  −  deducao_upf(k) * upf
```

A busca pela *primeira* faixa que comporta a base — e não por um intervalo aberto à esquerda — é o que faz `base = 0` cair na faixa 1 e `base` igual a um teto pertencer à faixa de baixo, sem caso especial.

A forma fechada acima é **algebricamente idêntica** à soma faixa a faixa. Ela é a especificação normativa porque é testável em uma linha e não admite as ambiguidades que produziram os defeitos do WP.

**Derivação da faixa 5, para auditoria:**

```
0,02·(1000u − 500u) + 0,04·(4000u − 1000u) + 0,06·(10000u − 4000u) + 0,08·(B − 10000u)
= 10u + 120u + 360u − 800u + 0,08B
= 0,08B − 310u
```

### 3.3 Regras duras

1. **`imposto ≥ 0` sempre.** Um resultado negativo é defeito, não isenção. O motor deve **lançar erro** — nunca truncar em zero nem devolver valor neutro. (Foi exatamente o clamp silencioso ausente no WP que gerou os R$ −45.832,15 do bloco 3.)
2. Base **igual** ao teto da faixa pertence à faixa de baixo (`base ≤ limite * upf`).
3. Base até 500 UPF → imposto zero, e o motor deve devolver `isento: true`, não apenas `0`.
4. A isenção é **faixa calculada**, não constante literal. No WP ela é o texto `"-"` em 24 células, que o `SUM` trata como zero — funciona por acidente do Excel e não sobrevive a uma reimplementação.

### 3.4 Efeito da UPF, contraintuitivo e material

Para base acima de 10.000 UPF, `imposto = 0,08B − 310u`, logo `d(imposto)/d(u) = −310`.

**Aumentar a UPF reduz o imposto.** Trocar Fev/2026 (R$ 255,20) por Mar/2026 (R$ 256,04) — ΔUPF = +0,84 — reduz o imposto em exatamente **R$ 260,40** por donatário por cenário em toda base acima de 10.000 UPF. Verificado contra as 24 células do WP; os quatro coeficientes batem:

| Faixa da base | d(imposto)/d(upf) | Δ para ΔUPF = +0,84 |
|---|---|---|
| 2% | −10 | −R$ 8,40 |
| 4% | −30 | −R$ 25,20 |
| 6% | −110 | −R$ 92,40 |
| 8% | −310 | −R$ 260,40 |

Isso torna a escolha da competência da UPF (D3) uma decisão com efeito determinístico e não desprezível, não uma formalidade.

### 3.5 A fórmula não é nova — ela já está homologada no Agro Aliança

Este é o achado que sustenta toda a seção 3. O deck do **Agro Aliança** (AA-PDF de Fev/2026, repetido no AA-PPT) publica **32 valores de ITCD**. A forma fechada da seção 3.2 reproduz **31 deles ao centavo**, com UPF 254,36:

| Slide | Bloco | Valores | Conferem |
|---|---|---|---|
| 18 | Cenário I · resumo dos tributos | 6 | 6 |
| 20 | Cenário I · instituição de usufruto | 6 | 6 |
| 22 | Cenário II · doação entre irmãs | 3 | 3 |
| 22 | Cenário II · doação dos fundadores | 6 | 6 |
| 24 | Cenário II · instituição de usufruto | 6 | 6 |
| 27 | Cenário III · resumo dos tributos | 6 | **5** |
| | **total** | **32** | **31** |

O que torna isso decisivo: os blocos dos slides 20 e 24 incluem **bases pequenas e reduzidas a 70%** — exatamente as faixas onde o ST-WP produz imposto negativo. E ali estão corretas:

| Caso | Base | Faixa | AA | Correto |
|---|---|---|---|---|
| S20 quotas 100% | 426.052,00 | 4% | 9.411,28 | 9.411,28 |
| S20 quotas 70% | 298.236,40 | 4% | 4.298,66 | 4.298,66 |
| S24 quotas 100% | 213.026,00 | **2%** | 1.716,92 | 1.716,92 |
| S24 quotas 70% | 149.118,20 | **2%** | 438,76 | 438,76 |
| S24 mercado 70% | 1.008.787,40 | 4% marginal | 32.720,70 | 32.720,70 |

Vale notar como o Agro Aliança acertou o caso mais escorregadio, `S24 mercado 70%`: a base de R$ 1.008.787,40 fica **abaixo** do teto de 4.000 UPF (R$ 1.017.440), então a faixa de 4% tem de ser marginal — R$ 30.177,10 sobre o excedente, não os R$ 30.523,20 da largura cheia. É exatamente a distinção que o mecanismo M1 perde.

Ou seja: **a regra correta já é a regra da casa.** O motor não está introduzindo uma interpretação nova nem corrigindo um entendimento — está codificando o que o próprio escritório já aplica, e que se degrada quando a planilha é copiada de um caso para outro. Isso muda a natureza da homologação: o que precisa ser aprovado não é *a fórmula*, e sim os parâmetros e as divergências de dados da seção 8.

O único valor divergente do Agro Aliança tem causa-raiz identificada em uma célula (D13).

---

## 4. Entradas e parâmetros

### 4.1 Parâmetros legais — externos, versionados por competência

| Parâmetro | Valor nos artefatos | Origem | Situação |
|---|---|---|---|
| `upf_mt` | 254,36 (Jan/26) · **255,20 (Fev/26)** · **256,04 (Mar/26)** | OCULTAS · WP `C90/C119/C147/C172` · PPT slides 7 e 11 | **Divergente (D3)** e sem fonte oficial |
| faixas e alíquotas (doação) | 500/1.000/4.000/10.000 UPF · 0/2/4/6/8% | ST-PPT slide 7 · AA-PDF pág. 8 · AA-PPT slide 15 · `C92:C96` dos WPs | **Idênticas nos 3 trabalhos e nos 20 blocos**; sem fonte oficial |
| faixas (causa mortis) | 8% acima de 16.000 UPF | PPT slide 13 | Fora do recorte; ver D10 |
| `fator_usufruto` | 0,70 | WP `F91/H91/J91` e pares · PPT slides 8 e 12 | **Regra divergente (D9)** |
| `fator_extincao_usufruto` | 0,30 ou 0,70 | PPT slide 12 vs slide 8 | **Divergente (D9)** |

A UPF é série mensal. Os quatro valores observados nos artefatos:

| Competência | UPF/MT | Onde aparece |
|---|---|---|
| Jan/2026 | 254,36 | Agro Aliança (PDF pág. 8, PPTX slide 15, 7 blocos do WP) |
| Fev/2026 | 255,20 | Santa Terezinha (4 blocos da aba visível) |
| Mar/2026 | 256,04 | Santa Terezinha (PPTX slides 7 e 11) |
| Mai/2026 | 260,10 | Bocolli (3 blocos da aba 1) |

**A série não é linear.** Jan→Fev e Fev→Mar sobem R$ 0,84, mas Mar→Mai sobe R$ 4,06 (≈ R$ 2,03/mês). O motor **não pode extrapolar** a UPF: ela tem de vir de tabela versionada por competência, alimentada pela fonte oficial. Uma extrapolação de +0,84/mês daria R$ 257,72 para Mai/2026 contra os R$ 260,10 reais — e, pelo efeito da seção 3.4, isso erraria o imposto em R$ 737,80 por donatário em base acima de 10.000 UPF.

No WP a UPF está **repetida à mão em cada bloco** (4 células no Santa Terezinha, 9 no Bocolli), o que permite que blocos da mesma pasta divirjam entre si sem aviso — e é o que acontece: as duas pastas contêm **duas competências misturadas** (ver seção 8, D12).

### 4.2 Parâmetros de avaliação — premissas do trabalho, não lei

| Parâmetro | Valor | Célula | Observação |
|---|---|---|---|
| `sacas_por_ha` | 900 | embutido em `H21` | rótulo em `H18`: "900 sacas por há a 105" |
| `preco_saca` | R$ 105,00 | embutido em `H21` | |
| `valor_ha_mercado` | R$ 94.500,00/ha | derivado | `900 × 105`, embutido em 8 fórmulas |
| `valor_quota_contabil` | R$ 1,00 | `F35` | |

`sacas_por_ha` e `preco_saca` estão **hardcoded dentro de cada fórmula de imóvel** (`=(105*900)*D21`), não em célula de parâmetro. No motor viram entrada única.

### 4.3 Entradas de cadastro

**Bens (WP `B21:I31`, 11 linhas):** denominação, matrícula, área, município/UF, valor contábil, valor ITR/IPTU, valor de mercado, empresa integralizada.

- Área está armazenada como **texto** (formato `@`, vírgula decimal: `"244,4318"`). Funciona por coerção do Excel. No motor é **numérica obrigatória**.
- Valor de mercado tem **três origens distintas** na mesma coluna, sem campo que as distinga: fórmula por hectare (8 linhas), cópia do IPTU (`H25 = G25`), valor fixo digitado (`H28 = 1.000.000`, `H29 = 800.000`). O motor precisa de um campo explícito `origem_valor_mercado`.

**Moeda corrente (`J28:J30`):** 2.000,00 + 3,78 + 1,60 = R$ 2.005,38, somada às três bases.

**Quadro societário (`C12:E15`, `L28:O32`):** quotas e valor por sócio.

### 4.4 Entradas declaradas e mortas — não portar como estão

O grafo de referências da aba visível mostra **entradas que a planilha declara e nunca usa**:

| Grupo | Células | Situação |
|---|---|---|
| `Base de Cálculo - %` = 100% | `C76 F76 I76 C105 F105 I105 C133 F133 I133 C160 F160 I160` | **12 células mortas.** Nenhuma fórmula as referencia |
| fator 100% do escalonamento | `E91 G91 I91` + pares nos 4 blocos | **12 células mortas** |
| alíquota "Isento" | `C92` (texto) | morta |
| fator 70% do escalonamento | `F91 H91 J91` + pares | **vivas** — únicas referenciadas (`F90 = E90*F91`) |

Ou seja: **o percentual da base de cálculo aparece na tela como parâmetro configurável e não afeta resultado nenhum.** No motor ele é entrada real (`fator_base ∈ {1,00; 0,70}`).

Somando as saídas mortas do ramo de usufruto (seção 5) e `M127`/`N127` (seção 6), a aba visível tem **39 células declaradas e não referenciadas** — 38 delas verificáveis por `scripts/itcmd/analisar-wp.py`, mais `C92` ("Isento", texto).

---

## 5. Cadeia de cálculo

```
(1) Bens + moeda            → total por base de avaliação (contábil, ITR, mercado)
(2) Total contábil          → universo de quotas (R$ 1,00/quota)
(3) Total ITR e mercado     → valor por quota  =  total_base / total_contábil
(4) Quotas por fundador     → legítima e disponível por donatário
(5) Quotas do donatário     → base de cálculo por cenário  =  quotas × valor_por_quota × fator_base
(6) Base de cálculo         → imposto (seção 3)
```

### 5.1 "Cenário" significa duas coisas diferentes — e o motor precisa separá-las

Nas pastas, a palavra *cenário* nomeia **dois eixos distintos**, no mesmo arquivo:

- **eixo estrutural** — o arranjo da operação. É o que nomeia as abas `Cenário II` e `Cenário III` e os slides "Simulação – Cenário I/II/III" do Agro Aliança.
- **eixo de avaliação** — qual valor do bem serve de base. É o que rotula as colunas: `Cenário I - VALOR CONTÁBIL`, `Cenário II - VALOR ITR`, `Cenário III - VALOR DE MERCADO`.

Os dois convivem: **dentro da aba chamada `Cenário III` existem colunas rotuladas `Cenário I`, `Cenário II` e `Cenário III`**, significando outra coisa. Confirmado em 4 blocos do ST-WP e 3 do BO-WP.

No motor os dois eixos são dimensões independentes e devem ter nomes próprios:

| Eixo | Nome proposto | Valores |
|---|---|---|
| estrutural | `arranjo` | livre, por trabalho (ex.: `doacao_com_complemento_usufruto`) |
| avaliação | `base_avaliacao` | `contabil` · `itr` · `mercado` |
| redução de usufruto | `fator_base` | `1,00` · `0,70` |

O brief da tarefa pede "casos golden-master dos três cenários". Vale registrar a ambiguidade: no **Agro Aliança** existem três arranjos estruturais (slides 17–27); no **Santa Terezinha** existe **um só** arranjo (doação de 100% com usufruto) avaliado sob três bases. Os dois trabalhos usam "três cenários" para coisas diferentes. Os casos congelados na seção 10 cobrem as duas leituras.

### 5.2 O fato gerador não é único — é uma sequência

O ST-WP modela **uma** doação. O Agro Aliança mostra que um arranjo pode ter **vários fatos geradores encadeados**, cada um com sua própria base e seu próprio recolhimento:

| Arranjo | Eventos tributáveis | Total contábil |
|---|---|---|
| Cenário I | doação dos fundadores → filhas · instituição de usufruto sobre 426.052 quotas | R$ 235.409,54 |
| Cenário II | doação Regina → Cristina · doação dos fundadores → filhas · instituição de usufruto (Cristina) · instituição de usufruto (Regina) | R$ 250.708,42 |
| Cenário III | aumento de capital (não tributável) · doação dos fundadores → filhas | R$ 286.898,26 * |

\* corrigido; o slide 27 publica R$ 252.098,26 — ver D13.

**Evento tributável** é o mesmo que **fato gerador**: cada ato assinado separadamente que faz o imposto nascer, com guia de recolhimento própria. Uma doação de quotas é um. Uma instituição de usufruto é outro.

Consequências para o motor, nenhuma delas atendida por uma planilha de bloco único:

1. A entidade central é o **evento tributável**, não a doação. Cada evento tem `arranjo`, `tipo` (doação / instituição de usufruto / extinção de usufruto), `ordem`, `doador`, `donatário`, `base`, `competência da UPF` e `fator_base`.
2. O **custo do arranjo** é a soma dos eventos. Nenhum artefato apresenta esse total consolidado — os slides 18/20 e 22/24 mostram os eventos separados e nunca somados. Foi preciso somá-los aqui para poder comparar arranjos.
3. A **instituição de usufruto é fato gerador autônomo**, na direção inversa da doação (filha → fundadores). O ST-WP não tem esse bloco; o Santa Terezinha pode ter a mesma lacuna de custo.
4. Eventos do mesmo arranjo podem cair em **competências de UPF diferentes** se ocorrerem em meses distintos — o que hoje acontece por acidente (D12) precisa passar a ser intencional.

#### Por que o evento não pode ser colapsado: progressividade não é aditiva

Somar as bases de vários eventos e calcular uma vez **não dá o mesmo resultado** que calcular evento a evento. Com UPF 254,36:

| | Base | Faixa | Imposto |
|---|---|---|---|
| dois atos de R$ 1.000.000 | 1.000.000,00 ×2 | 4% | **64.738,40** |
| um ato de R$ 2.000.000 | 2.000.000,00 | 6% | **92.020,40** |

Diferença de R$ 27.282,00 — **42% a mais** ao colapsar. No Cenário II real do Agro Aliança o erro do colapso é de **R$ 146.141,98 (+58%)**: R$ 250.708,42 somando os quatro eventos contra R$ 396.850,40 tratando a soma das bases como um ato único.

Ou seja: **o resultado depende de quantos eventos existem**, não apenas do patrimônio envolvido. Sem a entidade, o número não é reproduzível.

Dois esclarecimentos que a assimetria acima convida a errar:

- **Contar eventos não é alavanca de economia.** No Agro Aliança, o arranjo com **4 eventos é mais caro** que o de 2 (R$ 250.708,42 contra R$ 235.409,54), porque o evento extra — a doação entre irmãs — **move valor novo** em vez de fatiar base existente. Evento a mais que transfere patrimônio adicional é imposto a mais, sempre.
- **Fracionar o mesmo ato não funciona.** Se funcionasse, 35 parcelas de R$ 127.100 do mesmo total de R$ 4.448.500 dariam imposto **zero**, todas dentro da isenção de 500 UPF. O que impede isso é a regra de acumulação por beneficiário — ver **D15**, que é exatamente a regra que falta.

#### Forma da entidade

```
simulacao                        (o arranjo)
  └── evento_tributavel          ← a entidade ausente no briefing da SUC-01B
        │  ordem                  1..n
        │  tipo                   doacao | instituicao_usufruto | extincao_usufruto
        │  doador, donatario      papéis DESTE ato, não da simulação
        │  competencia_upf        o mês deste ato
        │  fator_base            1,00 | 0,70
        └── resultado             por base_avaliacao (contábil / ITR / mercado)
```

Dois motivos pelos quais doador e donatário são do **evento** e não da simulação: no Agro Aliança a **direção inverte** no meio do arranjo (atos 3 e 4 vão da filha para os pais), e a **mesma pessoa troca de papel** — Cristina é donatária no ato 2 e doadora no ato 3. Papel fixo por participante na simulação não representa nenhum dos dois casos.

#### A entidade já existe nas planilhas, sem nome

Cada **bloco de escalonamento** é um evento tributável. São **20 blocos** nas duas pastas (seção 2). Eles são criados por cópia, não têm identificador, não sabem a que arranjo pertencem e nunca são somados. É daí que nascem os mecanismos **M3** (base colada como literal do bloco anterior — os R$ 34.800 de D13) e **M4** (remendo copiado lateralmente entre colunas). Ambos são erros de *cópia de bloco*: dar identidade ao evento elimina a cópia e, com ela, a classe de erro.

### 5.3 O ranking dos arranjos depende da base de avaliação

O slide 28 do Agro Aliança afirma, sem qualificar, que o Cenário II é "o mais oneroso". Somando os eventos:

| Base | 1º (mais barato) | 2º | 3º (mais caro) |
|---|---|---|---|
| contábil | I — 235.409,54 | II — 250.708,42 | **III — 286.898,26** |
| ITR | I — 1.313.875,29 | III — 1.410.922,61 | II — 1.551.302,23 |
| mercado | I — 2.401.560,00 | III — 2.516.032,29 | II — 2.867.973,88 |

A afirmação vale em ITR e mercado, **não vale em contábil** — e não vale nem com o valor errado do slide 27 (R$ 252.098,26 já colocaria o III acima do II). A recomendação de fundo ("Cenário I é o mais econômico") se sustenta nas três bases, corrigido ou não. O motor deve devolver o ranking **por base**, nunca um vencedor único.

### Etapa 1 — bases de avaliação

Reconstrução independente das 11 linhas de bens + moeda **reproduz os três totais do WP ao centavo**:

| Base | Reconstruído | WP | Confere |
|---|---|---|---|
| Contábil | 6.649.400,00 | `F34` = 6.649.400,00 | sim |
| ITR/IPTU | 29.155.992,05 | `G34` = 29.155.992,05 | sim |
| Mercado | 322.960.281,82 | `H34` = 322.960.281,82 | sim |

### Etapa 3 — valor por quota

```
valor_quota_itr     = 29.155.992,05  / 6.649.400 = 4,384755323788612506391554125…
valor_quota_mercado = 322.960.281,82 / 6.649.400 = 48,56983815381838962913947123…
```

Rateio *pro rata* do acervo pela participação em quotas. **Estes valores nunca podem ser arredondados**: arredondar `4,3848` a 2 decimais desloca o total de ITR em ~R$ 100 mil.

O motor deve usar o **quociente exato**, não o número que o WP exibe. As células `G35`/`H35` guardam a aproximação binária (`4,384755323788613` e `48,569838153818388`), que diverge do quociente a partir da 16ª casa e é o que produz o ruído de `F79 = 14.577.996,025000002`.

### Etapa 4 — legítima e disponível

Regra do WP (`E41 = C40/2/2`), para 2 herdeiros necessários:

```
legítima_total   = quotas_fundador / 2      (art. 1.846 CC — 50% indisponível)
disponível_total = quotas_fundador / 2      (art. 1.849 CC)
por donatário    = cada metade / nº de herdeiros
```

No caso de referência os totais são divisíveis por 4 e não há resto: `6.086.672/4 = 1.521.668` e `562.728/4 = 140.682`, exatos. A regra de resto (D4) portanto **nunca é exercitada pelos dados do WP** — precisa de caso de teste sintético.

### Etapa 6 — usufruto

O PPT (slide 8) invoca o art. 11, §2º, I do Decreto 2.125/03 para reduzir a base a 70% no ato da doação, e o art. 28, §3º, III para permitir o recolhimento integral antecipado. O WP implementa as duas hipóteses **em colunas paralelas** (100% e 70%) para cada uma das três bases — 6 colunas por bloco.

**Porém: as 12 células de saída das colunas de 70% são mortas.** `F97 H97 J97 F126 H126 J126 F154 H154 J154 F179 H179 J179` não são referenciadas por nada. O ramo do usufruto é calculado e descartado; só as colunas de 100% alimentam os quadros-resumo. Isso é coerente com a nota do slide 12 ("os valores acima consideram o recolhimento com a base de cálculo em 100%"), mas significa que **o cenário de 70% nunca foi validado por ninguém** — e é justamente onde estão 2 dos 4 resultados negativos.

---

## 6. Rastreabilidade — saída → fórmula → célula

Os quatro blocos "QUADRO 4 - SIMULAÇÃO DO ITCD" da aba visível:

| Bloco | Linhas | Escopo real | Base contábil por donatário | Célula da base |
|---|---|---|---|---|
| 1 | 73–97 | consolidado (Cristiano + Fabiane) | 3.324.700 | `C79 → C68 → G57` |
| 2 | 102–126 | só a doação do Cristiano | 3.043.336 | `C108 → G41` |
| 3 | 130–154 | só a doação da Fabiane | 281.364 | `C136 → G48` |
| 4 | 159–179 | rotulado "Fabiane", **é a doação inteira do Cristiano** | 6.086.672 | `C163 = C108+C109` |

Mapa de cada saída dentro de um bloco (padrão do bloco 1; os outros deslocam +29, +57, +82 linhas):

| Saída | Célula | Fórmula |
|---|---|---|
| UPF | `C90` | literal 255,20 |
| base 100% | `E90` | `=C79` |
| base 70% | `F90` | `=E90*F91` |
| teto faixa 2 | `D93` | `=C90*1000` |
| teto faixa 3 | `D94` | `=C90*4000` |
| teto faixa 4 | `D95` | `=C90*10000` |
| imposto faixa 2 | `E93` | `=(D93-D92)*C93` |
| imposto faixa 3 | `E94` | `=(D94-D93)*C94` |
| imposto faixa 4 | `E95` | `=(D95-D94)*C95` |
| imposto faixa 5 | `E96` | `=(E90-D95)*C96` |
| **imposto total** | `E97` | `=SUM(E92:E96)` |
| ITCD por donatário | `C82` | `=E97` |
| ITCD total | `C84` | `=SUM(C82:C83)` |
| "o que vai na apresentação" | `L127 M127 N127` | `=C113+C141`, `=F113+F141`, `=I113+I141` |

**Rastro rompido:** `L127` (total de ITCD **contábil**, R$ 336.953,44) alimenta `I161`, célula rotulada **"Total Valor de Mercado"**. `M127` e `N127` são mortas. Ou seja, o rótulo "o que vai na apresentação" identifica células que em parte não vão a lugar nenhum e em parte vão para o lugar errado.

**Cabeçalhos zerados:** `C106/F106/I106` (bloco 2), `C134/F134/I134` (bloco 3) e `C161/F161` (bloco 4) apontam para linhas vazias (`J72+J79`, `K100`, `L127+L134`) e devolvem **0,00** sob os rótulos "Total Valor Contábil / ITR / de Mercado".

---

## 7. Arredondamento e precisão

O WP **não arredonda em nenhum ponto**. Decisões que o motor precisa tomar e que o WP não permite inferir:

| Item | Decisão especificada | Justificativa |
|---|---|---|
| Aritmética interna | decimal de precisão arbitrária (`Decimal`), nunca `float` | o WP propaga ruído binário: `F79 = 14.577.996,025000002` |
| Valor por quota | **nunca arredondar** | arredondar a 2 decimais desloca o ITR em ~R$ 100 mil |
| Faixas intermediárias | **não arredondar** | |
| Imposto final | 2 decimais, **meio para cima**, uma única vez por donatário/cenário | |
| Quotas | inteiras sempre | |
| Resto na divisão de quotas | ver D4 — **não decidido** | |

Impacto de arredondar por faixa em vez de só no total: centavos. O slide 11 do PPTX (47.061,56) fecha com soma exata sem arredondamento intermediário, o que é compatível com — mas não prova — a regra acima.

---

## 8. Divergências — tabela de decisão

Nenhuma foi resolvida por escolha própria. Cada linha traz o que a aritmética já permite afirmar e o que falta decidir.

### D1 — Universo de quotas: 6.649.400 (WP) vs 7.326.876 (PPT) · **Δ 677.476 quotas**

Origem isolada: o aumento de capital.

| Componente | WP | PPT slide 3 |
|---|---|---|
| capital inicial GCB Agro | 1.123.456 (`N16 = 2*L25`) | 1.123.456 |
| aumento (imóveis 2º momento + moeda) | **5.523.944,00** (`N22 = L22+L23`) | **6.201.420,00** |
| capital GCB Participações | 2.000 | 2.000 |
| **total** | **6.649.400** | **7.326.876** |

Ambos os lados são internamente consistentes. O WP casa exatamente com o total contábil dos bens (`F34 = 6.649.400,00`); o PPT casa com suas próprias tabelas de QSA. **Impacto:** altera todas as bases e todos os impostos dos três cenários.
→ *Decisão necessária: qual conjunto de bens compõe o aumento de capital.*

### D2 — Rateio do aumento entre os fundadores

| | WP (`M29`/`M30`) | PPT slide 3 |
|---|---|---|
| Cristiano | 6.086.672 — **91,54%** | 4.290.321 — 58,56% |
| Fabiane | 562.728 — **8,46%** | 3.036.555 — 41,44% |

O WP atribui **100% do aumento do 2º momento ao Cristiano**; o PPT reparte 3.727.593 / 2.473.827. `Sheet1` (oculta) registra rateio **50%/50%** dos imóveis entre os dois — uma terceira versão.
→ *Decisão necessária: o rateio. Ele determina o valor da legítima de cada linha sucessória e, por ser progressivo, o imposto não é linear no rateio.*

### D3 — Competência da UPF

254,36 (Jan/26, OCULTAS) · **255,20** (WP, rótulo "UPF/Fevereiro de 2026") · **256,04** (PPT slides 7 e 11, "UPF Mar/2026"). Apresentação datada de março.
**Impacto exato:** −R$ 260,40 por donatário/cenário nas bases acima de 10.000 UPF ao usar Mar em vez de Fev (seção 3.4).
→ *Decisão necessária: a competência é a da data do fato gerador (recolhimento) ou a da data da simulação? E confirmar a série na fonte oficial.*

### D4 — Resto na divisão entre legítima e disponível

WP: partes exatamente iguais (1.662.350 / 1.662.350). PPT slide 9: **1.831.720 legítima / 1.831.718 disponível** — 1 quota deslocada por donatário, embora 7.326.876/4 = 1.831.719 seja exato.

A regra está escrita, mas em **aba oculta** (`DOAÇÃO 100% COM USUFRUTO `, `B15:B16`): *"Arredondamento — 1 a 2 para legítima e reduz disponível"*.
→ *Decisão necessária: homologar a regra (a legítima absorve o resto e a disponível é reduzida) e definir se ela se aplica mesmo quando não há resto, como o PPT fez.*

### D5 — PPTX contradiz o próprio PPTX na base contábil

Slide 9: total contábil **3.036.555** (per donatário 1.518.277 / 1.518.278). Slide 12: total contábil **6.649.400** (per donatário 3.663.438). Nenhum dos dois é a metade do outro; 3.036.555 é o total de quotas da GCB Participações no slide 3.
→ *Decisão necessária: qual é a base contábil da doação.*

### D6 — PPTX contradiz o WP em ITR e mercado

| | PPT slide 9 | WP `G34`/`H34` |
|---|---|---|
| ITR total | 12.083.427,71 | 29.155.992,05 |
| Mercado total | 133.847.858,43 | 322.960.281,82 |

Razão mercado/ITR: 11,08 no PPT, 11,08 no WP — proporção preservada, escala diferente (~2,41×). Sugere conjuntos de bens distintos, não erro de digitação.
→ *Decisão necessária: qual acervo avaliar.*

### D7 — ITCD do slide 12 não é reproduzível e viola o teto legal

| Cenário | Base (slide 12) | ITCD (slide 12) | Alíquota efetiva | Correto @256,04 |
|---|---|---|---|---|
| contábil | 3.663.438,00 | 163.477,48 | 4,46% | 213.702,64 (5,83%) |
| ITR | 14.577.996,03 | 920.053,20 | 6,31% | 1.086.867,28 (7,46%) |
| mercado | 161.480.140,91 | **74.384.119,18** | **46,06%** | 12.839.038,87 (7,95%) |

Uma alíquota efetiva de 46,06% é impossível sob uma tabela cujo topo é 8% — isto é prova aritmética de erro, independente de qualquer interpretação.

**Busca exaustiva pela origem, e o que ela descarta.** Foram testadas **3.520 combinações por alvo**: as 22 bases numéricas presentes nos artefatos do Santa Terezinha × as 4 UPFs conhecidas × 5 fatores de escala (1,00 · 0,70 · 0,30 · 0,50 · 2,00) × 8 variantes de fórmula — a correta, as **três variantes defeituosas efetivamente encontradas nas planilhas** (M1, M2 e soma de alíquotas) e quatro alíquotas lineares. **Nenhuma combinação chega a 5 centavos de nenhum dos três alvos.**

Conclusão que isso permite, e que a versão anterior desta spec não tinha: **o arquivo que gerou o slide 12 não é nenhum dos artefatos disponíveis.** Não é erro de fórmula do ST-WP — é outra fonte. Diferente do D13, cuja causa-raiz está numa célula identificada, aqui não há o que corrigir sem localizar a planilha de origem.

→ *Ação necessária, e ela é específica: **localizar o arquivo que gerou o slide 12**. Enquanto não aparecer, os três valores não têm procedência e devem ser recalculados a partir do zero. **É a divergência mais grave: são os valores que foram ao cliente.***

### D15 — Não existe regra de acumulação de doações sucessivas

Nenhum dos seis artefatos trata do caso de **doações sucessivas entre o mesmo doador e o mesmo donatário**. A spec, até esta versão, também não: a seção 3 especifica o imposto de um evento isolado.

Isso importa porque a progressividade é fortemente decrescente no fracionamento. Fracionar R$ 4.448.500 (UPF 254,36):

| Fracionamento | Imposto total |
|---|---|
| 1 ato | 277.028,40 |
| 2 atos | 210.950,80 |
| 4 atos | 154.991,60 |
| 10 atos | 101.632,00 |
| **35 atos de R$ 127.100** | **0,00** — cada parcela dentro da isenção de 500 UPF |

Um tributo que vira zero por parcelamento não é um tributo, então existe uma regra que fecha isso. O único texto disponível é o slide 29 dos decks, citando a LC 227/2026: a progressividade *"deve obrigatoriamente variar de forma crescente conforme o valor do quinhão, legado ou **doação recebida por cada beneficiário**"* — o que aponta para base acumulada **por beneficiário**, não por ato. **Mas isso é a norma geral nacional parafraseada num slide, não o texto estadual.** A Lei 7.850/02 não foi lida e é ela que define o recorte da acumulação no MT (ano-calendário, total histórico, ou outro).

Consequências, se a regra existir:

1. Toda simulação está **incompleta sem o histórico de doações anteriores** entre aquele par. O motor precisa receber esse dado, e a tela da SUC-01C precisa pedi-lo.
2. O modelo de dados ganha mais um campo por evento: `doacoes_anteriores_ao_par`, com o recorte temporal aplicável.
3. Uma simulação aprovada pode **deixar de valer** quando uma doação nova ao mesmo par acontece — o que interage com a regra de revisão da SUC-01C.

→ *Decisão necessária (jurídica): o recorte de acumulação na Lei 7.850/02. Sem ela o motor calcula eventos isolados e pode subestimar todo caso com doação prévia entre as mesmas partes.*

### D8 — Coluna 70% do slide 11 não fecha consigo mesma

Base 877.636,20. Linhas do slide somam **42.076,63**; o total impresso é **24.493,77**; o correto é **27.424,25**. Três valores, nenhum coincide.
Já a coluna "Quotas 100%" do mesmo slide (base 1.253.766,00, total 47.061,56) **está exata** e é reproduzida ao centavo pela fórmula da seção 3 — é o único cálculo íntegro dos dois artefatos do **Santa Terezinha**. (No Agro Aliança há 31; ver 3.5.)

### D9 — Regra do usufruto, contradição interna do PPTX

Slide 8: *"redução (...) para 70% no ato da doação e o recolhimento de **mais 70%** na extinção do usufruto"*.
Slide 12: *"reduz a base de cálculo para 70%, podendo desde já, ser buscado o recolhimento dos **30% remanescentes**"*.
70% + 70% = 140% da base; 70% + 30% = 100%.
→ *Decisão necessária (jurídica): o texto do art. 11, §2º, I do Decreto 2.125/03. Define `fator_extincao_usufruto`.*

### D10 — Tabela aplicável ao evento morte

Slide 11 projeta ITCD *"em caso de falecimento do Sr. Cristiano"* usando as faixas de **doação** (topo em 10.000 UPF). Slide 13 afirma que em MT a progressividade atinge 8% *"para transmissões causa mortis acima de **16.000** UPF/MT e para doações acima de 10.000 UPF/MT"*.
→ *Decisão necessária: se o evento é causa mortis, o slide 11 usa a tabela errada. Exige uma segunda tabela parametrizada por tipo de fato gerador — hoje fora do recorte.*

### D11 — Área da matrícula 26910

Aba visível `D27` = **199,313 ha**. Aba oculta `J11` = **99,313 ha**. Impacto no valor de mercado: **R$ 9.450.000,00** (100 ha × R$ 94.500).
Agravante independente: a matrícula 26910 aparece **duas vezes** na aba visível (`C27` com 199,313 ha e `C30` com 300 ha).
→ *Decisão necessária: conferir a matrícula na certidão.*

---

### D12 — Duas competências de UPF na mesma pasta

Nas **duas** pastas convivem blocos com UPFs diferentes, sem nada que sinalize:

| Pasta | UPF | Blocos |
|---|---|---|
| ST-WP | 254,36 (Jan) | 7 blocos, abas ocultas |
| ST-WP | 255,20 (Fev) | 4 blocos, aba `Doação` |
| BO-WP | 254,36 (Jan) | 6 blocos, abas `Cenário II` e `Cenário III` |
| BO-WP | 260,10 (Mai) | 3 blocos, aba `DOAÇÃO 100% COM USUFRUTO ` |

No BO-WP isso é material: os arranjos II e III seriam comparados ao arranjo da aba 1 usando UPFs distantes 4 meses. Pelo coeficiente −310 da seção 3.4, a diferença Jan→Mai é de **R$ 1.779,40 por donatário** em base acima de 10.000 UPF, favorecendo artificialmente o arranjo calculado com a UPF maior.
→ *Decisão necessária: a competência é única por arranjo, ou por evento (seção 5.2, item 4)?*

### D13 — Erro de R$ 34.800,00 entregue ao Agro Aliança, com causa-raiz em uma célula

Slide 27 / página 20, Cenário III, Donatária Cristina, base contábil:

| | Valor |
|---|---|
| base declarada no mesmo slide | R$ 3.730.973,00 |
| ITCD publicado | R$ 184.826,24 |
| ITCD correto para essa base | **R$ 219.626,24** |
| diferença | **R$ 34.800,00** |

R$ 184.826,24 é exatamente o ITCD do **Cenário I** (base R$ 3.295.973,00, slide 18). Causa-raiz confirmada na célula **`Cenário III!E52` do ST-WP** (aba oculta) e do BO-WP: a base da coluna contábil está **digitada como literal `3295973`**, enquanto as colunas irmãs referenciam corretamente o quadro de quotas (`G52 = F43`, `I52 = I43`). O bloco do Cenário III foi construído copiando o do Cenário I; as referências de ITR e mercado foram atualizadas, a da coluna contábil ficou com o número colado.

O erro está **idêntico no AA-PDF de Fev/2026 e no AA-PPT posterior** — sobreviveu a pelo menos um ciclo de revisão. Não altera a recomendação de fundo (seção 5.3).
→ *Decisão necessária: reemitir o número ao cliente. É um erro de valor, com causa conhecida e correção determinada — não uma divergência de premissa.*

### D14 — Arquivo do Bocolli não contém dado do Bocolli

O BO-WP (`06.05.26`) é o working paper do Agro Aliança com a UPF atualizada para Mai/2026 e o quadro de usufruto alterado, mas com **sócios, fazendas, matrículas e valores integralmente do Agro Aliança**, em três abas **visíveis**. Ver seção 1.
→ *Decisão necessária: confirmar se é rascunho em andamento ou se algo foi entregue. Independente disso, é exposição de dado de cliente e não é questão de cálculo.*

---

## 9. Defeitos do WP que não devem ser portados

### 9.1 Os cinco mecanismos de falha do escalonamento

Todas as 11 células erradas das duas pastas caem em cinco mecanismos. Nenhum deles sobrevive à forma fechada da seção 3.2 — é por isso que a fórmula é a especificação normativa, e não a soma faixa a faixa.

| # | Mecanismo | Onde | Efeito máximo medido |
|---|---|---|---|
| **M1** | faixa intermediária cobrada pela **largura cheia** sem verificar se a base a alcança | ST-WP `F154`, `H154`, `G154`; oculta `DOAÇÃO`!`E70` | imposto **negativo** (−R$ 45.832,15) e sobrepreço de R$ 14.881,26 |
| **M2** | marginal medida a partir do **piso da faixa errada** | ST-WP `E154`; oculta `Cenário III`!`F71` | R$ 1.876,57 |
| **M3** | base digitada como **literal** em vez de referência ao quadro de quotas | `Cenário III`!`E52` (ST-WP e BO-WP); BO-WP `E58`, `E84` | **R$ 34.800,00 — entregue ao cliente (D13)** |
| **M4** | valor de faixa remendado à mão e **copiado lateralmente** para colunas de base diferente (`G89 = E89`) | BO-WP bloco 85, 3 colunas | R$ 78.975,18 por coluna |
| **M5** | linha da faixa de 8% **ausente** numa coluna cuja base excede o teto de 10.000 UPF | BO-WP `J90` | R$ 357.610,16 |

M4 é o mais instrutivo: **o remendo virou o defeito.** Alguém calculou corretamente a faixa de 6% para a base contábil (`E89`) e propagou o resultado para ITR e mercado com `=E89` — colunas cujas bases são 4× e 7× maiores. O trabalho manual que salva um bloco condena o vizinho.

M3 é o mais perigoso: o imposto fica **aritmeticamente correto para o número digitado**. Nenhuma conferência de "a conta fecha?" o pega — só uma que pergunte "a base é a mesma do quadro de quotas?". `scripts/itcmd/verificar-blocos.py` marca essas células como `LITERAL` e avisa explicitamente que não as valida.

### 9.2 Defeitos estruturais do ST-WP

| # | Defeito | Evidência | Efeito |
|---|---|---|---|
| B1 | = **M1**, ver 9.1 | `E95 = (D95-D94)*C95` com base de 196.954,80 | imposto negativo: `F154 = −45.832,15`, `H154 = −10.024,11` |
| B2 | = **M2**, ver 9.1 | `E150 = (E147-D149)*C150` | cobrança a mais de R$ 523,28 (bloco 3) |
| B3 | Isenção como texto `"-"` em 24 células; alíquota "Isento" (`C92`) morta | — | funciona por coerção do `SUM` |
| B4 | Zero `IF`/`ROUND`/`MIN`/`MAX`; só `SUM` (215× no ST-WP, 133× no BO-WP) | seção 2 | causa-raiz de M1 a M5 |
| B5 | Totais por soma manual em vez de `SUM` do intervalo | `F97 = F93+F94+F95` (exclui `F96`) | mascara faixas; `F179` inclui a faixa 5, `F97` não — inconsistente entre blocos |
| B6 | 24 células de entrada declaradas e não referenciadas | seção 4.4 | parâmetro visível que não afeta resultado |
| B7 | **As 12 saídas do ramo de 70% (usufruto) são mortas** | seção 5, etapa 6 | cenário calculado e descartado, nunca validado |
| B8 | Fio cruzado: ITCD contábil alimenta célula "Total Valor de Mercado" | `L127 → I161` | rótulo mente sobre o conteúdo |
| B9 | Cabeçalhos de total apontando para linhas vazias | `C106 F106 I106 C134 F134 I134` | exibem 0,00 |
| B10 | Bloco 4 rotulado "Fabiane" com base `C108+C109` | = doação integral do Cristiano | rótulo errado |
| B11 | Área como **texto** com vírgula decimal | `D21:D31`, formato `@` | depende de coerção do Excel |
| B12 | Ruído de ponto flutuante | `F79 = 14.577.996,025000002` | exige `Decimal` |
| B13 | 4 abas ocultas, 3 de **outro cliente**, 29 `#REF!`, 5 links externos rompidos | seção 1 | não é risco hipotético: já se materializou no BO-WP, com as abas **visíveis** (D14) |
| B14 | UPF repetida à mão por bloco (4 células no ST-WP, 9 no BO-WP) | seção 4.1 | permite duas competências na mesma pasta sem aviso (D12) |
| B15 | Nenhum artefato consolida o custo total de um arranjo com vários fatos geradores | seção 5.2 | arranjos foram comparados sem somar todos os eventos |

**Resumo quantitativo:** das 24 células de resultado da aba visível, **20 estão corretas e 4 estão erradas**. As 20 corretas o são porque a base excede o teto de 10.000 UPF — ponto em que a variante defeituosa coincide algebricamente com a correta — ou porque alguém apagou células e reescreveu a soma à mão. **Nenhuma está correta por construção.**

---

## 10. Casos golden-master

Congelados em `golden-master.json`. Dois grupos.

### G1 — Casos de regressão (o motor deve reproduzir)

20 células do WP verificadas como corretas, mais o slide 11. Todos com UPF 255,20, exceto o último.

| # | Cenário | Base | Esperado |
|---|---|---|---|
| G1.01 | consolidado · contábil 100% | 3.324.700,00 | 186.864,00 |
| G1.02 | consolidado · contábil 70% | 2.327.290,00 | 111.565,40 |
| G1.03 | consolidado · ITR 100% | 14.577.996,025 | 1.087.127,68 |
| G1.04 | consolidado · ITR 70% | 10.204.597,2175 | 737.255,78 |
| G1.05 | consolidado · mercado 100% | 161.480.140,91 | 12.839.299,27 |
| G1.06 | consolidado · mercado 70% | 113.036.098,637 | 8.963.775,89 |
| G1.07 | Cristiano · contábil 100% | 3.043.336,00 | 164.354,88 |
| G1.08 | Cristiano · contábil 70% | 2.130.335,20 | 99.748,11 |
| G1.09 | Cristiano · ITR 100% | 13.344.283,728 | 988.430,70 |
| G1.10 | Cristiano · ITR 70% | 9.340.998,610 | 668.167,89 |
| G1.11 | Cristiano · mercado 100% | 147.814.336,968 | 11.746.034,96 |
| G1.12 | Cristiano · mercado 70% | 103.470.035,877 | 8.198.490,87 |
| G1.13 | Fabiane · mercado 100% | 13.665.803,942 | 1.014.152,32 |
| G1.14 | Fabiane · mercado 70% | 9.566.062,760 | 686.173,02 |
| G1.15 | Cristiano integral · contábil 100% | 6.086.672,00 | 407.821,76 |
| G1.16 | Cristiano integral · contábil 70% | 4.260.670,40 | 261.741,63 |
| G1.17 | Cristiano integral · ITR 100% | 26.688.567,456 | 2.055.973,40 |
| G1.18 | Cristiano integral · ITR 70% | 18.681.997,219 | 1.415.447,78 |
| G1.19 | Cristiano integral · mercado 100% | 295.628.673,935 | 23.571.181,91 |
| G1.20 | Cristiano integral · mercado 70% | 206.940.071,755 | 16.476.093,74 |
| G1.21 | **PPT slide 11 · quotas 100% · UPF 256,04** | 1.253.766,00 | 47.061,56 |

### G2 — Casos de correção (o motor deve **divergir** do WP)

Onde o WP está errado. Estes são o teste que separa o motor da planilha.

| # | Cenário | Base | WP | Correto | Faixa exercitada |
|---|---|---|---|---|---|
| G2.01 | Fabiane · contábil 100% | 281.364,00 | 4.121,84 | **3.598,56** | 4% (defeito B2) |
| G2.02 | Fabiane · contábil 70% | 196.954,80 | **−45.832,15** | **1.387,10** | 2% (defeito B1) |
| G2.03 | Fabiane · ITR 100% | 1.233.712,297 | 19.584,98 | **45.950,74** | 6% (defeito B1) |
| G2.04 | Fabiane · ITR 70% | 863.598,608 | **−10.024,11** | **26.887,94** | 4% (defeito B1) |
| G2.05 | PPT slide 11 · 70% · UPF 256,04 | 877.636,20 | 24.493,77 | **27.424,25** | 4% (D8) |

### G4 — Corpus homologado do Agro Aliança (UPF 254,36)

**O grupo mais valioso.** São valores publicados em deck entregue ao cliente, que a fórmula da seção 3.2 reproduz ao centavo — e que cobrem as bordas que o Santa Terezinha não exercita: faixas de 2% e 4%, e bases reduzidas a 70%.

| # | Origem | Cenário | Base | Esperado | Faixa |
|---|---|---|---|---|---|
| G4.01 | S18 | Cenário I · Cristina · contábil | 3.295.973,00 | 184.826,24 | 8% |
| G4.02 | S18 | Cenário I · Regina · contábil | 1.152.527,00 | 41.172,02 | 6% |
| G4.03 | S18 | Cenário I · Cristina · ITR | 12.957.378,81 | 957.738,70 | 8% |
| G4.04 | S18 | Cenário I · Regina · ITR | 4.530.901,48 | 283.620,52 | 8% |
| G4.05 | S18 | Cenário I · Cristina · mercado | 22.297.318,63 | 1.704.933,89 | 8% |
| G4.06 | S18 | Cenário I · Regina · mercado | 7.796.866,59 | 544.897,73 | 8% |
| G4.07 | S20 | usufruto · quotas 100% | 426.052,00 | 9.411,28 | **4%** |
| G4.08 | S20 | usufruto · quotas 70% | 298.236,40 | 4.298,66 | **4%** |
| G4.09 | S20 | usufruto · ITR 100% | 1.674.927,91 | 72.516,07 | 6% |
| G4.10 | S20 | usufruto · ITR 70% | 1.172.449,53 | 42.367,37 | 6% |
| G4.11 | S20 | usufruto · mercado 100% | 2.882.249,70 | 151.728,38 | 8% |
| G4.12 | S20 | usufruto · mercado 70% | 2.017.574,79 | 93.074,89 | 6% |
| G4.13 | S22 | Cenário II · irmãs · contábil | 1.071.723,00 | 36.323,78 | 6% |
| G4.14 | S22 | Cenário II · irmãs · ITR | 4.213.238,67 | 258.207,49 | 8% |
| G4.15 | S22 | Cenário II · irmãs · mercado | 7.250.226,02 | 501.166,48 | 8% |
| G4.16 | S22 | Cenário II · fundadores · contábil | 2.224.250,00 | 105.475,40 | 6% |
| G4.17 | S22 | Cenário II · fundadores · ITR | 8.744.140,14 | 620.679,61 | 8% |
| G4.18 | S22 | Cenário II · fundadores · mercado | 15.047.092,61 | 1.124.915,81 | 8% |
| G4.19 | S24 | usufruto · quotas 100% | 213.026,00 | 1.716,92 | **2%** |
| G4.20 | S24 | usufruto · quotas 70% | 149.118,20 | 438,76 | **2%** |
| G4.21 | S24 | usufruto · ITR 100% | 837.463,95 | 25.867,76 | **4%** |
| G4.22 | S24 | usufruto · ITR 70% | 586.224,77 | 15.818,19 | **4%** |
| G4.23 | S24 | usufruto · mercado 100% | 1.441.124,85 | 58.487,89 | 6% |
| G4.24 | S24 | usufruto · mercado 70% | 1.008.787,40 | 32.720,70 | **4%** |
| G4.25 | S27 | Cenário III · Regina · contábil | 1.587.527,00 | 67.272,02 | 6% |
| G4.26 | S27 | Cenário III · Cristina · ITR | 13.755.054,39 | 1.021.552,75 | 8% |
| G4.27 | S27 | Cenário III · Regina · ITR | 5.852.768,23 | 389.369,86 | 8% |
| G4.28 | S27 | Cenário III · Cristina · mercado | 23.445.602,40 | 1.796.796,59 | 8% |
| G4.29 | S27 | Cenário III · Regina · mercado | 9.976.091,18 | 719.235,69 | 8% |

Cobertura por faixa: **2% em 2 casos, 4% em 6, 6% em 6, 8% em 15.** Nenhum caso de isenção — daí a necessidade de G3.

### G5 — Caso de correção do Agro Aliança

| # | Origem | Cenário | Base | Publicado | Correto | Mecanismo |
|---|---|---|---|---|---|---|
| G5.01 | S27 / pág. 20 | Cenário III · Cristina · contábil | 3.730.973,00 | 184.826,24 | **219.626,24** | M3 — `Cenário III!E52` literal (D13) |

### G3 — Casos sintéticos de borda (nenhum dado real os exercita)

Necessários porque os dados do WP não tocam a isenção, os limites exatos de faixa nem o resto na divisão de quotas.

| # | Caso | Base @255,20 | Esperado |
|---|---|---|---|
| G3.01 | base zero | 0,00 | 0,00 · `isento = true` |
| G3.02 | exatamente 500 UPF | 127.600,00 | 0,00 · `isento = true` |
| G3.03 | 1 centavo acima da isenção | 127.600,01 | 0,0002 → **0,00** |
| G3.04 | exatamente 1.000 UPF | 255.200,00 | 2.552,00 |
| G3.05 | exatamente 4.000 UPF | 1.020.800,00 | 33.176,00 |
| G3.06 | exatamente 10.000 UPF | 2.552.000,00 | 125.048,00 |
| G3.07 | 1 centavo acima de 10.000 UPF | 2.552.000,01 | 125.048,00 |
| G3.08 | resto na divisão de quotas | 7.326.877 quotas / 2 herdeiros | resto = 1 → regra D4 |

G3.03 e G3.07 fixam a política de arredondamento na fronteira; G3.02 e G3.06 fixam a regra "base igual ao teto pertence à faixa de baixo" (seção 3.3, item 2).

---

## 11. Achados de dados que impedem homologação

Independentes das divergências de fórmula. Todos na aba visível.

1. **23,0% da área sem valor de ITR.** As células `G22`, `G23` e `G30` estão vazias — Fazenda Terezinha II (505,653 ha), Reserva São Domingos II (158,842 ha) e a parcela de 300 ha. São 964,4950 ha de 4.192,8499 ha. O `SUM` trata vazio como zero, então **o cenário ITR está subavaliado sem nenhum aviso** — e é uma das três bases que vão ao cliente.
2. **Valor de ITR repetido em matrículas diferentes.** `G24` (matrícula 26060) = `G27` (matrícula 26910) = R$ 6.304.520,00. Números idênticos ao centavo em imóveis distintos indicam cópia.
3. **Matrícula 26910 duplicada** na tabela de bens, com áreas diferentes (199,313 ha e 300 ha) — ver D11. E a anomalia não é só a área: essas **duas linhas são as únicas com valor contábil na casa de R$ 10.000/ha**, contra R$ 71 a R$ 949/ha em todas as outras:

   | Linha | Matrícula | R$/ha contábil |
   |---|---|---|
   | 26 | 12353 | 71,31 |
   | 24 | 26060 | 168,16 |
   | 31 | 968 | 387,94 |
   | 23 | 17192 | 403,00 |
   | 21 | 17190 | 803,00 |
   | 22 | 17191 | 949,09 |
   | **30** | **26910** | **10.000,00** |
   | **27** | **26910** | **10.326,68** |

   Ou seja: o problema da matrícula 26910 está concentrado nas duas linhas, em área **e** em valor. Puxar essa certidão resolve mais que o D11.
4. **Três linhas sem denominação** (`B27`, `B30`, `B31`), identificadas só pela matrícula.
5. **Área da matrícula 26560 em m², não em ha** (`A25` = "m2", `D25` = 800,00). A fórmula por hectare foi corretamente evitada nessa linha (`H25 = G25`), mas nada no modelo de dados impede o erro — não há campo de unidade.

Itens 1 a 3 alteram a base de cálculo. Devem ser resolvidos antes de qualquer número novo sair.

---

## 12. Dependências

| Dependência | Situação |
|---|---|
| WP revisado | **atendida** (ST-WP) |
| Apresentação de referência | **atendida** (ST-PPT, AA-PDF, AA-PPT) |
| Segundo caso para validar a fórmula | **atendida** — Agro Aliança, 31/32 (não estava previsto e virou a base da seção 3.5) |
| Fonte oficial dos parâmetros (série UPF/MT; texto da Lei 7.850/02 e do Decreto 2.125/03) | **pendente** — trava D3, D9, D10, D12 |
| Responsável funcional (rateio, acervo, competência, reemissão) | **pendente** — trava D1, D2, D3, D5, D6, D7, D12, D13, D14 |
| Responsável jurídico (usufruto, legítima, causa mortis) | **pendente** — trava D4, D9, D10 |
| Certidão da matrícula 26910 e ITRs faltantes | **pendente** — trava D11 e seção 11 |

### Triagem: o que realmente depende de terceiros

A versão anterior desta spec classificou as 15 divergências em bloco como "aguardam homologação". Revisando item a item, **isso estava exagerado**. Boa parte é pesquisa em fonte pública, que não depende de decisão de ninguém.

**Não dependem de terceiros — 6 itens, executáveis já:**

| # | Por que não depende | O que fazer |
|---|---|---|
| **D3a** | a série UPF/MT é publicada pela SEFAZ/MT | conferir os 4 valores (254,36 · 255,20 · 256,04 · 260,10) na fonte oficial e montar a tabela versionada |
| **D9** | o art. 11, §2º, I do Decreto 2.125/03 é texto público | ler e resolver a contradição "mais 70%" × "30% remanescentes" pelo texto |
| **D10** | a tabela de *causa mortis* é texto público | levantar as faixas (topo em 16.000 UPF) como segunda tabela parametrizada |
| **D15** | a Lei 7.850/02 é texto público | ler o recorte de acumulação de doações sucessivas |
| **D12** | é decisão de desenho, não de negócio | competência de UPF por evento (seção 5.2, item 4) resolve |
| **D4** | pode ser parâmetro em vez de decisão | implementar as duas políticas de resto e deixar o default explícito; homologar depois, sem travar o motor |

**Dependem de terceiros de verdade — 9 itens:**

| # | Quem | Por que não há como resolver aqui |
|---|---|---|
| **D1** | funcional | os R$ 677.476 de diferença **não correspondem a nenhuma combinação de até 4 bens** da tabela (testado). Não é erro de soma: é outro conjunto de bens ou outra avaliação |
| **D2** | funcional | três rateios possíveis (91,54/8,46 · 58,56/41,44 · 50/50) e nenhum derivável dos outros |
| **D5 · D6** | funcional | qual acervo avaliar; a análise está fechada (os totais do WP reproduzem, os do slide 9 não reconciliam com nada) |
| **D7** | funcional | **busca exaustiva de 3.520 combinações descarta todos os artefatos disponíveis.** O pedido não é "homologue", é "ache o arquivo" |
| **D8 · D13** | funcional | análise e correção determinadas; falta só a decisão de reemitir |
| **D11** | documental | precisa da certidão da matrícula 26910 — e a anomalia é de área **e** de valor (seção 11, item 3) |
| **D14** | processo | limpar o arquivo do Bocolli; não é cálculo |

**Consequência para o cronograma:** dos 9 externos, **7 são decisão de reemissão ou de premissa do caso Santa Terezinha** — nenhum deles bloqueia a construção do motor. O motor depende de parâmetros, e parâmetro é dado, não código.

### Ordem de urgência

1. **D7** — ITCD do slide 12 do Santa Terezinha, alíquota efetiva de 46,06% sobre teto de 8%. Valor já apresentado, indefensável, sem causa-raiz identificada.
2. **D13** — R$ 34.800,00 no Cenário III do Agro Aliança. Valor já apresentado, causa-raiz e correção determinadas. Decisão é só sobre reemitir.
3. **D14** — dado do Agro Aliança dentro do arquivo do Bocolli, em abas visíveis. Não é cálculo, é exposição.
4. **D1 + D2** — universo de quotas e rateio do Santa Terezinha. Caminho crítico: sem eles, nenhuma base de cálculo daquele trabalho é definitiva, mesmo com a fórmula congelada.
5. Seção 11, itens 1–3 — 23,0% da área sem ITR e matrícula duplicada. Alteram base de cálculo.
6. O resto.

---

## 13. Como reproduzir

```bash
# 1. varre QUALQUER WP de ITCMD/MT: acha os blocos de escalonamento e confronta
#    cada total contra a forma fechada; avisa sobre UPFs misturadas e bases literais
python scripts/itcmd/verificar-blocos.py "<...>/Cópia de WP_Cálculo ITCMD_MT*.xlsx" \
                                         "<...>/Eixo Sucessório_Família Bocolli*.xlsx"

# 2. análise profunda do ST-WP: dump, grafo de referências, bens, faixas
python scripts/itcmd/analisar-wp.py "<...>/Cópia de WP_Cálculo ITCMD_MT*.xlsx"
python scripts/itcmd/analisar-wp.py "<...>/WP*.xlsx" --dump wp_dump.txt   # grava o dump

# 3. valida os casos congelados contra a forma fechada (sai 1 se algum divergir)
python scripts/itcmd/selftest-golden.py
```

Requer `openpyxl`.

**`verificar-blocos.py`** é o mais reutilizável: não depende do layout de um arquivo específico, localiza os blocos pelo rótulo "Escalonamento" na coluna B e vale para qualquer WP futuro. Produz a tabela da seção 2 (105 OK / 11 erradas em 20 blocos), o aviso de competências misturadas (D12) e a lista de bases digitadas como literal — inclusive `Cenário III!E52`, a célula de D13. **Limitação declarada no próprio output:** ele confere se o imposto fecha com a base, não se a base é a certa; o caso M3 passa como OK e por isso é listado à parte.

**`analisar-wp.py`** cobre o que é específico do ST-WP: as 38 células mortas, a reconstrução dos três totais de avaliação, a lacuna de 23,0% da área sem ITR e a matrícula duplicada.

**`selftest-golden.py`** é a porta de entrada do motor: quando ele existir, deve passar por este conjunto sem alterar o JSON. Hoje:

```
auto-teste golden-master: 63/63 casos conferem, 1 pendente de homologação
cobertura por faixa: isento = 2 · 2% = 5 · 4% = 9 · 6% = 13 · 8% = 34
bloqueios abertos: 14
```

Os PPTX e o PDF foram lidos com `python-pptx` e `pymupdf`; os scripts de extração ficaram no diretório de trabalho da sessão, porque as tabelas dos slides foram transcritas para as seções 8 e 10 e não precisam ser regeradas.
