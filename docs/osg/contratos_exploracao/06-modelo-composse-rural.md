# Modelo — Instrumento Particular de Composse Rural Pro Indiviso

Modelo replicável, construído cláusula a cláusula sobre o texto real de
`docs/notebooklm/exemplo-01-composse-bela-vista.md` (Sérgio Pitt e Outros,
28/08/2024). Dois pontos de variação real, confirmados por comparação direta
com `exemplo-03-composse-rossato.md` (mesma estrutura de cláusulas, família
diferente), estão marcados como blocos condicionais — ver cláusulas Segunda
(liquidação de haveres) e Décima Primeira (regra de administração). O restante
da redação fixa é idêntica nos dois contratos reais lidos.

Mesma convenção de marcação de `05-modelo-parceria-rural.md`
(`{{campo}}` / `[[BLOCO]]…[[FIM BLOCO]]` / `[[REPETIR]]…[[FIM REPETIR]]`).

---

## INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO

[[REPETIR para cada compossuidor em compossuidores]]
{{compossuidor.nome}}, {{compossuidor.nacionalidade}}, natural de
{{compossuidor.naturalidade_municipio}}/{{compossuidor.naturalidade_uf}},
nascid[o/a] em {{compossuidor.data_nascimento}}, filh[o/a] de
{{compossuidor.filiacao_pai}} e {{compossuidor.filiacao_mae}},
{{compossuidor.profissao}}, {{compossuidor.estado_civil}} sob o regime d{{compossuidor.regime_bens}},
portador[a] do RG nº {{compossuidor.documento_identidade_numero}}
{{compossuidor.documento_identidade_orgao}}, inscrito no CPF/MF sob o nº
{{compossuidor.cpf_cnpj}}, residente e domiciliad[o/a] n{{compossuidor.endereco_logradouro}},
nº {{compossuidor.endereco_numero}}, bairro {{compossuidor.endereco_bairro}}, no
município de {{compossuidor.endereco_municipio}}, Estado de
{{compossuidor.endereco_uf}}, CEP {{compossuidor.endereco_cep}}[[FIM REPETIR]],
neste ato doravante denominados **COMPOSSUIDORES RURAIS** ou simplesmente
**COMPOSSUIDORES**.

## PREÂMBULO

**I)** CONSIDERANDO que os COMPOSSUIDORES RURAIS têm interesse em se
associarem para exploração de atividade agropecuária, vez que possuem, no
conjunto, conhecimento técnico especializado, capital, máquinas e
equipamentos, e ainda, são legítimos possuidores dos imóveis rurais descritos
nas alíneas "{{imoveis[0].ref}}" à "{{imoveis[-1].ref}}", do ANEXO ÚNICO deste
instrumento.

**II)** CONSIDERANDO que os COMPOSSUIDORES desejam associar-se através de
composse pro indiviso para utilização de imóvel rural, alicerçados nos
artigos 1.196, 1.197, 1.199, 1.204, 1.314, 1.323 e 1.326 da Lei 10.406/2002
(que tratam da composse e dos condomínios voluntários, racional
analogicamente adotado ao presente contrato), bem como as demais normas
aplicáveis subsidiariamente ao presente acordo previstas na legislação
brasileira;

**III)** CONSIDERANDO que o artigo 14 da Lei 4.504/1.964, também conhecida
como Estatuto da Terra, determina que o poder público facilite e prestigie a
criação e a expansão de associações de pessoas físicas e jurídicas que
tenham por finalidade o racional desenvolvimento agrícola, pecuário,
extrativo ou agroindustrial;

**IV)** CONSIDERANDO que os COMPOSSUIDORES RURAIS buscam oportunidades para
investimentos e exploração conjunta de negócios agrícolas, e para tanto,
resolvem se organizar estabelecendo uma composse rural pro indiviso, elegendo
a tributação na pessoa física, na forma entrevista no artigo 13 do Decreto
9.580/2.018;

**V)** CONSIDERANDO que a posse dos imóveis rurais descritos no Anexo único
deste instrumento advém dos seguintes instrumentos:

[[REPETIR para cada origem em origensDistintas]]
**{{origem.letra}})** Item(ns) "{{origem.itens}}" advém[m] d{{origem.tipoInstrumentoOrigem}},
[[BLOCO: origem.tipoInstrumentoOrigem == 'Exploração própria']]
sendo o imóvel já explorado diretamente pelos próprios COMPOSSUIDORES RURAIS,
sem instrumento de cessão de terceiro por trás,
[[FIM BLOCO]]
[[BLOCO: origem.tipoInstrumentoOrigem != 'Exploração própria']]
firmado em {{origem.dataAssinatura}}, no qual figura como Parceira Outorgante
{{origem.outorgante.denominacao}}[[SE origem.outorgante.cpf_cnpj]], CNPJ/MF nº
{{origem.outorgante.cpf_cnpj}}[[FIM SE]], com sede em
{{origem.outorgante.endereco_municipio}}/{{origem.outorgante.endereco_uf}}, e
como Parceiros Outorgados os COMPOSSUIDORES RURAIS,
[[FIM BLOCO]]
[[FIM REPETIR]]

*(Confirmado em `[BV-COM]`: uma composse pode reunir imóveis de origens,
datas e outorgantes diferentes — cada alínea do "Considerando V" corresponde
a um subconjunto de imóveis do Anexo Único com a mesma origem. "Exploração
própria" foi nomeada assim pela consultora na reunião de validação de
19/08/2026, e substitui o "outro" genérico que cobria esse caso antes.)*

As partes acima identificadas resolvem, em comum acordo, entabular o presente
INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO, para
estabelecer compromissos com relação à administração dos negócios rurais
originários do exercício comum da posse de imóvel rural (bens e know-how), o
que fazem nos termos da legislação brasileira, especialmente as acima citadas
e das cláusulas e condições abaixo estabelecidas.

## CAPÍTULO I – DO OBJETO

**Cláusula Primeira.** Fica constituída uma COMPOSSE RURAL em que são
COMPOSSUIDORES RURAIS as partes qualificadas no preâmbulo, com o objetivo de
explorarem, sob o regime disposto neste instrumento, incluindo, mas não se
limitando, ao de {{culturas}}, ou outra cultura legalmente permitida que
pretenderem explorar, nas áreas rurais descritas no anexo único deste
instrumento.

**Cláusula Segunda.** Os COMPOSSUIDORES RURAIS se obrigam na COMPOSSE RURAL
objeto deste instrumento e gozarão dos frutos dela na proporção de suas
partes, quais sejam: [[REPETIR para cada compossuidor em compossuidores]]
**{{compossuidor.fracao}}% para {{compossuidor.nome}}**[[FIM REPETIR]].

*(Confirmado em `../levantamento-contratos-rurais.md`: a soma das frações
sempre fecha em 100% — sem cobertura parcial nos frutos deste instrumento.)*

*Parágrafo Primeiro:* A COMPOSSE girará, quando assim exigida em lei e/ou por
força de eventuais solicitações de terceiros, sob o nome de {{nomeComposse}}
*(convenção observada nos dois exemplos reais: primeiro compossuidor listado
+ "E OUTROS")*.

*Parágrafo Segundo:* Caberá a cada COMPOSSUIDOR tão somente a participação
estipulada no caput desta cláusula, restando ainda acordado que caso haja a
dissolução da composse, por qualquer motivo, as partes ou terceiros
interessados acordarão como se dará a liquidação dos haveres, sendo que na
ausência de comum acordo, a liquidação dos haveres do compossuidor retirante,
seu cônjuge ou companheiro(a), herdeiro(a), sucessor(a) e/ou terceiro,
observará o disposto nas alíneas abaixo:

- **a)** o valor dos haveres será apurado e liquidado com base no valor do
  patrimônio líquido da composse apurado em balanço específico para este fim,
  levantado no máximo 60 (sessenta) dias antes do evento;
- **b)** o pagamento será realizado em moeda corrente nacional, através de
  depósito em conta bancária do beneficiário, em
  [[BLOCO: liquidacao.periodicidade == 'mensal']]
  {{liquidacao.numeroParcelas}} (parcelas) parcelas iguais e mensais,
  atualizadas monetariamente pela variação do INPC, vencendo a primeira em
  30 (trinta) dias após o evento
  [[FIM BLOCO]]
  [[BLOCO: liquidacao.periodicidade == 'anual']]
  {{liquidacao.numeroParcelas}} (parcelas) parcelas anuais e consecutivas,
  atualizadas monetariamente pela variação do INPC, vencendo a primeira em 1
  (um) ano do evento
  [[FIM BLOCO]]
  que deu origem à liquidação;
- **c)** os compossuidores estabelecem que todas as avaliações dos haveres
  serão realizadas por empresa especializada, cuja nomeação competirá aos
  compossuidores que possuírem a maioria da participação na composse;
- **d)** em todos os demais casos em que ocorrer a resolução da composse
  face a um ou mais compossuidor(es), ainda que não esteja expressamente
  previsto neste instrumento, os valores devidos serão determinados através
  da metodologia descrita nas alíneas anteriores.

*(Ponto de variação real confirmado: `[BV-COM]` usa 60 parcelas mensais;
`[ROS-COM]` usa 10 parcelas anuais. Confirmar com a consultora qual regime
usar por cliente — não há uma regra padrão única entre os dois exemplos
reais lidos.)*

**Cláusula Terceira.** Os COMPOSSUIDORES RURAIS se obrigam aos termos aqui
avençados, por si, herdeiros e sucessores, concorrendo para as despesas e
suportando os ônus na proporção da parte ideal que possuem, quando feitas no
uso regular da administração da composse.

**Cláusula Quarta.** Os COMPOSSUIDORES RURAIS determinam que seja deixada
indivisa a coisa comum, em especial os imóveis, bens, benfeitorias, máquinas,
equipamentos, implementos etc., pelo prazo de {{prazoIndivisao}}[[BLOCO: indivisaoProrrogavel == true]],
podendo ainda ser prorrogado por igual interstício se não houver, por
escrito, {{indivisaoAvisoPrazo}}, o requerimento de divisão da coisa comum
por qualquer um dos COMPOSSUIDORES RURAIS; renovando-se o prazo
sucessivamente, até que formalmente uma das partes notifique a outra
desejando a divisão da coisa comum e a extinção da presente composse[[FIM BLOCO]].

*(Confirmado em `[BV-COM]`, Cláusula Quarta: prazo de 3 anos, prorrogação
automática salvo aviso até 3 meses antes do vencimento — é o valor padrão de
`emptyExploracaoDraft`, mas cada cliente pode ter prazo diferente.)*

*Parágrafo Único:* Os imóveis rurais que fazem parte integrante do objeto
desta COMPOSSE RURAL que eventualmente deixarem de ser objeto de posse dos
seus respectivos COMPOSSUIDORES em virtude de encerramento de contratos de
parcerias de áreas rurais, deixarão espontaneamente de fazer parte do
presente contrato, mantendo-se o presente contrato vigente e inalterado com
relação as demais áreas subsistentes, até o fim do prazo previsto no caput
desta cláusula, **não sendo motivo para rescisão da presente COMPOSSE RURAL
ou elaboração de aditivos contratuais.**

*(Este parágrafo é a base jurídica do campo computado "Situação da origem" —
`vigente`/`encerrada` — no cadastro: o imóvel some da composse sozinho, sem
aditivo, quando a Parceria de origem termina.)*

**Cláusula Quinta.** Fica vedado aos COMPOSSUIDORES RURAIS modificar a
destinação da presente composse pro indiviso, bem como transferir, dar
posse, uso ou gozo, de quaisquer dos bens ou direitos comuns a terceiros,
exceto se COMPOSSUIDORES RURAIS que representem a maioria dos percentuais
descritos na Cláusula Segunda anuírem.

*(Confirmado em reunião de validação, 19/08/2026: é por esta cláusula que um
novo participante entra numa composse existente — nunca por uma parceria
nova sobre ela. "Trava na composse".)*

## CAPÍTULO II – DO RESULTADO DA COMPOSSE RURAL

**Cláusula Sexta.** A apuração dos resultados da COMPOSSE obtidos pelos
COMPOSSUIDORES relacionados à fruição econômica da atividade objeto deste
contrato será realizada por ano/safra, cujo resultado positivo e líquido será
distribuído, sempre no dia 31 de outubro de cada ano, proporcional à
participação de cada compossuidor descrita na Cláusula Segunda, salvo
deliberação em contrário na qual todos concordem.

*Parágrafo Primeiro:* Os resultados serão auferidos levando-se em
consideração todas as receitas e despesas (custos), obtidos pela atividade
realizada em comum, apurados mediante livro caixa sob o regime de caixa, nos
termos das normativas estabelecidas pelo CFC.

*Parágrafo Segundo:* Havendo prejuízo, estes serão suportados
proporcionalmente por cada um dos COMPOSSUIDORES.

**Cláusula Sétima.** As responsabilidades decorrentes da contratação de
trabalhadores rurais ou diaristas, obrigações trabalhistas ou sociais,
passivos tributários, fiscais, ambientais, cíveis, bancários, contratuais e
negociais serão suportados pela COMPOSSE, nos moldes da lei e deste
contrato.

**Cláusula Oitava.** A COMPOSSE deverá abrir inscrição estadual para a
exploração de suas atividades, observado o nome designado para a COMPOSSE
previsto no parágrafo primeiro da Cláusula Segunda.

**Cláusula Nona.** Caberá aos COMPOSSUIDORES financiarem, com recursos
próprios ou de terceiros, as necessidades de capital de giro, insumos e
demais itens necessários à exploração do objeto deste contrato.

[[BLOCO: permitePenhor == true]]
*Parágrafo Primeiro:* Fica possibilitada a contratação de financiamentos
rurais pelos COMPOSSUIDORES, podendo ceder frutos da atividade comum como
garantia, mediante a emissão de Cédula de Produto Rural ou outro instrumento
jurídico com o mesmo fim.
[[FIM BLOCO]]

**Cláusula Décima.** Os lucros obtidos pela atividade rural resultante da
composse serão repassados aos COMPOSSUIDORES RURAIS na forma estabelecida na
Cláusula Segunda.

## CAPÍTULO III – ADMINISTRAÇÃO

**Cláusula Décima Primeira.** A COMPOSSE será administrada isoladamente por
seus COMPOSSUIDORES, que representarão a composse ativa e passivamente, em
juízo ou fora dela, perante qualquer repartição pública e/ou empresa
privada, observando os limites e condições deste instrumento, podendo:
celebrar instrumentos e negócios jurídicos, operações financeiras,
empréstimos, financiamentos, contratos de compra e venda, constituição de
garantias; comprar, adquirir e permutar bens móveis; assinar títulos de
crédito; abrir, encerrar e movimentar contas bancárias; admitir e demitir
funcionários; e outorgar procurações para defesa de interesses da COMPOSSE.

*Parágrafo Primeiro:*
[[BLOCO: regraAdministracao == 'maioria']]
Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir
garantias a favor de terceiros (não compossuidores), só podem ser feitos em
conjunto por COMPOSSUIDORES que representem a maioria dos percentuais da
Cláusula Segunda, sob pena de nulidade.
[[FIM BLOCO]]
[[BLOCO: regraAdministracao == 'nomeados']]
Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir
garantias a favor de terceiros (não compossuidores), só podem ser feitos em
conjunto por [[REPETIR para cada admin em administradoresNomeados]]{{admin.nome}}[[FIM REPETIR]],
sob pena de nulidade.
[[FIM BLOCO]]

*(Ponto de variação real confirmado: `[BV-COM]` usa a regra "maioria dos
percentuais" (3 compossuidores, todos também administradores da outorgante
original); `[ROS-COM]` nomeia 2 compossuidores específicos como
administradores, independente do percentual de cada um. Escolher conforme
acordo entre as partes no caso concreto — não há uma regra padrão única.)*

*Parágrafo Segundo:* Havendo incapacidade civil superveniente de qualquer
administrador, a administração passará a ser desempenhada isoladamente pelo
administrador remanescente em pleno gozo da capacidade civil.

**Cláusula Décima Segunda.** É facultado aos COMPOSSUIDORES RURAIS o acesso
aos livros exclusivos da composse, registros, contratos financeiros e
comerciais de compra de insumos e venda de produtos, assim como dos
documentos de suporte à contabilidade.

**Cláusula Décima Terceira.** São expressamente vedados, sendo nulos e
inoperantes com relação aos COMPOSSUIDORES RURAIS, os atos de qualquer
administrador ou procurador que os envolverem em obrigações relativas a
negócios ou operações estranhas à COMPOSSE objeto deste instrumento.

[[BLOCO: permitePenhor == true]]
## CAPÍTULO IV – DO PENHOR

**Cláusula Décima Quarta.** Os COMPOSSUIDORES autorizam, desde já, que sejam
oferecidos em garantia de financiamentos a serem concedidos por Instituições
Financeiras, durante toda a vigência deste instrumento, a totalidade da
produção a ser auferida nos imóveis rurais objetos desta COMPOSSE, bem como
os materiais agrários, benfeitorias e semoventes de sua posse ou propriedade
ali localizados.

**Cláusula Décima Quinta.** Os COMPOSSUIDORES declaram ter plena ciência de
que o penhor dos produtos dados em garantia em cada safra valerá pelo prazo
da respectiva obrigação garantida, em conformidade com o artigo 1.439 do
Código Civil, não podendo ser superior ao período de vigência deste
instrumento.

**Cláusula Décima Sexta.** Os COMPOSSUIDORES autorizam ainda que sejam
destinados prioritariamente o produto oriundo da venda da produção
financiada e/ou de bens vinculados, à liquidação dos respectivos débitos
contraídos, antes mesmo do pagamento e/ou repartição dos frutos desta
COMPOSSE.

**Cláusula Décima Sétima.** Os COMPOSSUIDORES declaram ter plena ciência do
direito que assiste às Instituições Financeiras de fiscalizar os
empreendimentos financiados e vistoriar os bens vinculados.
[[FIM BLOCO]]

## CAPÍTULO V – DISPOSIÇÕES GERAIS

**Cláusula Décima Oitava.** Nenhuma das partes poderá ceder ou transferir
direitos e obrigações decorrentes deste INSTRUMENTO, salvo mediante prévio e
expresso consentimento por escrito dos demais signatários.

**Cláusula Décima Nona.** Obrigam-se as partes à preservação dos recursos
naturais existentes nas áreas ocupadas pela COMPOSSE na forma da lei.

**Cláusula Vigésima.** Este instrumento constitui acordo irrevogável e
irretratável entre as PARTES, obrigando seus respectivos herdeiros e
sucessores, podendo ser rescindido mediante distrato em comum acordo, sendo
que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e
assinada por cada um dos COMPOSSUIDORES RURAIS, elegendo as partes o foro da
Comarca de {{foroComarca}}, Estado de {{foroUf}}, para dirimir quaisquer
conflitos.

E assim, por estarem justos e contratados, os COMPOSSUIDORES RURAIS assinam
este INSTRUMENTO em vias de igual teor e forma, perante as 02 (duas)
testemunhas abaixo.

{{foroComarca}}/{{foroUf}}, {{dataAssinatura}}.

[[REPETIR para cada compossuidor em compossuidores]]{{compossuidor.nome}} — Compossuidor Rural
[[FIM REPETIR]]

Testemunhas: {{testemunha1.nome}}; {{testemunha2.nome}}.

---

## ANEXO ÚNICO (compartilhado entre Parceria e Composse)

Descrição das áreas objeto do Instrumento, sendo:

| Item | Área cedida | Área total do imóvel | Nome do imóvel | Matrícula | Município/UF | Proprietário |
|---|---|---|---|---|---|---|
[[REPETIR para cada imovel em imoveis]]| {{imovel.ref}} | {{imovel.areaExplorada}} ha | {{imovel.areaTotal}} ha | {{imovel.nomeImovel}} | {{imovel.matricula}} | {{imovel.municipio}}/{{imovel.uf}} | {{imovel.proprietario}} |
[[FIM REPETIR]]

*(Estrutura confirmada em `docs/notebooklm/exemplo-05-anexo-imoveis-bela-vista.md`
— 15 imóveis, 6 origens, 5 proprietários diferentes numa única composse real.
A coluna "Proprietário" só varia entre imóveis quando a Composse reúne
origens de mais de um outorgante; numa Parceria, todos os imóveis do Anexo
pertencem ao mesmo outorgante — repetir o mesmo nome em todas as linhas.)*

---

## Mapa de variáveis → campos do cadastro

| Variável | Campo em `contratosExploracaoModel.ts` / `PessoaRow` | Confirmado por |
|---|---|---|
| `compossuidores[]` (nome + `.fracao`) | `compossuidores: CompossuidorDraft[]` | `[BV-COM]`, `[ROS-COM]`, soma 100% confirmada |
| `nomeComposse` | derivado (proposto): 1º compossuidor + "E OUTROS" | `[BV-COM]`, `[ROS-COM]` |
| `origensDistintas[]`, `imoveis[].tipoInstrumentoOrigem/instrumentoOrigemRef` | `ExploracaoImovelDraft` — só existe na Composse | `[BV-COM]` (6 origens), reunião de validação 19/08 |
| `prazoIndivisao`/`indivisaoProrrogavel`/`indivisaoAvisoPrazo` | `ExploracaoRuralDraft` | `[BV-COM]`, Cláusula Quarta |
| `liquidacao.periodicidade`/`.numeroParcelas` | **sem campo hoje** — proposto | `[BV-COM]` (60× mensal) vs. `[ROS-COM]` (10× anual) |
| `regraAdministracao`/`administradoresNomeados[]` | **sem campo hoje** — proposto, ver pendência de governança (seção 4 do levantamento) | `[BV-COM]` (maioria) vs. `[ROS-COM]` (nomeados) |
| `permitePenhor` | `ExploracaoRuralDraft.permitePenhor` | `[BV-COM]`, Cláusulas 14ª–17ª |
| `imoveis[].proprietario` (Anexo) | **sem campo hoje** — hoje o cadastro assume 1 outorgante por instrumento; o Anexo real pode ter proprietário por imóvel | `[BV-COM]`, Anexo Único (5 proprietários) |

Dois campos propostos aqui (`liquidacao.*`, `regraAdministracao`/
`administradoresNomeados[]`) **não existem ainda** no levantamento nem no
cadastro — são achados novos, expostos só ao escrever este modelo com texto
real. Vale registrá-los como pendência de próxima rodada de campos.
