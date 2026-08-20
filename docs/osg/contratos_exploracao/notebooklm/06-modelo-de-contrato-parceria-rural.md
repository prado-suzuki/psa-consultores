# Modelo de contrato — Instrumento Particular de Parceria Rural

Modelo replicável, construído cláusula a cláusula sobre o texto real de
`exemplo-02-parceria-bela-vista.md` (Instrumento Particular de Parceria, Bela
Vista Agropecuária Ltda., 28/08/2024). Toda a redação fixa é a do contrato
real; só os valores específicos de cada caso concreto foram trocados por
variáveis. Numeração de cláusulas e títulos de seção preservados como no
original.

Cardinalidade confirmada na prática: **1 outorgante, N outorgados**, nunca o
contrário. Se há mais de um outorgante (duas empresas diferentes, por
exemplo), são **dois contratos separados**, um para cada — não uma variação
deste modelo.

## Convenção de marcação

| Marca | Significado |
|---|---|
| `{{campo}}` | Valor único, substituído pelo dado de cada caso concreto. |
| `[[BLOCO: condição]] … [[FIM BLOCO]]` | Trecho que só entra sob uma condição — a condição está descrita acima do bloco. |
| `[[REPETIR para cada X em lista]] … [[FIM REPETIR]]` | Trecho que se repete uma vez por item de uma lista (outorgados, imóveis). |
| *(nota entre parênteses e em itálico)* | Instrução de concordância gramatical (gênero/número) — não é campo de dado, é ajuste de texto. |

---

## INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA

**PARCEIRA OUTORGANTE:**

[[BLOCO: outorgante é pessoa jurídica]]
{{outorgante.denominacao}}, pessoa jurídica de direito privado, inscrita no
CNPJ/MF sob o n.º {{outorgante.cnpj}}, registrada na Junta Comercial do
Estado de {{outorgante.juntaComercialUf}} sob o NIRE {{outorgante.nire}}, com
capital social totalmente subscrito e integralizado no valor de
{{outorgante.capitalSocial}}, com sede n{{outorgante.endereco}}, no município
de {{outorgante.municipio}}, Estado de {{outorgante.uf}}, neste ato
representada por {{outorgante.administradores}} *(listar administradores;
ajustar "seu administrador"/"seus administradores" conforme o número)*.
[[FIM BLOCO]]

[[BLOCO: outorgante é pessoa física]]
{{outorgante.nome}}, {{outorgante.nacionalidade}}, natural de
{{outorgante.naturalidade}}, nascid[o/a] em {{outorgante.dataNascimento}},
{{outorgante.profissao}}, {{outorgante.estadoCivil}} sob o regime de
{{outorgante.regimeBens}}, portador[a] do RG nº {{outorgante.rg}}, inscrit[o/a]
no CPF/MF sob o nº {{outorgante.cpf}}, residente e domiciliad[o/a] n{{outorgante.endereco}},
no município de {{outorgante.municipio}}, Estado de {{outorgante.uf}}.
[[FIM BLOCO]]

**PARCEIROS OUTORGADOS:**

[[REPETIR para cada outorgado em outorgados]]
{{outorgado.nome}}, {{outorgado.nacionalidade}}, natural de
{{outorgado.naturalidade}}, nascid[o/a] em {{outorgado.dataNascimento}},
filh[o/a] de {{outorgado.filiacao}}, {{outorgado.profissao}},
{{outorgado.estadoCivil}} sob o regime de {{outorgado.regimeBens}},
portador[a] do RG nº {{outorgado.rg}}, inscrit[o/a] no CPF/MF sob o nº
{{outorgado.cpf}}, residente e domiciliad[o/a] n{{outorgado.endereco}}, no
município de {{outorgado.municipio}}, Estado de {{outorgado.uf}}
[[FIM REPETIR]] — doravante denominados **PARCEIROS OUTORGADOS**.

As partes acima identificadas têm, entre si, justas e contratadas, o presente
Instrumento Particular de Parceria para Fins de Exploração Agropecuária, que
se regerá pelas cláusulas e condições descritas no presente.

### DAS ÁREAS CEDIDAS EM PARCERIA

**Cláusula Primeira.** As partes, por este instrumento contratual, constituem
parceria rural para exploração agropecuária em áreas de terras rurais, nos
termos do art. 96 da Lei 4.504/64, cedendo a PARCEIRA OUTORGANTE em favor dos
PARCEIROS OUTORGADOS os imóveis de sua posse e/ou propriedade, descritos nas
alíneas a seguir, com seus limites e confrontações dispostos no ANEXO ÚNICO
deste instrumento:

[[REPETIR para cada imóvel em imoveis]]
- **{{imovel.ref}})** {{imovel.areaCedida}} ha de um imóvel com área de
  {{imovel.areaTotal}} ha, denominado **{{imovel.nome}}**, matrícula nº
  {{imovel.matricula}}, município de {{imovel.municipio}}/{{imovel.uf}};
[[FIM REPETIR]]

Todos os imóveis são de propriedade de {{outorgante.denominacao}},
registrados no Cartório do Registro de Imóveis e Hipotecas de
{{outorgante.municipio}}/{{outorgante.uf}}.

*(Se os imóveis pertencerem a proprietários diferentes entre si — mesmo que
todos cedidos pela mesma outorgante por procuração ou representação —, listar
o proprietário por alínea em vez de uma frase única; ver
`exemplo-05-anexo-imoveis-bela-vista.md`, que mostra um caso real com 5
proprietários diferentes.)*

### DA VIGÊNCIA

**Cláusula Segunda.** A presente parceria rural tem vigência a contar da data
de {{dataAssinatura}} e findará em {{dataEncerramento}}.

*Parágrafo Primeiro:* Não havendo renovação nos termos da Cláusula Nona, ao
término da vigência, os PARCEIROS OUTORGADOS deverão devolver à PARCEIRA
OUTORGANTE, independentemente de notificação, os imóveis rurais objetos desta
parceria.

[[BLOCO: vigência é prorrogável]]
*Parágrafo Segundo:* Ultrapassando o contrato a data prevista no caput, o
contrato {{regraDeProrrogacao}} *(descrever a regra — ex.: "passará a ser por
tempo indeterminado, podendo a PARCEIRA OUTORGANTE rescindi-lo a qualquer
tempo, mediante notificação escrita, com saída dos PARCEIROS OUTORGADOS em 30
dias" ou "renova-se por períodos iguais de X anos, salvo aviso em contrário
até Y meses antes do vencimento")*.
[[FIM BLOCO]]

### DAS ATIVIDADES AGROPECUÁRIAS

**Cláusula Terceira.** Os PARCEIROS OUTORGADOS poderão explorar
{{culturasEAtividades}}, podendo inclusive plantar safrinha sem custo
adicional.

### DAS DESPESAS

**Cláusula Quarta.** Competem aos PARCEIROS OUTORGADOS todas as despesas de
preparo, plantio, cultivo, colheita, extração, limpeza e beneficiamento dos
produtos, mão de obra, insumos, defensivos, adubos, corretivos de solo,
máquinas, combustíveis e demais itens necessários à exploração — ressalvadas
as despesas do imóvel em si (ITR, CAR, Georreferenciamento, CCIR), que
permanecem com a PARCEIRA OUTORGANTE.

### DA PARTICIPAÇÃO DE CADA PARCEIRO NOS FRUTOS DA PARCERIA

**Cláusula Quinta.** Caberá à PARCEIRA OUTORGANTE **{{percentualOutorgante}}**
de todos os frutos produzidos nas áreas objeto da parceria, e aos PARCEIROS
OUTORGADOS os outros **{{percentualOutorgados}}**, em conformidade com o art.
96, VI, "a", da Lei 4.504/64. Os PARCEIROS OUTORGADOS armazenam os frutos em
depósito indicado pela PARCEIRA OUTORGANTE, arcando com o transporte.

*(Esse percentual é sempre o corte agregado entre o lado outorgante e o lado
outorgados como um todo — mesmo havendo vários outorgados, não há aqui
percentual individual por pessoa; a divisão interna entre eles, se houver, é
assunto de uma eventual composse entre os próprios outorgados, não desta
cláusula. Ver `03-relacao-entre-parceria-e-composse.md`.)*

*Parágrafo Primeiro:* Inadimplemento na entrega dos frutos gera mora
automática, com atualização pelo INPC, multa de 10% e juros de 1% ao mês.

**Cláusula Sexta.** Os parceiros podem dispor dos frutos antes da partilha,
comercializando independentemente, respondendo cada um por si perante
terceiros se os frutos pactuados excederem o resultado que lhe cabe.

**Cláusula Sétima.** Caso fortuito ou força maior que destrua parcialmente a
produção tem a perda suportada pelas partes, conforme art. 96, §1º, I, da Lei
4.504/64.

**Cláusula Oitava.** Obrigações trabalhistas, sociais, tributárias, fiscais,
ambientais e previdenciárias relativas à mão de obra rural são
exclusivamente dos PARCEIROS OUTORGADOS.

### DO DIREITO DE PREFERÊNCIA NOS CASOS DE ALIENAÇÃO E/OU RENOVAÇÃO

**Cláusula Nona.** Nos termos do art. 95, IV, c/c art. 96, VII, da Lei
4.504/64, os PARCEIROS OUTORGADOS têm preferência à renovação, em igualdade de
condições com terceiros — a PARCEIRA OUTORGANTE deve notificá-los até 6 meses
antes do vencimento, com cópia de eventual proposta recebida.

*Parágrafo Primeiro:* Esse direito não prevalece se a PARCEIRA OUTORGANTE
notificar, com a mesma antecedência de 6 meses, que deseja retomar os imóveis
para exploração direta.

*Parágrafo Segundo:* Em caso de venda das áreas, a PARCEIRA OUTORGANTE deve
avisar os PARCEIROS OUTORGADOS, que têm 30 dias para exercer preferência.

### DA FUNÇÃO SOCIAL E DA DEVOLUÇÃO DOS BENS

**Cláusula Décima.** Os bens serão devolvidos como entregues, salvo
deterioração de uso normal.

[[BLOCO: benfeitorias não geram indenização]]
*Parágrafo Segundo:* Benfeitorias realizadas pelos PARCEIROS OUTORGADOS, úteis
ou voluptuárias, **incorporam-se aos imóveis sem indenização**.
[[FIM BLOCO]]

[[BLOCO: benfeitorias geram indenização]]
*Parágrafo Segundo:* Benfeitorias necessárias e úteis realizadas pelos
PARCEIROS OUTORGADOS com o consentimento da PARCEIRA OUTORGANTE serão
indenizadas ao término do contrato; benfeitorias voluptuárias não geram
indenização, salvo acordo em contrário.
[[FIM BLOCO]]

### DO USO DO SOLO E MÃO DE OBRA

**Cláusula Décima Primeira.** Manejo do solo conforme recomendações
agronômicas; atividades pecuárias conforme normas veterinárias e zootécnicas;
proibido uso de defensivos não autorizados; respeito a leis ambientais e
trabalhistas, sem invasão de terra nem queimadas irregulares.

### DA EXTINÇÃO DO CONTRATO

**Cláusula Décima Segunda.** Inadimplemento de qualquer cláusula permite
rescisão mediante simples notificação, assegurada a colheita da safra em
curso antes da devolução dos imóveis e partilha dos frutos daquela safra.

**Cláusula Décima Terceira.** Rescisão também pode ocorrer por mútuo acordo a
qualquer tempo, respeitado o término da safra em curso.

[[BLOCO: contrato autoriza penhor]]
### DA ANUÊNCIA

**Cláusula Décima Quarta.** A PARCEIRA OUTORGANTE autoriza os PARCEIROS
OUTORGADOS a oferecer em garantia de financiamentos bancários, durante toda a
vigência (e a safra seguinte), a totalidade da produção, além de materiais
agrários, benfeitorias e semoventes de sua propriedade.

*Parágrafo Primeiro:* O penhor de cada safra vale por todo o período de
vigência da parceria, conforme art. 1.439 do Código Civil.
[[FIM BLOCO]]

### DISPOSIÇÕES GERAIS

**Cláusula Décima Quinta.** Acordo irrevogável e irretratável, obrigando
sucessores; alteração só por escrito, assinada por todos.

**Cláusula Décima Sexta.** Vedada a cessão do contrato pelos PARCEIROS
OUTORGADOS sem consentimento expresso da outra parte.

**Cláusula Décima Sétima.** Os PARCEIROS OUTORGADOS se eximem de ônus sobre os
imóveis decorrentes de dívidas exclusivas da PARCEIRA OUTORGANTE alheias à
exploração rural objeto do contrato.

**Cláusula Décima Oitava.** A relação **não** se rege pela CLT, e sim pelo
Estatuto da Terra e pelo Decreto 59.566/1966, já que os PARCEIROS OUTORGADOS
não estão subordinados à PARCEIRA OUTORGANTE, podendo estipular seus próprios
horários de trabalho.

### DO FORO

**Cláusula Décima Nona.** Fica eleito o foro da comarca de
{{foroComarca}}, Estado de {{foroUf}}.

Por estarem justos e contratados, firmam o presente instrumento em vias de
igual teor, com 2 (duas) testemunhas.

{{foroComarca}}/{{foroUf}}, {{dataAssinatura}}.

{{outorgante.denominacao}} — Parceira Outorgante

[[REPETIR para cada outorgado em outorgados]]{{outorgado.nome}}[[FIM REPETIR]]
— Parceiros Outorgados

Testemunhas: {{testemunha1}}; {{testemunha2}}.
