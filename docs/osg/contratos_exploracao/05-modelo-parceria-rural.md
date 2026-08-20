# Modelo — Instrumento Particular de Parceria Rural

Modelo replicável — insumo para cadastrar os blocos e as flags no gerador da
Oficina de Contratos, e mapa de variáveis do cadastro de exploração rural.

**Fonte da redação (revisão de 19/08/2026):** o **template oficial da banca**,
`VF_Contrato Modelo Parceria Benfeitorias não indenizaveis_Com cláusula do Ciclo
Completo.docx` (Google Drive, id `1g9vN7avGEBdOALJ9N7adjj8GjFnzFzVR`). A primeira
versão deste arquivo foi reconstruída cláusula a cláusula sobre o contrato assinado
`docs/notebooklm/exemplo-02-parceria-bela-vista.md` (Bela Vista Agropecuária,
28/08/2024), porque ninguém sabia que existia template oficial. Agora que ele foi
localizado, **a redação fixa é a dele**; o contrato assinado continua como conferência
de que o template é o que de fato se assina. Onde os dois divergem, está anotado.

Existe também `VF_Modelo Anexo Único_Parceria.docx` (id
`1oQyVvkuxNnFe4jR41o4i_U-X75GGRixS`) — só o cabeçalho do Anexo, com a tabela de
imóveis; ver o Anexo no fim de `06-modelo-composse-rural.md`, que é compartilhado.

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

## INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO {{naturezaExploracao}}

*(O template oficial escreve "AGROPECUÁRIA **[AGRÍCOLA]**" no título, no caput da
Cláusula Segunda e no título do capítulo de atividades — é uma flag que troca a palavra
nos três lugares, conforme a exploração seja agropecuária ou apenas agrícola. Valor
padrão: AGROPECUÁRIA.)*

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

Todos os imóveis são de propriedade de {{imovel.proprietario}}, registrados no
Cartório do Registro de Imóveis e Hipotecas de {{imovel.cartorio.comarca}}/{{imovel.cartorio.uf}}.

*(**Corrigido em 19/08/2026:** a versão anterior deste modelo derivava proprietário e
cartório do outorgante, o que é atalho errado — o cadastro lê os dois por imóvel,
`titularidade` e `cartorio` via `matricula.cartorio_id`. O template oficial não resolve
isso: ele traz apenas a instrução "[qualificação padrão dos imóveis rurais **SEM OS
LIMITES E CONFRONTAÇÕES**, que constarão no anexo]". Se os imóveis tiverem proprietários
diferentes, listar por alínea — ver `docs/notebooklm/exemplo-05-anexo-imoveis-bela-vista.md`,
com 5 proprietários num só instrumento.)*

### DA VIGÊNCIA

**Cláusula Segunda.** A presente parceria rural para fins de exploração
{{naturezaExploracao}} tem vigência a contar da data da assinatura deste instrumento e
findará em {{dataEncerramento}} *(o template oficial anota a regra legal: prazo final
**não inferior a 3 anos**)*.

*Parágrafo Primeiro:* Não havendo renovação nos termos da Cláusula Nona, ao
término da vigência, os PARCEIROS OUTORGADOS deverão devolver à PARCEIRA
OUTORGANTE, independentemente de notificação, os imóveis rurais objetos desta
parceria.

[[BLOCO: vigenciaProrrogavel == true]]
*Parágrafo Segundo:* Ultrapassando o contrato a data prevista no caput desta cláusula, o
contrato passará a ser por tempo indeterminado, podendo a PARCEIRA OUTORGANTE rescindi-lo
a qualquer tempo. Neste caso, deverá notificar por escrito os PARCEIROS OUTORGADOS, os
quais deverão sair dos imóveis objetos desta parceria dentro do prazo de 30 (trinta) dias
a contar do recebimento da referida notificação se inexistir produto pendente de colheita;
ou, se pendente a colheita, 30 (trinta) dias após a sua realização.
[[FIM BLOCO]]

*(**Pendência resolvida em 19/08/2026:** este parágrafo estava como texto livre
(`{{prazoRenovacaoVigencia}}`) porque nenhum contrato assinado lido trazia a cláusula. O
template oficial traz, e com redação fechada — é a de cima. O campo livre deixa de ser
necessário para a redação; só continua útil se a consultora quiser uma regra diferente da
padrão.)*

### DAS ATIVIDADES {{naturezaExploracaoPlural}}

**Cláusula Terceira.** Os PARCEIROS OUTORGADOS poderão explorar nas áreas objeto deste
instrumento de parceria lavouras de {{culturas}} ou outra cultura legalmente permitida
que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso da terra quantas
vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou
despesa adicional. Em se tratando da exploração pecuária ou de animais, poderão fazer uso
das terras para cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves; ou
outros animais, da maneira que lhes convier, obedecendo os limites deste contrato.

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

[[BLOCO: exploração inclui pecuária de cria]]
*Parágrafo:* Considerar-se-á como "frutos" da pecuária, no caso de **cria**, os bezerros
nascidos do rebanho de fêmeas, sendo a parcela da PARCEIRA OUTORGANTE entregue através da
cessão de animais em quantidade proporcional aos frutos.
[[FIM BLOCO]]

[[BLOCO: exploração inclui recria/engorda]]
*Parágrafo:* Considerar-se-á como "frutos" da pecuária, no caso de **recria e engorda**, o
ganho de peso (kg) dos animais, apurado pela diferença entre o peso de aquisição e o peso
na alienação; animais já existentes nas áreas são pesados em até 30 (trinta) dias da
assinatura, valendo esse como "peso inicial". A parcela da PARCEIRA OUTORGANTE é entregue
via cessão de animais com peso proporcional.
[[FIM BLOCO]]

[[BLOCO: exploração é de ciclo completo]]
*Parágrafo:* Considerar-se-á como "frutos" da pecuária, no caso do **ciclo completo**, o
peso (kg) adquirido pelos animais nos imóveis objeto desta parceria a cada 12 (doze) meses
contados da assinatura, utilizando-se como parâmetro as notas fiscais de venda e/ou
eventuais controles internos dos PARCEIROS OUTORGADOS.
[[FIM BLOCO]]

*(**Achado de 19/08/2026:** o template oficial tem os três parágrafos, e o próprio nome do
arquivo distingue a variante "Com cláusula do Ciclo Completo" — ou seja, a banca resolve
isso trocando de arquivo de modelo. No gerador é uma **família de blocos com variante**
(`tmpl_bloco.familia_id` + `variante_seletor`), não campo de cadastro. O `[BV-PAR]`
assinado tem cria e recria/engorda; ciclo completo só aparece no template.)*

*Parágrafo:* Os frutos da pecuária poderão ser calculados e distribuídos por exercício
fiscal ou por período inferior, desde que as partes decidam em conjunto.

*Parágrafo:* Inadimplemento na entrega dos frutos gera mora automática, com atualização
pelo INPC, multa de 10% e juros de 1% ao mês, considerando-se como "valor" os preços
apurados pelo {{indicePrecoReferencia}} na praça do foro deste contrato *(texto fixo do
template: **IMEA**; o `[BV-PAR]` assinado usa **IAGRO** — varia por praça, não é campo do
cadastro)*.

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

*Parágrafo Segundo:* Todas as benfeitorias realizadas pelos PARCEIROS OUTORGADOS, sejam
elas úteis ou voluptuárias, serão incorporadas aos imóveis, **não incidindo sobre elas
qualquer tipo de indenização**, salvo se as partes pactuarem em instrumento apartado
condição diferente desta.

*(**Deixou de ser bloco condicional em 19/08/2026 — é texto fixo.** A flag
`benfeitorias_indenizaveis` não tem lado positivo: **todos** os modelos e cópias por
cliente no Drive são "Benfeitorias **não** indenizáveis" (modelo padrão, variante de ciclo
completo, Santa Terezinha, Novo Campo, Grupo São Francisco, Agrícola Terra Santa, Anjo da
Guarda, Santa Barbara, Família Webber), e o único contrato transcrito com a cláusula
(`[BV-PAR]`) também. A regra legal é o contrário — o art. 13, VI, do Decreto 59.566/66 dá
direito a indenização pelas necessárias e úteis feitas com consentimento —, e é justamente
dela que este parágrafo renuncia. Quando há pagamento por benfeitoria, é **outro
instrumento**: existem contratos de "Compra e Venda de Benfeitorias" (Richart, Fazenda
Pedras II/III e V, Cessão de posse e benfeitorias Avila). O campo saiu do cadastro.)*

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

*Parágrafo Segundo:* A PARCEIRA OUTORGANTE autoriza os PARCEIROS OUTORGADOS a destinar,
prioritariamente, sob renúncia plena de todos os direitos, os frutos oriundos da
exploração desta parceria para liquidação dos débitos contraídos por eles e que tenham
relação direta com os imóveis, as culturas e/ou os animais explorados.

*Parágrafo Terceiro:* A PARCEIRA OUTORGANTE declara ciência do direito das instituições
privadas — bancárias, comerciais, industriais e financeiras — de fiscalizar os imóveis
cedidos, e concorda que os bens vinculados ali permaneçam até a liquidação final das
dívidas, mesmo em caso de alienação do imóvel.
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

**Cláusula Décima Nona.** A relação estabelecida pelo presente contrato autoriza a
abertura das respectivas inscrições estaduais pelas partes.

### DO FORO

**Cláusula Vigésima.** Para dirimir quaisquer controvérsias oriundas deste instrumento,
as partes elegem o foro da comarca de {{foroComarca}}, Estado de {{foroUf}}, renunciando
expressamente a qualquer outro, por mais privilegiado que seja.

Por estarem assim justos e contratados, firmam o presente instrumento em
{{numeroVias}} vias de igual teor e forma, juntamente com 2 (duas) testemunhas.

{{foroComarca}}/{{foroUf}}, {{dataAssinatura}}.

{{outorgante.denominacao}} — Parceira Outorgante

[[REPETIR para cada explorador em exploradores]]{{explorador.nome}}[[FIM REPETIR]]
— Parceiros Outorgados

Testemunhas:
[[REPETIR para cada testemunha em testemunhas]]
{{testemunha.nome}} — CPF: {{testemunha.cpf}} — RG: {{testemunha.rg}}
[[FIM REPETIR]]

*(**Corrigido em 19/08/2026, contra o template oficial:** (1) o foro é campo próprio,
não o município do outorgante — era atalho errado da versão anterior; (2) entrou a
Cláusula Décima Nona das inscrições estaduais, que existe no template e no `[BV-PAR]`, e
o foro virou a Vigésima; (3) o número de vias é variável — o template de Parceria usa
**4**, o de Composse **3**; (4) testemunha pede **nome, CPF e RG**, não só nome.)*

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
| ~~`benfeitoriasIndenizaveis`~~ | **removido do cadastro** | Sem lado positivo em ~10 modelos e no contrato transcrito; virou texto fixo. Indenização é instrumento apartado |
| `permitePenhor` | idem | `[BV-PAR]`, cláusula da anuência |
| `naturezaExploracao` / `naturezaExploracaoPlural` | `ExploracaoRuralDraft.incluiPecuaria` (boolean; campo "Inclui pecuária?") — **resolvido em 20/08/2026** | Template oficial: "AGROPECUÁRIA **[AGRÍCOLA]**" no título, na vigência e no capítulo de atividades |
| `foroComarca` / `foroUf` | `ExploracaoRuralDraft` | Template oficial tem placeholder próprio de foro |
| `numeroVias` | `ExploracaoRuralDraft` | Template de Parceria: 4 vias |
| `testemunhas[].nome/.cpf/.rg` | **só nome hoje** — CPF e RG propostos | Bloco de assinatura do template pede os três |
| `imovel.proprietario` / `imovel.cartorio.*` | lidos de `titularidade` e `cartorio` | Corrigido: não derivar do outorgante |
| `indicePrecoReferencia` | **não é campo** | Texto fixo do template (IMEA); `[BV-PAR]` usa IAGRO — varia por praça |
| modalidade pecuária (cria / recria-engorda / ciclo completo) | **não é campo** | Variante de bloco no gerador; a banca troca de arquivo de modelo |

Campos do levantamento que **não aparecem** neste modelo por serem
exclusivos da Composse (confirmado em reunião de validação, 19/08/2026):
`tipoInstrumentoOrigem`/`instrumentoOrigemRef` por imóvel, `prazoIndivisao`,
`indivisaoProrrogavel`, `indivisaoAvisoPrazo`. Ver
`06-modelo-composse-rural.md`.
