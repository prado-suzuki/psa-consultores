# 12 — Relatório de divergências: Composse Rural

Leitura completa e direta (sem sub-agente) de todos os arquivos em
`docs/osg/contratos_exploracao/Documentos Agrários/` relativos à Composse:

- `Contrato Modelo_Composse Rural.pdf` (7 páginas)
- `VF_Contrato Modelo_Composse Rural.docx`
- `VF_Contrato Modelo_Composse Rural - Copia.docx`
- `VF_Modelo Anexo Único_Composse.docx`

Cruzado cláusula a cláusula contra `src/previews/contratoRuralBlocos.ts` (`BLOCOS_COMPOSSE`).

**Achado prévio:** `VF_Contrato Modelo_Composse Rural - Copia.docx` e
`VF_Contrato Modelo_Composse Rural.docx` têm texto **idêntico** (diff vazio, linha a
linha) — a diferença de 2.700 bytes no tamanho do arquivo é só metadado/formatação
interna do `.docx`, sem efeito no conteúdo. O PDF também é idêntico ao texto do
`.docx` — nenhuma divergência entre os três arquivos-fonte da Composse (diferente da
Parceria, que tem duas versões de fato diferentes).

## 1. O achado mais importante: falta autorizar pecuária na Composse

A Cláusula Primeira real diz:

> "...com o objetivo de explorarem, sob o regime disposto neste instrumento,
> incluindo, mas não se limitando, ao cultivo de soja, milho, sorgo, milheto, feijão,
> café, trigo, grão-de-bico, braquiária e crotalária, ou outra cultura legalmente
> permitida que pretenderem explorar, **bem como, cria, recria e engorda de bovinos,
> suínos, ovinos e aves; ou outros animais de qualquer espécie, da maneira que lhe
> convier**, nas áreas rurais descritos no anexo único deste instrumento."

O nosso `com-c1` tem:

> "...com o objetivo de explorarem, sob o regime disposto neste instrumento,
> incluindo, mas não se limitando, ao de `{{ culturas }}`, ou outra cultura legalmente
> permitida que pretenderem explorar, nas áreas rurais descritas no anexo único deste
> instrumento."

**A cláusula inteira que autoriza pecuária (cria/recria/engorda) desapareceu.** Ao
contrário da Parceria — que tem uma Cláusula Terceira própria só para atividades
pecuárias — a Composse mistura cultivo e pecuária na MESMA Cláusula Primeira, e
nossa transcrição só herdou a parte de cultivo. Hoje, um contrato de Composse gerado
pelo mockup nunca autoriza pecuária, mesmo que o cliente tenha gado nas áreas da
composse. Isso é maior que um gap de redação — é um gap funcional: não existe hoje
nenhum campo equivalente ao `incluiPecuaria` da Parceria para a Composse.

## 2. Outros parágrafos inteiros ausentes

| # | Cláusula real | Texto que falta | Onde deveria entrar |
|---|---|---|---|
| 1 | Segunda, §2º | Alínea "d)": *"Em todos os demais casos em que ocorrer a resolução da composse face a um ou mais compossuidor(es), ainda que não esteja expressamente previsto neste instrumento, os valores devidos a este(s) compossuidor(es) será determinado através da metodologia descrita nas alíneas anteriores, incluindo forma de avaliação, prazo e forma de pagamento."* | Depois da alínea "c)" em `com-c2-p2` |
| 2 | Sétima | Parágrafo Único inteiro: *"Além dos custos elencados no caput, todos os demais oriundos da manutenção das benfeitorias e bens próprios e/ou cedidos sob o regime de parceria ou outra forma de cessão, apurados em decorrência da exploração das atividades objeto deste contrato realizada pelos COMPOSSUIDORES, bem como os custos operacionais, despesas administrativas, financeiras e comerciais, máquinas e equipamentos adquiridos e benfeitorias edificadas farão parte da composição do resultado [...] da presente COMPOSSE RURAL, desde que devidamente contabilizada na forma como dispõe o parágrafo primeiro da Cláusula Sexta."* | Depois de `com-c7` |
| 3 | Nona, §2º | Parágrafo inteiro: *"O custo dos financiamentos a serem obtidos de terceiros (despesas financeiras) [...] será parte integrante na apuração do resultado de cada safra, assim como todas as receitas auferidas, tais como: venda de produtos, incentivos fiscais, incentivos governamentais (prêmios e outros), descontos financeiros [...], devoluções de compras, resultado positivo de variação monetária e ou cambial e prestações de serviços."* | Depois de `com-c9-p1` |

## 3. Cláusula Décima Primeira (administração) — a mais encolhida de todas

Real, no caput, antes de listar os poderes:

> "...perante qualquer repartição pública e/ou empresa privada, inclusive, mas não se
> limitando apenas a estes, **face a Caixa Econômica Federal, Banco do Brasil S/A,
> instituições financeiras de qualquer natureza, Previdência Social, Receita Federal
> do Brasil, Procuradoria da Fazenda Nacional, MAPA - Ministério da Agricultura,
> Pecuária e Abastecimento, Secretarias de Meio Ambiente Estaduais ou Municipais,
> IBAMA, INCRA, Secretarias de Fazenda Estaduais, sindicatos rurais, CONAB, dentre
> outras**..."

Nosso `com-c11`: "...perante qualquer repartição pública e/ou empresa privada,
podendo:" — a lista inteira de órgãos nomeados some.

Depois, o real lista **9 alíneas** (a–i) de poderes; a nossa transcrição condensa em
uma frase corrida e **remove 3 das 9 por completo**:

- **e) Firmar correspondência, guias para recolhimento de impostos e contribuições,
  requerimentos e petições dirigidas a Repartições e Autarquias Públicas Federais,
  Estaduais e Municipais...** — ausente.
- **g) Receber citação ou intimação referente a processos, procedimentos e
  autuações, administrativos ou judiciais** — ausente. Este é o mais relevante dos
  três: é o poder de representar a composse recebendo citação judicial.
- **h) Fornecer fianças, avais e outras garantias, inclusive entre si, exceto para
  terceiros** — ausente.

As alíneas a, b, c, d, f, i sobrevivem, mas também encolhidas (ex.: alínea b real
lista "fertilizantes, defensivos, sementes, mudas, insumos, peças, implementos,
equipamentos, máquinas, suplementos"; a nossa só diz "bens móveis" genericamente).

## 4. Parafraseamento com perda de detalhe (paragrafo sobrevive, mas encolhe)

| Cláusula | O que se perde |
|---|---|
| Segunda, §2º, alínea a) | "de acordo com as normas técnicas contábeis vigentes à época" e a lista de quem pode requerer a liquidação (herdeiros, cônjuge meeiro, companheiro(a)) somem — vira só "caso haja a dissolução da composse" |
| Segunda, §2º, alínea b) | "Índice Nacional de Preços ao Consumidor, ou outro índice que vier a substituí-lo" vira só "INPC"; o parênteses "(pedido de retirada, exclusão, ciência da sociedade quanto a qualidade de herdeiro...)" some |
| Sexta, §2º | "observada a proporção descrita no caput da Cláusula Segunda **e o disposto na Cláusula Sétima**" — a remissão à Cláusula Sétima some |
| Nona, §1º | "observados os limites descritos na Cláusula Décima Primeira" e "desde que o financiamento se destine à exploração econômica da composse" somem |

## 5. Achados sem gap de conteúdo, mas com divergência de rótulo

6. **Testemunha "CPF:" vs "CPF/MF:"**: o `.docx` oficial da Composse usa
   literalmente `CPF/MF:` no bloco de assinatura das testemunhas — o nosso
   `FECHO_TESTEMUNHAS` (compartilhado com a Parceria) usa `CPF:`. Como a versão sem
   Ciclo Completo da Parceria também usa `CPF/MF:` (ver relatório da Parceria,
   achado 3), a evidência pesa pra `CPF/MF:` ser o padrão real da banca.
7. Anexo Único: mesma situação da Parceria — o `.docx` "Modelo Anexo Único_Composse"
   não tem tabela Word real, só a frase de abertura. Nossa tabela de 7 colunas vem
   do exemplo real (`exemplo-05-anexo-imoveis-bela-vista.md`), correto quanto à
   fonte; só o rótulo "Área total" (nosso) vs "Área total do imóvel" (exemplo real)
   é cosmético.

## 6. Conferido e sem divergência

- PDF, `.docx` principal e `.docx` "Cópia": os três têm texto idêntico entre si.
- Cláusulas 3ª, 4ª (+ parágrafo único, já corrigido com "antes do vencimento"), 5ª,
  6ª (caput), 8ª, 10ª, 12ª, 13ª, 14ª–17ª (penhor), 18ª–20ª: conteúdo confere.
- Preâmbulo (Considerandos I–V) e intervalo de alíneas: já corrigido na sessão
  anterior (`imoveisAlineasRange`), confirmado de novo contra este arquivo.
