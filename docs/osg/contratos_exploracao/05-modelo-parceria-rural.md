# Modelo — Instrumento Particular de Parceria Rural

Modelo replicável, construído clausula a cláusula sobre o texto real de
`docs/notebooklm/exemplo-02-parceria-bela-vista.md` (Instrumento Particular de
Parceria, Bela Vista Agropecuária Ltda., 28/08/2024). Toda a redação fixa é a
do contrato real; só os valores específicos de cada cliente foram trocados
por variáveis. Numeração de cláusulas e títulos de seção preservados como no
original.

Cardinalidade confirmada em reunião de validação com a OSG (19/08/2026, ver
`../levantamento-contratos-rurais.md`, Achado #8): **1 outorgante, N
outorgados**, nunca o contrário. Se há mais de um outorgante (duas empresas
diferentes, por exemplo), são **dois contratos separados**, um para cada — não
uma variação deste modelo.

## Convenção de marcação

| Marca | Significado |
|---|---|
| `{{campo}}` | Valor único, substituído pelo dado do cliente. Nome do campo corresponde ao de `src/previews/contratosExploracaoModel.ts` quando existe lá. |
| `[[BLOCO: nome]] … [[FIM BLOCO]]` | Trecho que só entra sob uma condição — a condição está descrita acima do bloco. |
| `[[REPETIR para cada X em lista]] … [[FIM REPETIR]]` | Trecho que se repete uma vez por item de uma lista (outorgados, imóveis). |
| *(nota entre parênteses e em itálico)* | Instrução de concordância gramatical (gênero/número) — não é campo de dado, é ajuste de texto. |

---

## INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA

**PARCEIRA OUTORGANTE:**

[[BLOCO: outorgante.tipo_pessoa == 'PJ']]
{{outorgante.denominacao}}, pessoa jurídica de direito privado, inscrita no
CNPJ/MF sob o n.º {{outorgante.cpf_cnpj}}, registrada na Junta Comercial do
Estado de {{outorgante.junta_comercial_uf}} sob o NIRE {{outorgante.nire}},
com capital social totalmente subscrito e integralizado no valor de
{{outorgante.capitalSocial}}, com sede n{{outorgante.endereco_logradouro}},
{{outorgante.endereco_numero}}, no município de
{{outorgante.endereco_municipio}}, Estado de {{outorgante.endereco_uf}}, neste
ato representada por {{outorgante.administradores}} *(listar administradores;
ajustar "seu administrador"/"seus administradores" conforme o número)*.
[[FIM BLOCO]]

[[BLOCO: outorgante.tipo_pessoa == 'PF']]
{{outorgante.nome}}, {{outorgante.nacionalidade}}, natural de
{{outorgante.naturalidade_municipio}}/{{outorgante.naturalidade_uf}}, nascid[o/a]
em {{outorgante.data_nascimento}}, {{outorgante.profissao}},
{{outorgante.estado_civil}} sob o regime d{{outorgante.regime_bens}}, portador[a]
do RG nº {{outorgante.documento_identidade_numero}}
{{outorgante.documento_identidade_orgao}}, inscrit[o/a] no CPF/MF sob o nº
{{outorgante.cpf_cnpj}}, residente e domiciliad[o/a] n{{outorgante.endereco_logradouro}},
nº {{outorgante.endereco_numero}}, no município de
{{outorgante.endereco_municipio}}, Estado de {{outorgante.endereco_uf}}.
[[FIM BLOCO]]

**PARCEIROS OUTORGADOS:**

[[REPETIR para cada explorador em exploradores]]
{{explorador.nome}}, {{explorador.nacionalidade}}, natural de
{{explorador.naturalidade_municipio}}/{{explorador.naturalidade_uf}}, nascid[o/a]
em {{explorador.data_nascimento}}, filh[o/a] de {{explorador.filiacao_pai}} e
{{explorador.filiacao_mae}}, {{explorador.profissao}}, {{explorador.estado_civil}}
sob o regime d{{explorador.regime_bens}}, portador[a] do RG nº
{{explorador.documento_identidade_numero}} {{explorador.documento_identidade_orgao}},
inscrit[o/a] no CPF/MF sob o nº {{explorador.cpf_cnpj}}, residente e
domiciliad[o/a] n{{explorador.endereco_logradouro}}, nº
{{explorador.endereco_numero}}, bairro {{explorador.endereco_bairro}}, no
município de {{explorador.endereco_municipio}}, Estado de
{{explorador.endereco_uf}}, CEP {{explorador.endereco_cep}}[[FIM REPETIR]]
— doravante denominados **PARCEIROS OUTORGADOS**.

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

[[REPETIR para cada imovel em imoveis]]
- **{{imovel.ref}})** {{imovel.areaExplorada}} ha de um imóvel com área de
  {{imovel.areaTotal}} ha, denominado **{{imovel.nomeImovel}}**, matrícula nº
  {{imovel.matricula}}, município de {{imovel.municipio}}/{{imovel.uf}};
[[FIM REPETIR]]

Todos os imóveis são de propriedade de {{outorgante.denominacao}},
registrados no Cartório do Registro de Imóveis e Hipotecas de
{{outorgante.endereco_municipio}}/{{outorgante.endereco_uf}}.

*(Se os imóveis pertencerem a proprietários diferentes entre si — mesmo que
todos cedidos pela mesma outorgante por procuração ou representação —, listar
o proprietário por alínea em vez de uma frase única; ver
`docs/notebooklm/exemplo-05-anexo-imoveis-bela-vista.md` para o caso com 5
proprietários diferentes numa única composse, que é o padrão análogo.)*

### DA VIGÊNCIA

**Cláusula Segunda.** A presente parceria rural tem vigência a contar da data
de {{dataAssinatura}} e findará em {{dataEncerramento}}.

*Parágrafo Primeiro:* Não havendo renovação nos termos da Cláusula Nona, ao
término da vigência, os PARCEIROS OUTORGADOS deverão devolver à PARCEIRA
OUTORGANTE, independentemente de notificação, os imóveis rurais objetos desta
parceria.

[[BLOCO: vigenciaProrrogavel == true]]
*Parágrafo Segundo:* Ultrapassando o contrato a data prevista no caput, o
contrato {{prazoRenovacaoVigencia}} *(descrever a regra de prorrogação — ex.:
"passará a ser por tempo indeterminado, podendo a PARCEIRA OUTORGANTE
rescindi-lo a qualquer tempo, mediante notificação escrita, com saída dos
PARCEIROS OUTORGADOS em 30 dias" ou "renova-se por períodos iguais de X anos,
salvo aviso em contrário até Y meses antes do vencimento" — ver pendência
aberta em `../levantamento-contratos-rurais.md`, seção 2: nenhum contrato real
lido tem essa cláusula redigida na própria Parceria; confirmar redação com a
consultora antes de usar em produção)*.
[[FIM BLOCO]]

### DAS ATIVIDADES AGROPECUÁRIAS

**Cláusula Terceira.** Os PARCEIROS OUTORGADOS poderão explorar {{culturas}},
podendo inclusive plantar safrinha sem custo adicional.

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
OUTORGADOS os outros **{{percentualExplorador}}**, em conformidade com o art.
96, VI, "a", da Lei 4.504/64. Os PARCEIROS OUTORGADOS armazenam os frutos em
depósito indicado pela PARCEIRA OUTORGANTE, arcando com o transporte.

*(Confirmado em reunião de validação, 19/08/2026: este percentual é sempre o
corte agregado entre o lado outorgante e o lado outorgados como um todo —
mesmo havendo vários outorgados, não há aqui percentual individual por
pessoa; a divisão interna entre eles, se houver, é assunto de uma eventual
composse entre os próprios outorgados, não desta cláusula.)*

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

[[BLOCO: benfeitoriasIndenizaveis == false]]
*Parágrafo Segundo:* Benfeitorias realizadas pelos PARCEIROS OUTORGADOS, úteis
ou voluptuárias, **incorporam-se aos imóveis sem indenização**.
[[FIM BLOCO]]

[[BLOCO: benfeitoriasIndenizaveis == true]]
*Parágrafo Segundo:* Benfeitorias necessárias e úteis realizadas pelos
PARCEIROS OUTORGADOS com o consentimento da PARCEIRA OUTORGANTE serão
indenizadas ao término do contrato; benfeitorias voluptuárias não geram
indenização, salvo acordo em contrário. *(Redação de indenização não
confirmada em contrato real lido — achado em `01-contrato-de-parceria-rural.md`;
a pasta do cliente pode ter um modelo próprio de "Parceria com Benfeitorias
Indenizáveis", ver achado na linha correspondente do levantamento. Conferir
redação exata com a consultora antes de usar em produção.)*
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

[[BLOCO: permitePenhor == true]]
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
{{outorgante.endereco_municipio}}, Estado de {{outorgante.endereco_uf}}.

Por estarem justos e contratados, firmam o presente instrumento em vias de
igual teor, com 2 (duas) testemunhas.

{{outorgante.endereco_municipio}}/{{outorgante.endereco_uf}}, {{dataAssinatura}}.

{{outorgante.denominacao}} — Parceira Outorgante

[[REPETIR para cada explorador em exploradores]]{{explorador.nome}}[[FIM REPETIR]]
— Parceiros Outorgados

Testemunhas: {{testemunha1.nome}}; {{testemunha2.nome}}.

---

## Mapa de variáveis → campos do cadastro

| Variável | Campo em `contratosExploracaoModel.ts` / `PessoaRow` | Confirmado por |
|---|---|---|
| `outorgante.*` | `outorganteId` → `pessoa.*` (singular, confirmado) | Reunião de validação 19/08/2026 |
| `exploradores[]` | `exploradores: ParteSimplesDraft[]` → `pessoa.*` | `[BV-PAR]` + reunião de validação |
| `imoveis[].ref/areaExplorada` | `ExploracaoImovelDraft.ref/.areaExplorada` | `[BV-PAR]`, seção "Áreas cedidas" |
| `imoveis[].areaTotal/nomeImovel/matricula/municipio/uf` | lidos de `matricula.*` via `matriculaId` | `[BV-PAR]` |
| `dataAssinatura`/`dataEncerramento` | `ExploracaoRuralDraft.dataAssinatura/.dataEncerramento` | `[BV-PAR]` |
| `vigenciaProrrogavel`/`prazoRenovacaoVigencia` | idem | **Pendência** — sem contrato real com esta cláusula; ver seção 2 do levantamento |
| `culturas` | `ExploracaoRuralDraft.culturas` | `[BV-PAR]`/`[BV-COM]` |
| `percentualOutorgante`/`percentualExplorador` | idem | `[BV-PAR]` (90/10) |
| `benfeitoriasIndenizaveis` | idem | Achado catalogado, **não confirmado em `[BV-PAR]`** — ver observação da cláusula |
| `permitePenhor` | idem | `[BV-PAR]`, cláusula da anuência |

Campos do levantamento que **não aparecem** neste modelo por serem
exclusivos da Composse (confirmado em reunião de validação, 19/08/2026):
`tipoInstrumentoOrigem`/`instrumentoOrigemRef` por imóvel, `prazoIndivisao`,
`indivisaoProrrogavel`, `indivisaoAvisoPrazo`. Ver
`06-modelo-composse-rural.md`.
