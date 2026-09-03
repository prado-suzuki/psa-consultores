# Instrumento Particular de Parceria para Fins de Exploração Agropecuária — assinado × blocos da OSG WORK

Este arquivo casa **cada parágrafo do instrumento assinado** com o **bloco do catálogo da OSG WORK** (`tmpl_documento_bloco` → `tmpl_bloco` → `tmpl_bloco_versao.atual`) que o escreve.

O texto do assinado foi extraído do `.docx` **sem retoque** — inclusive os erros de digitação do original, e inclusive os marcadores de lista (`a)`, `I)`) que no Word são numeração automática e não estão em nenhum `<w:t>`.

**Como o casamento foi estabelecido, e por que ele não é estimativa:** as contagens estruturais fecham exatamente. O catálogo da Parceria tem 20 blocos `clausula`, 18 `paragrafo` e 12 `capitulo`; o instrumento assinado tem 20 cláusulas (Primeira a Vigésima), 18 parágrafos e 12 títulos de seção. O do Composse tem 20 `clausula`, 8 + 2 novos `paragrafo` e 5 `capitulo`; o assinado tem 20 cláusulas, 10 parágrafos e 5 capítulos. Nenhum bloco sobra e nenhuma cláusula fica órfã.

Os rótulos `CLÁUSULA PRIMEIRA:`, `Parágrafo Único:` e `CAPÍTULO I` **não estão no texto dos blocos**: são gerados pelo motor de numeração (`numeracao.ts`) a partir do `tipo` do bloco, depois do filtro de flags. Por isso um bloco de tipo `clausula` aparece aqui casado com um parágrafo do assinado que começa por `CLÁUSULA …:`.

**Fonte do assinado:** `G:\Drives compartilhados\OSG - Sucessão\MMS\Documentos Psa\Documentos Definitivos\Instrumentos Agrários\Minutas antigas\Contrato de Parceria\VF_Instrumento Particular de Parceria para Fins de Exploração Agropecuária _MMS Agro Ltda.docx`

**Documento no catálogo:** `Parceria Rural` — 57 blocos hoje, 58 depois da migration.

Os blocos `490` (Anexo Único) e `495` (alínea do Anexo) pertencem a este mesmo documento do catálogo, mas escrevem o **Anexo Único**, que no assinado é arquivo separado: estão em `MD-parceria-anexo.md`.

## Conferência de cobertura

| medida | valor |
| --- | --- |
| blocos deste arquivo | 55 |
| já existem no catálogo | 55 |
| criados pelas migrations, já aplicados | 0 |
| não existem e não estão previstos | 0 |
| parágrafos com conteúdo no assinado | 84 |
| desses, citados por algum bloco | 84 |
| parágrafos do assinado sem bloco, mas SEM conteúdo (lixo do `.docx`) | 0 |
| **parágrafos do assinado com conteúdo e sem bloco** | **0** |

**Nenhum parágrafo com conteúdo ficou sem bloco.**

## Legenda

- ✅ bloco existe no catálogo, e o conteúdo mostrado é o VIGENTE depois das migrations `20260902200358`, `20260902200359` e `20260902203333`, todas aplicadas
- ♻️ bloco existe, mas a migration `20260902200358` **reescreve** o texto
- 🆕 bloco **não existe**; a migration `20260902200358` o cria
- 🔁 bloco repetidor: uma instância por item da coleção

---

## O contrato, bloco a bloco

### ✅ `10` · Título — Parceria rural

**tipo:** `livre` · **versão atual:** 2

**No instrumento assinado** (linhas L1, L2):

> INSTRUMENTO PARTICULAR DE PARCERIA 
>
> PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA 

**Conteúdo no catálogo:**

```text
*INSTRUMENTO PARTICULAR DE PARCERIA*
*PARA FINS DE EXPLORAÇÃO {{ instrumento.natureza }}*
```

### ✅ `20` · Preâmbulo — Parceira outorgante

**tipo:** `livre` · **versão atual:** 2

**No instrumento assinado** (linha L4):

> PARCEIRA OUTORGANTE: MMS AGRO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o n.º 48.030.499/0001-06, registrada na Junta Comercial do Estado do Mato Grosso sob o NIRE n.º 51202129910, com capital social totalmente subscrito e integralizado no valor de R$ 872.674,00 (oitocentos e setenta e dois mil, seiscentos e setenta e quatros reais), com sede estabelecida na Rodovia MT 338, km 06, Fazenda Capuaba, s/n.º, Bairro Zona Rural, no município de Lucas do Rio Verde, Estado de Mato Grosso, CEP 78.455-000, neste ato representado por seus administradores José Eduardo de Macedo Soares Júnior, brasileiro, nascido em 23/05/1.957, filho de José Eduardo de Macedo Soares Sobrinho e Teresa Maria Alcantara Machado de Macedo Soares, casado sob o regime de comunhão parcial de bens, agricultor, portador do RG sob o  n.º 5934032 SSP/SP, inscrito no CPF/MF sob o n.º 035.573.648.95, residente e domiciliado na Rua José Haddad n.º 60, Apto.1.901, Edifício Riviera , Bairro Duque de Caxias, no município de Cuiabá, Estado de Mato Grosso, CEP 78043-298; e Maria Auxiliadora Malheiros, brasileira, nascida em 19/05/1.960, filha de Licio Malheiros e Ana Maria Pereira Malheiros, casada sob o regime de comunhão parcial de bens, agricultora, portadora do RG n.º 01737244 SJ/MT, inscrita no CPF/MF sob o n.º 161.944.461-53, residente e domiciliado na Rua José Haddad, n.º 60, Apto. 1.901, Edifício Riviera, Bairro Duque de Caxias, no município de Cuiabá, Estado de Mato Grosso, CEP 78.043-298.

**Conteúdo no catálogo:**

```text
*~PARCEIRA OUTORGANTE~*: {{ instrumento.outorganteQualificacao }}.
```

### ✅ `30` · Preâmbulo — Parceiros outorgados

**tipo:** `livre` · **versão atual:** 3

**No instrumento assinado** (linha L8):

> PARCEIROS OUTORGADOS: JOSÉ EDUARDO DE MACEDO SOARES JUNIOR, brasileiro, natural de São Paulo/SP nascido em 23/05/1.957, casado sob o regime de comunhão parcial de bens, agricultor, portador do RG  sob o n.º 5934032 SSP/SP inscrito no CPF/MF sob o n.º 035.573.648.95, residente e domiciliado na Rua José Haddad n.º 60, Apto.1.901, Edifício Riviera, Bairro Duque de Caxias, no município de Cuiabá, Estado de Mato Grosso; CEP 78043-298 e MARIA AUXILIADORA MALHEIROS, natural de Cuiabá/MT, nascida em 19/05/1.960, casada sob o regime de comunhão parcial de bens, agricultora, inscrita no CPF/MF sob o n.º 161.944.461-53, portadora do RG sob o  n.º 01737244 SJ/MT, residente e domiciliada na Rua José Haddad n.º 60, Apto.1.901, Edifício Riviera, Bairro Duque de Caxias, no município de Cuiabá, Estado de Mato Grosso, CEP78043-298.

**Conteúdo no catálogo:**

```text
*~PARCEIROS OUTORGADOS~*: {{#exploradores sep="; " fim=" e "}}{{ explorador.qualificacao }}{{/exploradores}}.
```

### ✅ `35` · Fecho do preâmbulo (parceria)

**tipo:** `livre` · **versão atual:** 1

**No instrumento assinado** (linha L11):

> As partes acima identificadas têm, entre si, justas e contratadas, o presente Instrumento Particular de Parceria para Fins de Exploração Agropecuária, que se regerá pelas cláusulas e condições descritas no presente.

**Conteúdo no catálogo:**

```text
As partes acima identificadas têm, entre si, justas e contratadas, o presente *Instrumento Particular de Parceria para Fins de Exploração {{ instrumento.naturezaTitulo }}*, que se regerá pelas cláusulas e condições descritas no presente.
```

### ✅ `40` · Capítulo — Das áreas cedidas em parceria

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L13):

> DAS ÁREAS CEDIDAS EM PARCERIA

**Conteúdo no catálogo:**

```text
Das Áreas Cedidas em Parceria
```

### ✅ `50` · Cláusula — Áreas cedidas em parceria

**tipo:** `clausula` · **versão atual:** 4 · **âncora:** `areas_cedidas`

**No instrumento assinado** (linhas L15, L17, L19, L21, L23, L26, L28):

> CLÁUSULA PRIMEIRA: As partes, por este instrumento contratual, constituem parceria rural para exploração agropecuária em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, cedendo a PARCEIRA OUTORGANTE em favor dos PARCEIROS OUTORGADOS os imóveis de sua posse e/ou propriedade, descritos nas alíneas “a” à “f” a seguir descritas, com os seus limites e confrontações dispostos no ANEXO ÚNICO deste instrumento:
>
> a) 200,6846 ha (duzentos hectares, sessenta e oito ares e quarenta e seis centiares) de um imóvel rural com área de 200,6846 ha (duzentos hectares, sessenta e oito ares e quarenta e seis centiares), denominado Lote n.º 05 do Setor 10, de propriedade de MMS Agro Ltda., situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 2.424, no Livro 02 (dois), Folhas/Ficha 01 (um) do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.407.004.529-3;
>
> b) 234,0000 ha (duzentos e trinta e quatro hectares) de um imóvel rural com área de 284,9610 ha (duzentos e oitenta e quatro hectares, noventa e seis ares e dez centiares), denominado Fazenda Capuaba, de propriedade de MMS Agro Ltda., situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 2.623, no Livro 02 (dois), folhas/ficha 01 (um), do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.016.074.624-4;
>
> c) 171,2000 ha (cento e setenta e um hectares e vinte ares) de um imóvel rural com área de 200,3965 ha (duzentos hectares, trinta e nove ares e sessenta e cinco centiares), denominado Lote n.º 04 do Setor 10, de propriedade de MMS Agro Ltda., situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 2.624, no Livro 02 (dois), folhas/ficha 01 (um), do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.032.174.165-5;
>
> d) 157,4000 ha (cento e cinquenta e sete hectares e quarenta ares) de um imóvel rural com área de 200,6331 ha (duzentos hectares, sessenta e três ares e trinta e um centiares), denominado Lote n.º 06 do Setor 10, de propriedade de MMS Agro Ltda., situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 2.626, no Livro 02 (dois), folhas/ficha 01 (um), do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.040.092.207-0;
>
> e) 225,5480 ha (duzentos e vinte e cinco hectares, cinquenta e quatro ares e oitenta centiares), denominado Fazenda Cristalina, de propriedade de MMS Agro Ltda, situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 2.628, no Livro 02 (dois), folhas/ficha 01 (um) do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.407.103.560-7;
>
> f) 217,8000 ha (duzentos e dezessete hectares e oitenta ares) de um imóvel rural com área de 220,066 ha (duzentos e vinte hectares, seis ares e sessenta centiares), denominado Fazenda Tarumã, de propriedade de MMS Agro Ltda., situado no município de Lucas do Rio Verde, Estado de Mato Grosso, com registro na matrícula de n.º 9.617, no Livro 02 (dois), folhas/ficha 01 (um) do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde, Estado de Mato Grosso, inscrito no cadastro de imóvel rural sob o n.º 901.032.174.190-6.

**Conteúdo no catálogo:**

```text
As partes, por este instrumento contratual, constituem parceria rural para exploração {{ instrumento.naturezaMinuscula }} em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, cedendo a *PARCEIRA OUTORGANTE* em favor dos *PARCEIROS OUTORGADOS* os imóveis de sua posse e/ou propriedade, descritos nas alíneas “{{ instrumento.primeiraAlinea }}” à “{{ instrumento.ultimaAlinea }}” a seguir descritas, com os seus limites e confrontações dispostos no *ANEXO ÚNICO* deste instrumento:

{{#imoveisDoAnexo sep=";\n\n"}}*{{ imovel.alinea }})* {{familia nome="Alínea de imóvel cedido"}}{{/imoveisDoAnexo}}.
```

### ✅ `70` · Capítulo — Da vigência

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L37):

> DA VIGÊNCIA

**Conteúdo no catálogo:**

```text
Da Vigência
```

### ✅ `80` · Cláusula — Vigência da parceria

**tipo:** `clausula` · **versão atual:** 3 · **âncora:** `vigencia`

**No instrumento assinado** (linha L38):

> CLÁUSULA SEGUNDA: A presente parceria rural para fins de exploração agropecuária tem vigência a contar da data da assinatura deste instrumento e findará em  10 de outubro de 2.025

**Conteúdo no catálogo:**

```text
A presente parceria rural para fins de exploração {{ instrumento.naturezaMinuscula }} tem vigência a contar da data da assinatura deste instrumento e findará em *{{ instrumento.dataEncerramentoExtenso }}*.
```

### ✅ `90` · Parágrafo — Devolução ao término

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L39):

> Parágrafo Primeiro: Não havendo renovação da presente parceria nos termos da Cláusula Nona, ao término da vigência deste instrumento, os PARCEIROS OUTORGADOS deverão devolver à PARCEIRA OUTORGANTE, independentemente de notificação ou interpelação judicial ou extrajudicial, os imóveis rurais objetos desta parceria. 

**Conteúdo no catálogo:**

```text
Não havendo renovação da presente parceria nos termos da {{ refs.preferencia }}, ao término da vigência deste instrumento, os *PARCEIROS OUTORGADOS* deverão devolver à *PARCEIRA OUTORGANTE*, independentemente de notificação ou interpelação judicial ou extrajudicial, os imóveis rurais objetos desta parceria.
```

### ✅ `100` · Parágrafo — Prazo indeterminado após o vencimento

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L40):

> Parágrafo Segundo: Ultrapassando o contrato a data prevista no caput desta cláusula, o contrato passará a ser por tempo indeterminado, podendo a PARCEIRA OUTORGANTE rescindi-lo a qualquer tempo. Neste caso, deverá notificar por escrito os PARCEIROS OUTORGADOS, os quais deverão sair dos imóveis objetos desta parceria dentro do prazo de 30 (trinta) dias a contar do recebimento da referida notificação se inexistir produto pendente de colheita; ou, se pendente a colheita, 30 (trinta) dias após a sua realização.

**Conteúdo no catálogo:**

```text
{{#instrumento.prorrogavel}}Ultrapassando o contrato a data prevista no _caput_ desta cláusula, o contrato passará a ser por tempo indeterminado, podendo a *PARCEIRA OUTORGANTE* rescindi-lo a qualquer tempo. Neste caso, deverá notificar por escrito os *PARCEIROS OUTORGADOS*, os quais deverão sair dos imóveis objetos desta parceria dentro do prazo de 30 (trinta) dias a contar do recebimento da referida notificação se inexistir produto pendente de colheita; ou, se pendente a colheita, 30 (trinta) dias após a sua realização.{{/instrumento.prorrogavel}}
```

### ✅ `110` · Capítulo — Das atividades

**tipo:** `capitulo` · **versão atual:** 2

**No instrumento assinado** (linha L42):

> DAS ATIVIDADES AGROPECUÁRIAS

**Conteúdo no catálogo:**

```text
Das Atividades {{ instrumento.naturezaPluralTitulo }}
```

### ✅ `120` · Cláusula — Atividades permitidas

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `atividades`

**No instrumento assinado** (linha L43):

> CLÁUSULA TERCEIRA: Os PARCEIROS OUTORGADOS poderão explorar nas áreas objeto deste instrumento de parceria lavouras de soja, milho, algodão, sorgo, milheto, feijão, arroz, girassol, crotalária, braquiária ou outra cultura legalmente permitida que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso da terra quantas vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou despesa adicional. Em se tratando da exploração pecuária ou de animais, poderão fazer uso das terras para cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves; ou outros animais, da maneira que lhes convier, obedecendo os limites deste contrato.

**Conteúdo no catálogo:**

```text
Os *PARCEIROS OUTORGADOS* poderão explorar nas áreas objeto deste instrumento de parceria lavouras de {{ instrumento.culturas }} ou outra cultura legalmente permitida que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso da terra quantas vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou despesa adicional.{{#instrumento.pecuaria}} Em se tratando da exploração pecuária ou de animais, poderão fazer uso das terras para cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves; ou outros animais, da maneira que lhes convier, obedecendo os limites deste contrato.{{/instrumento.pecuaria}}
```

### ✅ `130` · Capítulo — Das despesas

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L45):

> DAS DESPESAS

**Conteúdo no catálogo:**

```text
Das Despesas
```

### ✅ `140` · Cláusula — Despesas dos outorgados

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L46):

> CLÁUSULA QUARTA: Competirão aos PARCEIROS OUTORGADOS suportarem todas as despesas de preparo, plantio, cultivo, colheita e extração, limpeza e beneficiamento dos produtos produzidos nas áreas objetos da presente parceria, incluindo, mas não se limitando, aos gastos com mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, equipamentos, combustíveis, bem como, as despesas de aquisição de gado, vermífugos, ração, vacina, sais minerais e tudo mais que se fizer necessário para a subsistência, manutenção e desenvolvimento dos animais; ressalvadas as despesas expressamente assumidas pela PARCEIRA OUTORGANTE neste instrumento, incluindo o disposto na Cláusula Sétima, bem como as despesas que não estejam relacionadas à atividade rural e sim ao imóvel, a exemplo do pagamento de ITR, CAR, Georreferenciamento, CCIR, entre outros. 

**Conteúdo no catálogo:**

```text
Competirão aos *PARCEIROS OUTORGADOS* suportarem todas as despesas de preparo, plantio, cultivo, colheita e extração, limpeza e beneficiamento dos produtos produzidos nas áreas objetos da presente parceria, incluindo, mas não se limitando, aos gastos com mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, equipamentos, combustíveis, bem como, as despesas de aquisição de gado, vermífugos, ração, vacina, sais minerais e tudo mais que se fizer necessário para a subsistência, manutenção e desenvolvimento dos animais; ressalvadas as despesas expressamente assumidas pela *PARCEIRA OUTORGANTE* neste instrumento, incluindo o disposto na {{ refs.caso_fortuito }}, bem como as despesas que não estejam relacionadas à atividade rural e sim ao imóvel, a exemplo do pagamento de ITR, CAR, Georreferenciamento, CCIR, entre outros.
```

### ✅ `150` · Capítulo — Da participação nos frutos

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L48):

> DA PARTICIPAÇÃO DE CADA PARCEIRO NOS FRUTOS DA PARCERIA 

**Conteúdo no catálogo:**

```text
Da Participação de Cada Parceiro nos Frutos da Parceria
```

### ✅ `160` · Cláusula — Partilha dos frutos

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `partilha`

**No instrumento assinado** (linha L49):

> CLÁUSULA QUINTA: Resta desde já acordado entre as partes que caberá à PARCEIRA OUTORGANTE 30,00 % (trinta inteiros por cento) de todos os frutos que forem produzidos nas áreas objeto da presente parceria e aos PARCEIROS OUTORGADOS os outros 70% (setenta inteiros por cento), em conformidade com a previsão do artigo 96, VI, a, da Lei 4.504/64. Ademais, obrigam-se os PARCEIROS OUTORGADOS a armazenarem os frutos em depósito a ser indicado previamente pela PARCEIRA OUTORGANTE, suportando os custos decorrentes do transporte até o efetivo depósito. 

**Conteúdo no catálogo:**

```text
Resta desde já acordado entre as partes que caberá à *PARCEIRA OUTORGANTE* *{{ instrumento.percentualOutorgante }} ({{ instrumento.percentualOutorganteExtenso }})* de todos os frutos que forem produzidos nas áreas objeto da presente parceria e aos *PARCEIROS OUTORGADOS* os outros *{{ instrumento.percentualExplorador }} ({{ instrumento.percentualExploradorExtenso }})*, em conformidade com a previsão do artigo 96, VI, a, da Lei 4.504/64. Ademais, obrigam-se os *PARCEIROS OUTORGADOS* a armazenarem os frutos em depósito a ser indicado previamente pela *PARCEIRA OUTORGANTE*, suportando os custos decorrentes do transporte até o efetivo depósito.
```

### ✅ `162` · Parágrafo — Frutos da pecuária na recria e engorda

**tipo:** `paragrafo` · **versão atual:** 4

**No instrumento assinado** (linha L56):

> Parágrafo Primeiro: Considerar-se-á como “frutos” da pecuária, no caso de recria e engorda, o ganho de peso (kg) dos animais adquiridos pelos PARCEIROS OUTORGADOS para exploração de “pecuária de engorda” nas áreas objeto desta parceria. O ganho de peso descrito anteriormente será auferido pela diferença entre o peso inicial de aquisição de cada animal e o peso identificado na alienação do mesmo, sendo que eventuais animais já existentes nas áreas que são objeto desta parceria deverão ser pesados em até 30 (trinta) dias contados da assinatura deste instrumento, o qual será igualmente reconhecido como “peso inicial”. Identificado o ganho de peso, será assegurado à PARCEIRA OUTORGANTE a parcela de frutos descrita no caput, a qual lhe será entregue através da cessão de animais dos PARCEIROS OUTORGADOS com peso proporcional aos frutos. 

**Conteúdo no catálogo:**

```text
{{#instrumento.pecuariaRecriaEngorda}}Considerar-se-á como “frutos” da pecuária, no caso de recria e engorda, o ganho de peso (kg) dos animais adquiridos pelos *PARCEIROS OUTORGADOS* para exploração de “pecuária de engorda” nas áreas objeto desta parceria. O ganho de peso descrito anteriormente será auferido pela diferença entre o peso inicial de aquisição de cada animal e o peso identificado na alienação do mesmo, sendo que eventuais animais já existentes nas áreas que são objeto desta parceria deverão ser pesados em até 30 (trinta) dias contados da assinatura deste instrumento, o qual será igualmente reconhecido como “peso inicial”. Identificado o ganho de peso, será assegurada à *PARCEIRA OUTORGANTE* a parcela de frutos descrita no _caput_, a qual lhe será entregue através da cessão de animais dos *PARCEIROS OUTORGADOS* com peso proporcional aos frutos.{{/instrumento.pecuariaRecriaEngorda}}
```

### ✅ `164` · Parágrafo — Frutos da pecuária na cria

**tipo:** `paragrafo` · **versão atual:** 4

**No instrumento assinado** (linha L57):

> Parágrafo Segundo: Considerar-se-á como “frutos” da pecuária, no caso de cria, os bezerros nascidos do rebanho de fêmea de todos os animais decorrentes da presente parceria, sendo que à PARCEIRA OUTORGANTE será assegurada a parcela dos frutos descrita no caput, a qual lhe será entregue através da cessão de animais dos PARCEIROS OUTORGADOS em quantidade proporcional aos frutos. 

**Conteúdo no catálogo:**

```text
{{#instrumento.pecuariaCria}}Considerar-se-á como “frutos” da pecuária, no caso de cria, os bezerros nascidos do rebanho de fêmea de todos os animais decorrentes da presente parceria, sendo que à *PARCEIRA OUTORGANTE* será assegurada a parcela dos frutos descrita no _caput_, a qual lhe será entregue através da cessão de animais dos *PARCEIROS OUTORGADOS* em quantidade proporcional aos frutos.{{/instrumento.pecuariaCria}}
```

### ✅ `166` · Parágrafo — Frutos da pecuária no ciclo completo

**tipo:** `paragrafo` · **versão atual:** 4

**No instrumento assinado** (linha L58):

> Parágrafo Terceiro: Considerar-se-á como “frutos” da pecuária, no caso do ciclo completo, o peso (kg) adquiridos pelos animais nos imóveis objeto desta parceria a cada 12 (doze) meses contados a partir da assinatura deste contrato, utilizando-se como parâmetro as notas fiscais de venda e/ou eventuais controles internos dos PARCEIROS OUTORGADOS. 

**Conteúdo no catálogo:**

```text
{{#instrumento.pecuariaCicloCompleto}}Considerar-se-á como “frutos” da pecuária, no caso do ciclo completo, o peso (kg) adquiridos pelos animais nos imóveis objeto desta parceria a cada 12 (doze) meses contados a partir da assinatura deste contrato, utilizando-se como parâmetro as notas fiscais de venda e/ou eventuais controles internos dos *PARCEIROS OUTORGADOS*.{{/instrumento.pecuariaCicloCompleto}}
```

### ✅ `180` · Parágrafo — Frutos por exercício

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L59):

> Parágrafo Quarto: Os frutos da pecuária poderão ser calculados e distribuídos por exercício fiscal ou por período inferior a este, desde que as partes assim decidam em conjunto. 

**Conteúdo no catálogo:**

```text
Os frutos da pecuária poderão ser calculados e distribuídos por exercício fiscal ou por período inferior a este, desde que as partes assim decidam em conjunto.
```

### ✅ `185` · Parágrafo — Limpeza e beneficiamento dos frutos

**tipo:** `paragrafo` · **versão atual:** 1

**No instrumento assinado** (linha L60):

> Parágrafo Quinto: Os PARCEIROS OUTORGADOS se responsabilizam pela limpeza, beneficiamento e demais operações necessárias a padronização dos frutos a serem pagos à PARCEIRA OUTORGANTE, como também os custos relacionados ao transporte destes produtos até o depósito, armazém, cerealista ou compradora indicada pela PARCEIRA OUTORGANTE. Ademais, não sendo possível o rateio dos frutos, eventual diferença será compensada à PARCEIRA OUTORGANTE em uma das próximas safras, e, se apurada essa diferença na última safra, a diferença será paga em pecúnia pelos PARCEIROS OUTORGADOS à PARCEIRA OUTORGANTE ou compensada em outros frutos, a critério da PARCEIRA OUTORGANTE. 

**Conteúdo no catálogo:**

```text
Os *PARCEIROS OUTORGADOS* se responsabilizam pela limpeza, beneficiamento e demais operações necessárias a padronização dos frutos a serem pagos à *PARCEIRA OUTORGANTE*, como também os custos relacionados ao transporte destes produtos até o depósito, armazém, cerealista ou compradora indicada pela *PARCEIRA OUTORGANTE*. Ademais, não sendo possível o rateio dos frutos, eventual diferença será compensada à *PARCEIRA OUTORGANTE* em uma das próximas safras, e, se apurada essa diferença na última safra, a diferença será paga em pecúnia pelos *PARCEIROS OUTORGADOS* à *PARCEIRA OUTORGANTE* ou compensada em outros frutos, a critério da *PARCEIRA OUTORGANTE*.
```

### ✅ `190` · Parágrafo — Mora na entrega dos frutos

**tipo:** `paragrafo` · **versão atual:** 3

**No instrumento assinado** (linha L61):

> Parágrafo Sexto: Havendo inadimplemento quanto à entrega dos frutos da parceria à PARCEIRA OUTORGANTE, independentemente de qualquer notificação judicial ou extrajudicial, estará os PARCEIROS OUTORGADOS constituídos em mora, incidindo sobre o valor vencido a atualização monetária pelo INPC, além de multa moratória de 10% (dez por cento) e juros moratórios de 1% (um por cento) ao mês, sendo considerados como “valor”, para fins da parceria agrícola e pecuária, os preços apurados pelo IMEA – Instituto Mato-Grossense de Economia e Agropecuária na praça do foro deste contrato.

**Conteúdo no catálogo:**

```text
Havendo inadimplemento quanto à entrega dos frutos da parceria à *PARCEIRA OUTORGANTE*, independentemente de qualquer notificação judicial ou extrajudicial, estarão os *PARCEIROS OUTORGADOS* constituídos em mora, incidindo sobre o valor vencido a atualização monetária pelo INPC, além de multa moratória de 10% (dez por cento) e juros moratórios de 1% (um por cento) ao mês, sendo considerados como “valor”, para fins da parceria agrícola e pecuária, os preços apurados pelo {{ instrumento.institutoPreco }} na praça do foro deste contrato.
```

### ✅ `200` · Cláusula — Disposição dos frutos antes da partilha

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L63):

> CLÁUSULA SEXTA: Os parceiros poderão dispor dos frutos ou produtos havidos antes de efetuada a partilha, podendo cada um deles realizar as respectivas comercializações independente de prévia ou posterior comunicação à outra parte, observado que cada um se responsabilizará por si só em eventuais negócios realizados perante terceiros se os frutos pactuados forem superiores ao resultado da parceria que lhe couber.

**Conteúdo no catálogo:**

```text
Os parceiros poderão dispor dos frutos ou produtos havidos antes de efetuada a partilha, podendo cada um deles realizar as respectivas comercializações independente de prévia ou posterior comunicação à outra parte, observado que cada um se responsabilizará por si só em eventuais negócios realizados perante terceiros se os frutos pactuados forem superiores ao resultado da parceria que lhe couber.
```

### ✅ `210` · Cláusula — Caso fortuito e força maior

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `caso_fortuito`

**No instrumento assinado** (linha L66):

> CLÁUSULA SÉTIMA: Havendo caso fortuito ou força maior que venha a destruir parcialmente a produção, os frutos colhidos ou aqueles pendentes, a perda será suportada pelas partes ora contratantes, consoante dispõe o artigo 96, §1°, inciso I da Lei 4.504/64.

**Conteúdo no catálogo:**

```text
Havendo caso fortuito ou força maior que venha a destruir parcialmente a produção, os frutos colhidos ou aqueles pendentes, a perda será suportada pelas partes ora contratantes, consoante dispõe o artigo 96, §1°, inciso I da Lei 4.504/64.
```

### ✅ `220` · Cláusula — Obrigações da mão de obra rural

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L68):

> CLÁUSULA OITAVA: As responsabilidades decorrentes da contratação de trabalhadores rurais ou diaristas utilizados nas propriedades rurais objeto deste pacto, assim como quaisquer outras obrigações trabalhistas sociais, os passivos tributários, fiscais, ambientais, previdenciários e outros, serão suportados exclusivamente pelos PARCEIROS OUTORGADOS.

**Conteúdo no catálogo:**

```text
As responsabilidades decorrentes da contratação de trabalhadores rurais ou diaristas utilizados nas propriedades rurais objeto deste pacto, assim como quaisquer outras obrigações trabalhistas sociais, os passivos tributários, fiscais, ambientais, previdenciários e outros, serão suportados exclusivamente pelos *PARCEIROS OUTORGADOS*.
```

### ✅ `230` · Capítulo — Do direito de preferência

**tipo:** `capitulo` · **versão atual:** 2

**No instrumento assinado** (linha L70):

> DO DIREITO DE PREFERÊNCIA NOS CASOS DE ALIENAÇÃO E/OU RENOVAÇÃO DA PARCERIA 

**Conteúdo no catálogo:**

```text
Do Direito de Preferência nos Casos de Alienação e/ou Renovação da Parceria
```

### ✅ `240` · Cláusula — Preferência na renovação

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `preferencia`

**No instrumento assinado** (linha L71):

> CLÁUSULA NONA: Nos termos do inciso IV do artigo 95 c/c o inciso VII do artigo 96, ambos da Lei 4.504/64, em igualdade de condições com terceiros, os PARCEIROS OUTORGADOS terão preferência à renovação da parceria rural, devendo a PARCEIRA OUTORGANTE até 06 (seis) meses antes do vencimento do prazo contratual ora estabelecido notificá-los dando-lhes conhecimento das eventuais propostas recebidas, inclusive instruindo a respectiva notificação com cópia autêntica da proposta.

**Conteúdo no catálogo:**

```text
Nos termos do inciso IV do artigo 95 c/c o inciso VII do artigo 96, ambos da Lei 4.504/64, em igualdade de condições com terceiros, os *PARCEIROS OUTORGADOS* terão preferência à renovação da parceria rural, devendo a *PARCEIRA OUTORGANTE* até 06 (seis) meses antes do vencimento do prazo contratual ora estabelecido notificá-los dando-lhes conhecimento das eventuais propostas recebidas, inclusive instruindo a respectiva notificação com cópia autêntica da proposta.
```

### ✅ `250` · Parágrafo — Retomada para exploração direta

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L72):

> Parágrafo Primeiro: Conforme previsto no artigo 95, inciso V, da Lei 4.504/1.964 c/c art. 96, VII, da mesma legislação, os direitos assegurados neste artigo não prevalecerão se, até o prazo de 06 (seis) meses antes do vencimento do contrato, a PARCEIRA OUTORGANTE declarar através de notificação escrita aos PARCEIROS OUTORGADOS que desejam retomar os imóveis para explorá-los diretamente.

**Conteúdo no catálogo:**

```text
Conforme previsto no artigo 95, inciso V, da Lei 4.504/1.964 c/c art. 96, VII, da mesma legislação, os direitos assegurados neste artigo não prevalecerão se, até o prazo de 06 (seis) meses antes do vencimento do contrato, a *PARCEIRA OUTORGANTE* declarar através de notificação escrita aos *PARCEIROS OUTORGADOS* que desejam retomar os imóveis para explorá-los diretamente.
```

### ✅ `260` · Parágrafo — Preferência na venda

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L73):

> Parágrafo Segundo: No caso de pretensão de alienação das áreas ou parte das áreas objeto deste instrumento, a PARCEIRA OUTORGANTE se obriga a dar conhecimento da venda aos PARCEIROS OUTORGADOS a fim de que estes possam, no prazo de 30 (trinta) dias, exercerem o direito de preferência.

**Conteúdo no catálogo:**

```text
No caso de pretensão de alienação das áreas ou parte das áreas objeto deste instrumento, a *PARCEIRA OUTORGANTE* se obriga a dar conhecimento da venda aos *PARCEIROS OUTORGADOS* a fim de que estes possam, no prazo de 30 (trinta) dias, exercerem o direito de preferência.
```

### ✅ `265` · Parágrafo — Alienação não interrompe a vigência

**tipo:** `paragrafo` · **versão atual:** 1

**No instrumento assinado** (linha L74):

> Parágrafo Terceiro:  A alienação ou ainda a imposição de ônus reais sobre os imóveis objetos de exploração da presente parceria não interromperá a vigência deste instrumento.

**Conteúdo no catálogo:**

```text
A alienação ou ainda a imposição de ônus reais sobre os imóveis objetos de exploração da presente parceria não interromperá a vigência deste instrumento.
```

### ✅ `270` · Capítulo — Da função social e da devolução dos bens

**tipo:** `capitulo` · **versão atual:** 2

**No instrumento assinado** (linha L76):

> DA FUNÇÃO SOCIAL E DA DEVOLUÇÃO DOS BENS CEDIDOS EM PARCERIA

**Conteúdo no catálogo:**

```text
Da Função Social e da Devolução dos Bens Cedidos em Parceria
```

### ✅ `280` · Cláusula — Devolução dos bens

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L77):

> CLÁUSULA DÉCIMA: Os bens objeto da presente parceria serão devolvidos conforme entregues aos PARCEIROS OUTORGADOS, sem quaisquer modificações, salvo as deteriorações decorrentes do seu uso normal.

**Conteúdo no catálogo:**

```text
Os bens objeto da presente parceria serão devolvidos conforme entregues aos *PARCEIROS OUTORGADOS*, sem quaisquer modificações, salvo as deteriorações decorrentes do seu uso normal.
```

### ✅ `285` · Parágrafo — Manutenção das benfeitorias existentes

**tipo:** `paragrafo` · **versão atual:** 1

**No instrumento assinado** (linha L78):

> Parágrafo Primeiro: Competirão aos PARCEIROS OUTORGADOS suportar as despesas decorrentes da manutenção das benfeitorias existentes nesta data edificadas sobre os imóveis até a efetiva devolução dos imóveis à PARCEIRA OUTORGANTE.

**Conteúdo no catálogo:**

```text
Competirão aos *PARCEIROS OUTORGADOS* suportar as despesas decorrentes da manutenção das benfeitorias existentes nesta data edificadas sobre os imóveis até a efetiva devolução dos imóveis à *PARCEIRA OUTORGANTE*.
```

### ✅ `290` · Parágrafo — Benfeitorias não indenizáveis

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L79):

> Parágrafo Segundo: Todas as benfeitorias realizadas pelos PARCEIROS OUTORGADOS, sejam elas úteis ou voluptuárias, serão incorporadas aos imóveis, não incidindo sobre elas qualquer tipo de indenização.

**Conteúdo no catálogo:**

```text
Todas as benfeitorias realizadas pelos *PARCEIROS OUTORGADOS*, sejam elas úteis ou voluptuárias, serão incorporadas aos imóveis, *~não~* incidindo sobre elas qualquer tipo de indenização.
```

### ✅ `295` · Parágrafo — Função social da posse

**tipo:** `paragrafo` · **versão atual:** 1

**No instrumento assinado** (linha L80):

> Parágrafo Terceiro: Os PARCEIROS OUTORGADOS se obrigam a cumprir, na posse da terra a sua função social e o bem-estar coletivo de acordo com os direitos e deveres estabelecidos em lei e nos limites estabelecidos no presente instrumento.

**Conteúdo no catálogo:**

```text
Os *PARCEIROS OUTORGADOS* se obrigam a cumprir, na posse da terra a sua função social e o bem-estar coletivo de acordo com os direitos e deveres estabelecidos em lei e nos limites estabelecidos no presente instrumento.
```

### ✅ `300` · Capítulo — Do uso do solo e mão de obra

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L82):

> DO USO DO SOLO E MÃO DE OBRA

**Conteúdo no catálogo:**

```text
Do Uso do Solo e Mão de Obra
```

### ✅ `310` · Cláusula — Manejo e conformidade

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L83):

> CLÁUSULA DÉCIMA PRIMEIRA: Os PARCEIROS OUTORGADOS se comprometem a conduzir e fazer o manejo do solo e conservação dentro das recomendações agronômicas, bem como, explorar as atividades pecuárias dentro das recomendações veterinárias e zootécnicas, atendendo as leis ambientais e proibindo o uso de defensivos não autorizados pelo Ministério da Agricultura. Comprometem-se também a respeitar, fiscalizar e atender as leis, normas e diretrizes estabelecidas no país, para a preservação de reservas florestais, mananciais, animais, meio ambiente, trabalho escravo, utilização/produção de trabalho ilegal, invasões de terra, incêndios por queimada, dentre outros. 

**Conteúdo no catálogo:**

```text
Os *PARCEIROS OUTORGADOS* se comprometem a conduzir e fazer o manejo do solo e conservação dentro das recomendações agronômicas, bem como, explorar as atividades pecuárias dentro das recomendações veterinárias e zootécnicas, atendendo as leis ambientais e proibindo o uso de defensivos não autorizados pelo Ministério da Agricultura. Comprometem-se também a respeitar, fiscalizar e atender as leis, normas e diretrizes estabelecidas no país, para a preservação de reservas florestais, mananciais, animais, meio ambiente, trabalho escravo, utilização/produção de trabalho ilegal, invasões de terra, incêndios por queimada, dentre outros.
```

### ✅ `315` · Parágrafo — Responsabilidade por penalidades

**tipo:** `paragrafo` · **versão atual:** 1

**No instrumento assinado** (linhas L84, L85):

> Parágrafo Ú
>
> nico: Qualquer penalidade ou ação civil, criminal, trabalhista, tributária e/ou qualquer tipo de indenização pleiteada, seja por ente público ou particular, direcionada aos PARCEIROS OUTORGADOS, por motivo exclusivo de erro, falta, desobediência, negligência ou imprudência deste, serão de sua inteira responsabilidade; devendo aqueles ressarcirem à PARCEIRA OUTORGANTE os eventuais prejuízos que ela for obrigada a suportar por força de atos culposos ou dolosos realizados pelos PARCEIROS OUTORGADOS. 

**Conteúdo no catálogo:**

```text
Qualquer penalidade ou ação civil, criminal, trabalhista, tributária e/ou qualquer tipo de indenização pleiteada, seja por ente público ou particular, direcionada aos *PARCEIROS OUTORGADOS*, por motivo exclusivo de erro, falta, desobediência, negligência ou imprudência deste, serão de sua inteira responsabilidade; devendo aqueles ressarcirem à *PARCEIRA OUTORGANTE* os eventuais prejuízos que ela for obrigada a suportar por força de atos culposos ou dolosos realizados pelos *PARCEIROS OUTORGADOS*.
```

### ✅ `320` · Capítulo — Da extinção do contrato

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L87):

> DA EXTINÇÃO DO CONTRATO

**Conteúdo no catálogo:**

```text
Da Extinção do Contrato
```

### ✅ `330` · Cláusula — Rescisão por inadimplemento

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L88):

> 	CLÁUSULA DÉCIMA SEGUNDA: Havendo inadimplemento de quaisquer cláusulas deste contrato, gerará à parte contrária a faculdade de rescindi-lo mediante simples notificação à outra parte, assegurando, em todos os casos, que o produto ainda não colhido seja cultivado até o fim da respectiva safra, quando então os bens imóveis objetos da parceria deverão ser devolvidos à PARCEIRA OUTORGANTE e os frutos da respectiva safra serão partilhados.

**Conteúdo no catálogo:**

```text
Havendo inadimplemento de quaisquer cláusulas deste contrato, gerará à parte contrária a faculdade de rescindi-lo mediante simples notificação à outra parte, assegurando, em todos os casos, que o produto ainda não colhido seja cultivado até o fim da respectiva safra, quando então os bens imóveis objetos da parceria deverão ser devolvidos à *PARCEIRA OUTORGANTE* e os frutos da respectiva safra serão partilhados.
```

### ✅ `340` · Cláusula — Rescisão por mútuo acordo

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L91):

> CLÁUSULA DÉCIMA TERCEIRA: O presente instrumento poderá ser rescindido, a qualquer tempo, por mútuo acordo entre as partes, desde que respeitado o término da safra em curso. 

**Conteúdo no catálogo:**

```text
O presente instrumento poderá ser rescindido, a qualquer tempo, por mútuo acordo entre as partes, desde que respeitado o término da safra em curso.
```

### ✅ `350` · Capítulo — Da anuência

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L93):

> DA ANUÊNCIA

**Conteúdo no catálogo:**

```text
Da Anuência
```

### ✅ `360` · Cláusula — Anuência ao penhor

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `anuencia`

**No instrumento assinado** (linha L94):

> CLÁUSULA DÉCIMA QUARTA: A PARCEIRA OUTORGANTE neste ato autoriza expressamente os PARCEIROS OUTORGADOS a oferecerem em garantia de financiamentos a eles concedidos por instituições bancarias e financeiras, durante todo o lapso temporal da vigência deste instrumento contratual, bem como pela safra imediatamente seguinte, a totalidade da produção a ser auferida por conta de eventuais empreendimentos financiados nos imóveis objeto de parceria, bem como os materiais agrários, benfeitorias e semoventes de sua propriedade ali localizados.

**Conteúdo no catálogo:**

```text
{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* neste ato autoriza expressamente os *PARCEIROS OUTORGADOS* a oferecerem em garantia de financiamentos a eles concedidos por instituições bancárias e financeiras, durante todo o lapso temporal da vigência deste instrumento contratual, bem como pela safra imediatamente seguinte, a totalidade da produção a ser auferida por conta de eventuais empreendimentos financiados nos imóveis objeto de parceria, bem como os materiais agrários, benfeitorias e semoventes de sua propriedade ali localizados.{{/instrumento.penhor}}
```

### ✅ `370` · Parágrafo — Penhor por período de vigência

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L95):

> Parágrafo Primeiro: A PARCEIRA OUTORGANTE declara ainda ciência que o penhor dos produtos dados em garantia em cada safra, valerá por todo o período de vigência desta parceria, de conformidade com o artigo 1.439 do Código Civil (Lei 10.406/2.002).

**Conteúdo no catálogo:**

```text
{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* declara ainda ciência que o penhor dos produtos dados em garantia em cada safra, valerá por todo o período de vigência desta parceria, de conformidade com o artigo 1.439 do Código Civil (Lei 10.406/2.002).{{/instrumento.penhor}}
```

### ✅ `380` · Parágrafo — Destinação prioritária dos frutos

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L96):

> Parágrafo Segundo: A PARCEIRA OUTORGANTE autoriza ainda os PARCEIROS OUTORGADOS a destinar, prioritariamente, sob renúncia plena de todos os direitos, os frutos oriundos da exploração desta parceria, para liquidação dos débitos contraídos pelos PARCEIROS OUTORGADOS e que tenham relação direta com os imóveis, as culturas e/ou os animais explorados nas áreas cedidas em parceria.

**Conteúdo no catálogo:**

```text
{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* autoriza ainda os *PARCEIROS OUTORGADOS* a destinar, prioritariamente, sob renúncia plena de todos os direitos, os frutos oriundos da exploração desta parceria, para liquidação dos débitos contraídos pelos *PARCEIROS OUTORGADOS* e que tenham relação direta com os imóveis, as culturas e/ou os animais explorados nas áreas cedidas em parceria.{{/instrumento.penhor}}
```

### ✅ `390` · Parágrafo — Fiscalização pelas instituições

**tipo:** `paragrafo` · **versão atual:** 2

**No instrumento assinado** (linha L97):

> Parágrafo Terceiro: A PARCEIRA OUTORGANTE declara ciente do direito que assiste as instituições privadas, incluindo bancárias, comerciais, industriais e financeiras, de fiscalizar os imóveis ora cedidos em parceria em decorrência de financiamentos concedidos aos PARCEIROS OUTORGADOS para exploração e/ou edificação de benfeitorias realizadas nestes bens, e, por conseguinte, os bens vinculados localizados nas propriedades; concordando que ditos bens ali permaneçam até o final da liquidação das dívidas pertinentes, mantendo-se essa condição mesmo no caso de alienação do imóvel.

**Conteúdo no catálogo:**

```text
{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* declara ciente do direito que assiste as instituições privadas, incluindo bancárias, comerciais, industriais e financeiras, de fiscalizar os imóveis ora cedidos em parceria em decorrência de financiamentos concedidos aos *PARCEIROS OUTORGADOS* para exploração e/ou edificação de benfeitorias realizadas nestes bens, e, por conseguinte, os bens vinculados localizados nas propriedades; concordando que ditos bens ali permaneçam até o final da liquidação das dívidas pertinentes, mantendo-se essa condição mesmo no caso de alienação do imóvel.{{/instrumento.penhor}}
```

### ✅ `400` · Capítulo — Disposições gerais (parceria)

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L99):

> DISPOSIÇÕES GERAIS

**Conteúdo no catálogo:**

```text
Disposições Gerais
```

### ✅ `410` · Cláusula — Irrevogabilidade

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L100):

> CLÁUSULA DÉCIMA QUINTA: Este instrumento constitui acordo irrevogável e irretratável entre as partes, obrigando seus respectivos sucessores, em todos os seus termos, sendo que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e assinada por cada um dos parceiros.

**Conteúdo no catálogo:**

```text
Este instrumento constitui acordo irrevogável e irretratável entre as partes, obrigando seus respectivos sucessores, em todos os seus termos, sendo que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e assinada por cada um dos parceiros.
```

### ✅ `420` · Cláusula — Vedação de cessão

**tipo:** `clausula` · **versão atual:** 3

**No instrumento assinado** (linha L102):

> CLÁUSULA DÉCIMA SEXTA: Resta, desde já, vedada aos PARCEIROS OUTORGADOS a cessão do presente contrato e modificação da destinação, salvo mediante prévio e expresso consentimento da outra parte. 

**Conteúdo no catálogo:**

```text
Resta, desde já, vedada aos *PARCEIROS OUTORGADOS* a cessão do presente contrato e modificação da destinação, salvo mediante prévio e expresso consentimento da outra parte.
```

### ✅ `430` · Cláusula — Ônus alheios à exploração

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L104):

> CLÁUSULA DÉCIMA SÉTIMA: Os PARCEIROS OUTORGADOS se eximem, desde já, de quaisquer ônus que venham a recair sobre os imóveis e bens objetos do presente contrato de parceria e ora cedidos pela PARCEIRA OUTORGANTE, por força de dívidas assumidas exclusivamente por ela e/ou que não decorram da exploração das atividades rurais objeto da presente parceria, salvo as obrigações contraídas pelos próprios PARCEIROS OUTORGADOS, aquelas diretas ou indiretamente assumidas por força deste instrumento ou em decorrência dele.

**Conteúdo no catálogo:**

```text
Os *PARCEIROS OUTORGADOS* se eximem, desde já, de quaisquer ônus que venham a recair sobre os imóveis e bens objetos do presente contrato de parceria e ora cedidos pela *PARCEIRA OUTORGANTE*, por força de dívidas assumidas exclusivamente por ela e/ou que não decorram da exploração das atividades rurais objeto da presente parceria, salvo as obrigações contraídas pelos próprios *PARCEIROS OUTORGADOS*, aquelas diretas ou indiretamente assumidas por força deste instrumento ou em decorrência dele.
```

### ✅ `440` · Cláusula — Regência pelo Estatuto da Terra

**tipo:** `clausula` · **versão atual:** 2

**No instrumento assinado** (linha L106):

> CLÁUSULA DÉCIMA OITAVA: A relação estabelecida pelo presente contrato em hipótese alguma se regerá pelas normas insculpidas na Consolidação das Leis do Trabalho, mas sim pelas constantes no Estatuto da Terra (Lei n.º 4.504/1.964) e no Decreto 59.566/1.966, uma vez que os PARCEIROS OUTORGADOS não se acham sob o vínculo de subordinação em relação à PARCEIRA OUTORGANTE, podendo estipular seus próprios horários de trabalho, assim como dos seus empregados e prepostos.

**Conteúdo no catálogo:**

```text
A relação estabelecida pelo presente contrato em hipótese alguma se regerá pelas normas insculpidas na Consolidação das Leis do Trabalho, mas sim pelas constantes no Estatuto da Terra (Lei n.º 4.504/1.964) e no Decreto 59.566/1.966, uma vez que os *PARCEIROS OUTORGADOS* não se acham sob o vínculo de subordinação em relação à *PARCEIRA OUTORGANTE*, podendo estipular seus próprios horários de trabalho, assim como dos seus empregados e prepostos.
```

### ✅ `450` · Cláusula — Abertura de inscrição estadual

**tipo:** `clausula` · **versão atual:** 1

**No instrumento assinado** (linha L108):

> CLÁUSULA DÉCIMA NONA: A relação estabelecida pelo presente contrato autoriza a abertura das respectivas inscrições estaduais pelas partes. 

**Conteúdo no catálogo:**

```text
A relação estabelecida pelo presente contrato autoriza a abertura das respectivas inscrições estaduais pelas partes.
```

### ✅ `460` · Capítulo — Do foro

**tipo:** `capitulo` · **versão atual:** 1

**No instrumento assinado** (linha L110):

> DO FORO

**Conteúdo no catálogo:**

```text
Do Foro
```

### ✅ `470` · Cláusula — Foro de eleição

**tipo:** `clausula` · **versão atual:** 2 · **âncora:** `foro`

**No instrumento assinado** (linha L111):

> CLÁUSULA VIGÉSIMA: Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de Lucas do Rio Verde, Estado de Mato Grosso, renunciando expressamente a qualquer outro, por mais privilegiado que seja.

**Conteúdo no catálogo:**

```text
Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de {{ instrumento.foroComarca }}, Estado {{ instrumento.foroUfComPreposicao }}, renunciando expressamente a qualquer outro, por mais privilegiado que seja.
```

### ✅ `480` · Fecho e assinaturas (parceria)

**tipo:** `livre` · **versão atual:** 3

**No instrumento assinado** (linhas L113, L118, L150, L151, L152, L153, L154, L155, L156, L157, L158, L159, L160, L161, L162, L163, L164, L165, L166, L167, L168, L169, L170, L171, L172, L173, L174, L175, L176, L177, L178):

> Por estarem, assim justos e contratados, firmam o presente instrumento, em 04 (quatro) vias de igual teor e forma, juntamente com 02 (duas) testemunhas.
>
> Lucas do Rio Verde/MT, 10 de outubro de 2.022.
>
> MMS AGRO LTDA
>
> Parceira Outorgante representada por seu 
>
> Administrador Jose Eduardo de Macedo
>
> Soares Junior
>
> *(parágrafo vazio no .docx assinado)*
>
> *(parágrafo vazio no .docx assinado)*
>
> MMS AGRO LTDA
>
> Parceira Outorgante representada por sua 
>
> Administradora Maria Auxiliadora Malheiros
>
> ⚠️ linha 159 não existe no arquivo extraído
> JOSE EDUARDO DE MACEDO SOARES JUNIOR
>
> Parceiro Outorgado
>
> *(parágrafo vazio no .docx assinado)*
>
> *(parágrafo vazio no .docx assinado)*
>
> MARIA AUXILIADORA MALHEIROS 
>
> Parceira Outorgada
>
> *(parágrafo vazio no .docx assinado)*
>
> ⚠️ linha 167 não existe no arquivo extraído
> Testemunhas:
>
> *(parágrafo vazio no .docx assinado)*
>
> ⚠️ linha 170 não existe no arquivo extraído
> _________________________________
>
> Nome:
>
> RG:		
>
> CPF/MF:		
>
> _________________________________
>
> Nome:
>
> RG:		
>
> CPF/MF:

**Conteúdo no catálogo:**

```text
Por estarem, assim justos e contratados, firmam o presente instrumento, em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, juntamente com 02 (duas) testemunhas.

{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinaturaExtenso }}.

{{#signatarios sep="\n\n" fim="\n\n"}}_________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}

*Testemunhas:*

_________________________________
*Nome:*
*RG:*
*CPF/MF:*

_________________________________
*Nome:*
*RG:*
*CPF/MF:*
```

---

## Variantes de família incluídas por estes blocos

Desde a migration `20260902213602` a descrição do imóvel **não é bloco do documento**: é variante de família, inserida por dentro do hospedeiro com `{{familia nome="…"}}` e resolvida a cada passagem do laço que itera os imóveis.

Ela continua sendo bloco de verdade — tem versão, histórico e entra no snapshot — e por isso o texto vive num lugar só, mesmo servindo a três hospedeiros. O `;` entre as alíneas e o `.` na última **não estão neste texto**: são a juntura da seção e o fecho da frase, que ficam no hospedeiro.

### 🧩 `Alínea — Imóvel cedido`

**família:** `Alínea de imóvel cedido` · **tipo:** `livre` · **versão atual:** 3

**Conteúdo no catálogo:**

```text
*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, *de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}{{#imovel.folha}}, folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}{{#imovel.cartorio}} do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}}
```

