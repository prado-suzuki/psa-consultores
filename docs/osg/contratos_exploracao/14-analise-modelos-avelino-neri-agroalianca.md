# 14 — Análise dos modelos recentes (pasta `Downloads\SOPs\modelos`)

Leitura completa e direta (sem sub-agente) dos 8 arquivos em
`C:\Users\Alexandre Silva\Downloads\SOPs\modelos`, cruzados contra o nosso
mapeamento (`docs/osg/campos-exploracao-rural.md`,
`docs/osg/levantamento-contratos-rurais.md`) e o mockup
(`src/previews/contratosExploracaoModel.ts`, `contratoRuralBlocos.ts`,
`contratoRuralContexto.ts`).

## O que tem na pasta

| Arquivo | O que é |
|---|---|
| `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis.docx` | Modelo em branco — **idêntico**, byte a byte, ao já analisado no relatório 11 |
| `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis (1).docx` | Duplicata exata do anterior (mesmo download salvo 2x) |
| `VF_Modelo Anexo Único_Composse.docx` | Modelo em branco — mesmo já analisado no relatório 12 (só a frase de abertura, sem tabela Word) |
| `VF_Modelo Anexo Único_Parceria.docx` | Modelo em branco — mesmo já analisado no relatório 11. Achado de higiene do próprio arquivo da banca, não nosso: tem um nome de cliente real vazado no texto ("Reunidas Agropecuária Ltda.", família Sandri) em vez do placeholder genérico — não afeta nosso mockup, só registro |
| `Contrato Composse Rural_Avelino Neri Bocolli e Outros.pdf` | **Novo.** Composse real, assinada digitalmente em 20/03/2026, Sorriso-MT |
| `Anexo Único_Composse Rural_ Avelino Neri e Outros.pdf` | **Novo.** Anexo da composse acima — 11 imóveis (alíneas a-k) |
| `Instrumento Particular de Parceria Para Fins de Exploração Agropecuária_AgroAliança.pdf` | **Novo.** Parceria real, assinada digitalmente em 20/03/2026, Santa Carmem-MT — é a ORIGEM dos itens a-f da composse acima (mesmo grupo de pessoas, outorgante comum) |
| `Anexo Único do Instrumento Particular de Parceria Para Fins de Exploração_Agro Aliança.pdf` | **Novo.** Anexo da parceria acima — 6 imóveis (alíneas a-f), com memorial de georreferenciamento completo |

Os 4 primeiros não trazem achado novo — já estavam cobertos pelos relatórios
11/12. Os 4 últimos são o motivo deste relatório: dois instrumentos reais
**novos**, assinados na mesma data, do mesmo grupo de clientes (Avelino Neri
Bocolli e família — via Agro Aliança Ltda.), que dá pra cruzar um contra o
outro porque um é literalmente a origem do outro.

## Achado A (o mais importante): o fecho de assinatura não replica uma linha por signatário

Isso apareceu nos dois modelos em branco e é confirmado, palavra por palavra,
nos dois contratos reais novos:

**Quando o outorgante é PJ com mais de um administrador, cada administrador
assina em linha própria** — não uma linha só para a empresa:

> `Instrumento ... AgroAliança.pdf`, fecho:
> "AGRO ALIANÇA LTDA. / Parceira Outorgante representada por Avelino Neri
> Bocolli" — **e, numa segunda linha separada** — "AGRO ALIANÇA LTDA. /
> Parceira Outorgante representada por Cristina Kielba Bocolli Bordignon"

O próprio modelo em branco já antecipa isso (`VF_Contrato Modelo Parceria...`,
fecho): duas colunas lado a lado, ambas rotuladas "Parceira Outorgante
representada por ___".

**Cada explorador/outorgado/compossuidor assina com um rótulo individual e
concordado em gênero** — não um rótulo plural só no fim:

> Mesmo contrato, fecho: "AVELINO NERI BOCOLLI / **Parceiro Outorgado**" —
> "REGINA KIELBA BOCOLLI VILÁ / **Parceira Outorgada**" — "CRISTINA KIELBA
> BOCOLLI BORDIGNON / **Parceira Outorgada**" (um homem, duas mulheres — o
> rótulo troca de gênero pessoa a pessoa).
>
> Igual na Composse (`Contrato Composse Rural...pdf`): "AVELINO NERI BOCOLLI
> / Compossuidor" — "REGINA KIELBA BOCOLLI VILA / Compossuidora" — "CRISTINA
> KIELBA BOCOLLI BORDIGNON / Compossuidora".

**O que temos hoje**: `contratoRuralBlocos.ts` (`par-fecho`) imprime
`{{#outorgante.sePJ}}{{ outorgante.razaoSocial }}{{/outorgante.sePJ}}... —
Parceira Outorgante` (uma linha só, nunca uma por administrador) e
`{{#exploradores}}{{ explorador.nome }}\n{{/exploradores}}— Parceiros
Outorgados` (os nomes empilhados, com UM rótulo plural fixo no final, sem
gênero). O mesmo vale para o fecho da Composse.

**Classificação**: gap de modelo/template, não de cadastro. Os dados já
existem — `pessoa.genero` (usado pelo `PARES`/`concordanciaCampo` do Contrato
Social) e `recursos.administradoresOutorgante` (já buscado, só não reusado no
fecho). Falta o `par-fecho`/`com-fecho` iterarem pessoa a pessoa com rótulo
concordado, em vez de nome empilhado + rótulo plural fixo.

## Achado B: duas atividades reais que não cabem em `culturas` nem em `incluiPecuaria`

Os dois contratos novos — Parceria E Composse, mesmo grupo de clientes —
autorizam duas atividades que nosso modelo não cobre:

**Exploração florestal** (extração de madeira em floresta nativa):

> `AgroAliança.pdf`, Cláusula Terceira, Parágrafo Primeiro: "Para a exploração
> florestal, poderão realizar a Extração de madeira em florestas nativas
> (incluindo troncos, moirões, estacas e lenha), bem como o cultivo de
> eucalipto ou outras culturas madeireiras legalmente permitidas, observada a
> legislação ambiental vigente e as licenças necessárias."
>
> E ganha um parágrafo PRÓPRIO de "frutos" na Cláusula Quinta (Parágrafo
> Quarto): "Produtos Florestais Madeireiros (PFM) e Não Madeireiros (PFNM)".
>
> Na Composse (`Contrato Composse Rural...pdf`, Cláusula Primeira): "além da
> exploração florestal, podendo fazer extração em florestas nativas".

**Piscicultura** (criação de peixes):

> `AgroAliança.pdf`, Cláusula Terceira, Parágrafo Segundo: "...bem como para a
> piscicultura ou criação de outros animais..."
>
> Composse, Cláusula Primeira: "...criação de peixes (psicultura); ou outros
> animais de qualquer espécie..."

**Por que isso não é só trocar uma palavra em `culturas`**: floresta ganha um
parágrafo de "frutos" próprio (PFM/PFNM), separado do de pecuária — é
estruturalmente parecido com `incluiPecuaria`, não com o campo de texto livre
`culturas`. Piscicultura, pelos dois exemplos, parece ter entrado dentro do
mesmo parágrafo da pecuária ("cria, recria e engorda... bem como para a
piscicultura"), sem cláusula de frutos própria.

**Recomendação**: decisão de produto, não uma correção óbvia — dá pra tratar
como uma flag nova (`incluiExploracaoFlorestal`, com o parágrafo de PFM/PFNM
que a acompanha) e dobrar `incluiPecuaria` para também cobrir piscicultura no
mesmo texto, ou criar uma terceira flag. Vale perguntar à OSG antes de
escolher.

## Achado C: vigência pode começar numa data diferente da assinatura

> `AgroAliança.pdf`: assinado em **20 de março de 2.026**, mas "CLÁUSULA
> SEGUNDA: A presente parceria... terá vigência **a partir de 16 de setembro
> de 2.026** e findará em 16 de setembro de 2.029."

O modelo oficial em branco diz "vigência **a contar da data da assinatura**
deste instrumento" — este contrato real se desvia do texto padrão e usa uma
data de início diferente (quase 6 meses depois da assinatura). Hoje
`montarContextoParceria` usa `draft.dataAssinatura` como a própria data de
início da vigência — não existe campo pra um início diferente.

**Classificação**: achado real, mas isolado (só apareceu neste contrato,
entre todos os que já lemos). Fica registrado como pendência de confirmação
— não sei se é prática recorrente ou uma exceção pontual deste caso — antes
de criar um campo novo (`vigenciaInicio`, separado de `dataAssinatura`).

## Achado D: o Anexo Único real de 2026 é em prosa por alínea, não tabela

Este é o achado de maior alcance, porque muda a forma de um bloco que já
implementamos.

Nosso `com-anexo`/`par-anexo` (`contratoRuralBlocos.ts`) renderiza uma
**tabela de 7 colunas** (Item | Área cedida | Área total do imóvel | Nome do
imóvel | Matrícula | Município/UF | Proprietário) — baseada no
`exemplo-05-anexo-imoveis-bela-vista.md`, de um contrato de **2024**.

Os dois Anexos novos, de **2026**, são **prosa por alínea**, no mesmo estilo
do Considerando V — sem tabela nenhuma:

> `Anexo Único...AgroAliança.pdf`, item (a): "339,0000 ha (trezentos e trinta
> e nove hectares) de um imóvel rural com área de 507,2349ha [...],
> denominado Fazenda Aliança 01, de propriedade de AGRO ALIANÇA LTDA, situado
> no município de Santa Carmem [...], com registro na matrícula de n°
> 64.514 [...], inscrito no cadastro de imóvel rural sob o n°
> 950.017.909.793-7, com os seguintes limites e confrontações: [memorial
> completo de vértices, azimutes e distâncias, georreferenciado ao SIRGAS
> 2000]."

Isso bate com a instrução do próprio modelo em branco ("[qualificação padrão
dos imóveis rurais [...] com os seus limites e confrontações dispostos no
ANEXO ÚNICO]") — o modelo sempre pediu prosa; a tabela que implementamos veio
de um exemplo real que, aparentemente, não é (ou deixou de ser) o padrão.

**Achado dentro do achado**: a mesma Fazenda Aliança 01 aparece nos DOIS
Anexos (é um dos imóveis que passou da Parceria para a Composse) — no Anexo
da **Parceria** (o instrumento de origem), ela leva o memorial de
georreferenciamento completo; no Anexo da **Composse** (o instrumento
derivado), a mesma descrição **termina sem "limites e confrontações"
nenhum** — só identifica a matrícula. Ou seja: o documento de origem carrega
a descrição definitiva; o documento derivado só precisa localizar o imóvel,
não repetir o memorial. Isso é consistente e faz sentido jurídico, mas hoje
nosso modelo não distingue os dois casos.

**Recomendação**: antes de decidir se a tabela continua ou se vira prosa por
alínea, vale confirmar com a OSG se a mudança de 2024→2026 é uma atualização
deliberada de padrão da banca ou coincidência de quem redigiu — o achado é
sólido (dois exemplos de 2026, de clientes diferentes dos de 2024, e o
próprio modelo em branco sempre pediu prosa), mas a decisão de qual formato
seguir é de produto, não something a corrigir sozinho.

## Achado E (observação, não é gap): capital social da origem externa nem sempre aparece

O Considerando V da Composse, ao citar a AGRO ALIANÇA LTDA como origem dos
itens a-f, traz razão social, CNPJ, NIRE, sede e administradores — **mas não
capital social**, mesmo sendo exatamente o caso que a exigência de "NIRE e
capital social na data da assinatura" deveria cobrir. Nosso campo
`outorganteCapitalSocialNaAssinatura` já é opcional (vazio não trava nada),
então isso não é gap funcional — só registro de que, na prática, esse dado
pode sair em branco mesmo num contrato redigido pela própria banca.

## Achado F: origem por imóvel pode ter só UM compossuidor específico como contraparte, não o grupo todo

No Considerando V da Composse, os itens (a-f) — que vêm da Parceria com a
Agro Aliança — citam "como Parceiros Outorgados os **COMPOSSUIDORES
RURAIS**" (o grupo todo). Mas os itens (g) a (k) — que vêm de 4 contratos de
arrendamento distintos, com 4 arrendadores pessoas físicas diferentes — citam
como arrendatária **uma compossuidora específica, nomeada** ("...e como
Arrendatária a **COMPOSSUIDORA CRISTINA KIELBA BOCOLLI BORDIGNON**"), não o
grupo.

Hoje `com-preambulo-v` sempre escreve a contraparte da origem como "os
COMPOSSUIDORES RURAIS" (texto fixo) — não existe campo para dizer que a
origem de um imóvel específico envolveu só uma pessoa do grupo. É um gap
real, mas de baixo volume (só aparece quando a composse tem origens mistas
como esta) — registro para quando o produto decidir cobrir esse caso.

## Achados sem divergência (confirmam o que já está certo)

- **Regra de administração "isoladamente + conjunto por maioria"**: a
  Composse nova bate palavra por palavra com `[BV-COM]` — "administrada
  isoladamente por seus COMPOSSUIDORES... só poderão ser realizados em
  conjunto por COMPOSSUIDORES que representem a maioria dos percentuais...
  incapacidade civil superveniente... administração passará a ser
  desempenhada isoladamente pelo administrador remanescente" — confirma de
  novo a correção aplicada nesta sessão (`administradorNomeadoUnico`/
  `administradorNomeadoConjunto`), sem achado novo aqui.
- **Percentuais livres, sem padrão fixo**: 51%/24,5%/24,5% (Composse) e
  20%/80% (Parceria) — nenhum dos dois é 50/50 nem repete os splits já
  vistos — confirma que `fracao`/`percentualOutorgante`/`percentualExplorador`
  como texto livre está certo.
- **Liquidação de haveres**: 60 parcelas mensais, corrigidas pelo INPC — bate
  com `[BV-COM]`, sem variação nova.
- **Georreferenciamento**: o memorial de vértices completo do Anexo da
  Parceria é exatamente o padrão que já tratamos como "vem do BigQuery, já
  resolvido" (`matricula.georreferenciado` + `PAPEIS_LISTA.vertices`) — este
  exemplo só confirma que a prática real usa isso pesadamente quando o imóvel
  tem georref, não é achado novo.
- **Tipos de instrumento de origem**: a Composse cita uma Parceria e QUATRO
  variações de nome de arrendamento ("Contrato de Arrendamento Agrícola",
  "Contrato Particular de Arrendamento Agrícola", "Contrato Particular de
  Arrendamento de Imóvel Rural") — todas cabem no nosso enum genérico
  `'Arrendamento'`, com o título literal preservado em
  `origemTituloInstrumento`. Sem gap.

## Resumo

| Achado | Tipo | Ação sugerida |
|---|---|---|
| A — fecho sem 1 linha por signatário/administrador, sem gênero | Gap de modelo, dado já existe | Corrigir `par-fecho`/`com-fecho` |
| B — exploração florestal e piscicultura | Gap real, decisão de produto | Perguntar à OSG antes de modelar |
| C — vigência pode não começar na assinatura | Achado isolado, pendência | Confirmar se é recorrente |
| D — Anexo Único 2026 é prosa, não tabela | Divergência de formato, decisão de produto | Confirmar padrão atual com a OSG |
| E — capital social da origem nem sempre aparece | Observação, sem gap funcional | Nenhuma |
| F — origem por imóvel pode ser 1 compossuidor só | Gap real, baixo volume | Registrar para decisão futura |

Nenhuma alteração foi feita no mockup nesta rodada — é levantamento, como
pedido.
