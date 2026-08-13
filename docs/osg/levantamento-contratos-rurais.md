# Levantamento de campos — parceria e composse rural

> Artefato de aceite da ALE-3. Este documento declara o cadastro necessário e o
> vocabulário do gerador; não implementa cadastro, hook, consulta, rota ou migração.

**Situação em 13/08/2026:** levantamento técnico e mockup produzidos; as duas
conferências humanas (Fiscal e OSG jurídico) já vieram, com nome e data. Falta só
o acordo de nomenclatura com Bernardo para o portão fechar por completo.

## 1. Resultado do levantamento

O cadastro deve representar a **relação de exploração rural**, não o arquivo do
contrato. A recomendação para a próxima sprint é um modelo de **cabeçalho +
detalhes**:

- o cabeçalho é o instrumento: tipo de exploração, referência, datas, vigência,
  partilha de frutos, produção e regras contratuais;
- os detalhes são os imóveis/matrículas do instrumento, cada qual com sua **área
  explorada** e, quando houver, seu instrumento de origem;
- as partes são listas ligadas ao instrumento, com papel e ordem; o compossuidor
  carrega também sua fração interna;
- dados de matrícula, titularidade e qualificação continuam nos cadastros que já
  existem e aparecem somente por seleção/leitura neste formulário.

Isso não é hipótese abstrata. Os instrumentos MMS e Bela Vista têm vários imóveis
no mesmo contrato. **Verificado diretamente nesta revisão** (li o Instrumento de
Composse Rural "Sérgio Pitt e Outros" e o Anexo Único inteiro, assinados em
28/08/2024 — `[BV-COM]`): a composse tem 15 imóveis (alíneas a–o), vindos de **6
instrumentos de origem distintos, com 5 contrapartes diferentes** (Bela Vista
Agropecuária, Agropecuária Mata do Puba, Indústria de Derivados da Mandioca
Santa Cruz, José Alípio Fernandes da Silveira, Conata Agropecuária e José
Hildebrando da Luz), firmados entre 2021 e 2024. Logo, um único registro plano
contendo instrumento, um imóvel, um outorgante e um explorador obrigaria a
duplicar o cabeçalho e não representaria as listas reais.

**Achado novo — os dois contratos coexistem na mesma matrícula por desenho, não
por acaso.** As 6 matrículas do bloco Bela Vista Agropecuária estão, na mesma
data, simultaneamente sob a Parceria (outorgante → outorgados) e sob a Composse
(entre os outorgados) — não é concorrência de dois contratos do mesmo tipo, é o
par Parceria+Composse cobrindo o mesmo imóvel por dois ângulos.

**Confirmado pela OSG (Thiago Santos, 13/08/2026, ver seção 4):** duas Parcerias
do mesmo tipo cobrindo a **integralidade** da mesma matrícula, com os mesmos
outorgados, não podem coexistir — um ato anularia o outro. Mas a OSG confirma um
cenário que nenhum contrato lido até agora exemplifica: duas Parcerias
simultâneas sobre a mesma matrícula são possíveis se cada uma cobrir uma fração
distinta da área/percentual a explorar, com **grupos de outorgados diferentes**.
Isso é diferente do par Parceria+Composse (sempre o mesmo outorgante, os mesmos
outorgados, dois ângulos do mesmo negócio) — é a mesma matrícula genuinamente
dividida entre negócios distintos. Sem exemplo real encontrado.

**Correção desta revisão: isso não exige nenhuma tabela ou coluna nova.** O
modelo de cabeçalho+detalhes já suporta o cenário sem alteração — basta que a
mesma matrícula apareça no detalhe (join imóvel↔instrumento) de dois
cabeçalhos de Parceria diferentes, cada um com sua própria área/percentual e
seu próprio grupo de outorgados. Não é lacuna de schema; é lacuna de **aviso na
tela** — hoje nada mostra ao consultor que a matrícula que ele está
selecionando já está vinculada a outra Parceria ativa. Essa é a única decisão
de v1 que sobra aqui (ver seção 6 e o mockup, aba "Imóvel e áreas").

**Achado novo — um imóvel pode sair da composse sem aditivo.** Parágrafo Único
da Cláusula Quarta do `[BV-COM]`: se a Parceria de origem de um imóvel terminar,
esse imóvel "deixará espontaneamente" de compor a composse, mantendo o contrato
vigente e inalterado para os imóveis restantes, **"não sendo motivo para
rescisão... ou elaboração de aditivos contratuais"**. Isso contradiz, pelo menos
para este caso, a suposição genérica do `[MAP]` de que toda mudança de área gera
Termo Aditivo — o vínculo imóvel↔composse precisa de um estado computado (ainda
vigente / caiu por fim da origem), não só uma lista estática.

### Semânticas que não podem ser misturadas

- `matricula.area_explorada` é a área atualmente digitada no cadastro da matrícula.
  A conversa com a consultora deve decidir se ela é autoridade ou apenas referência
  quando o mesmo imóvel participa de instrumentos diferentes.
- `titularidade.fracao` é fração de propriedade de fato/de direito. Não é a
  distribuição interna da composse.
- `quadro_societario.percentual` é participação societária. Não é partilha de frutos.
- `imovel.percentual`, `imovel.percentualExtenso`, `imovel.remanescente` e as
  condicionais `imovel.fracionado`/`imovel.inteiro` continuam sendo fração do imóvel.
  Não devem receber o percentual da parceria.

## 2. Tabela de campos

Os marcadores marcados como **propostos** ainda dependem do acordo com Bernardo.
Quando o dado já existe em outro cadastro, o formulário apenas o seleciona ou
exibe; não duplica a digitação.

| Grupo | Rótulo na tela | Situação | Tabela e coluna | Tipo | Origem do dado | Quem confere | Marcador do gerador | Pendência |
|---|---|---|---|---|---|---|---|---|
| Instrumento | Referência | existe | `exploracao_rural.referencia` | texto | decisão do consultor | consultora OSG | `exploracao.referencia` (proposto) | Confirmar regra de nomenclatura. |
| Instrumento | Tipo de exploração | existe | `exploracao_rural.tipo_exploracao` | enum `osg_tipo_exploracao` | decisão do consultor | consultora OSG | `exploracao.tipo` (proposto) | Mockup mostra parceria e composse; não ampliar enum nesta sprint. |
| Instrumento | Data da assinatura | existe | `exploracao_rural.data_assinatura` | data | instrumento assinado | consultora OSG | `exploracao.data_assinatura` (proposto) | Nenhuma técnica. |
| Instrumento | Data de encerramento | existe | `exploracao_rural.data_encerramento` | data, opcional | instrumento assinado | consultora OSG | `exploracao.data_encerramento` (proposto) | Confirmar uso quando houver prorrogação automática. |
| Instrumento | Vigência | existe | `exploracao_rural.vigencia` | texto | instrumento assinado | consultora OSG | `exploracao.vigencia` (proposto) | O campo atual é livre; avaliar datas estruturadas na próxima sprint. |
| Instrumento | Vigência prorrogável | novo | sem coluna | booleano | decisão do consultor | consultora OSG | `vigencia_prorrogavel` | Não tratar `vigencia` livre como se já fosse esta flag. |
| Instrumento | Declarado no IRPF | existe | `exploracao_rural.declarado_irpf` | booleano | planilha do cliente / IRPF | consultora OSG | não necessário ao contrato | Confirmar se pertence ao formulário ou apenas ao relatório fiscal. |
| Imóvel e áreas | Imóvel | existe | `exploracao_rural.bem_id` → `bem.id` | relação | cadastro existente | consultora OSG | `imovel.*` | Selecionar; não cadastrar nem redesenhar o imóvel dentro deste formulário. |
| Imóvel e áreas | Matrícula | existe, mas em lugar errado | `exploracao_rural.matricula_texto`; autoridade em `matricula.id`/`.numero` | relação + texto legado | cartório | consultora OSG | `imovel.numero` | Próxima sprint deve preferir FK; não duplicar texto quando houver matrícula cadastrada. |
| Imóvel e áreas | Município / UF | existe, mas em lugar errado | `exploracao_rural.municipio`/`.uf`; autoridade em `matricula.municipio_imovel`/`.uf_imovel` | texto derivado | cartório | consultora OSG | `imovel.municipio` / `imovel.uf` | Exibir da matrícula, sem redigitação. |
| Imóvel e áreas | Área documento | existe | `matricula.area_documento` | decimal + unidade | cartório | consultora OSG | `imovel.area` e derivados já existentes | Exibir da matrícula. `exploracao_rural.area_total` é duplicação a revisar. |
| Imóvel e áreas | Área real | existe | `matricula.area_real` | decimal + unidade | planilha do cliente / medição | consultora OSG | `imovel.area_real` (se o modelo exigir) | Exibir da matrícula; confirmar se entra no contrato. |
| Imóvel e áreas | Área explorada | existe, mas em lugar errado | `matricula.area_explorada` e `exploracao_rural.area_explorada` | decimal + unidade | planilha do cliente | consultora OSG | `exploracao_imovel.area_explorada` (proposto) | Decidir a autoridade e a granularidade: matrícula ou imóvel dentro do instrumento. Achado da OSG (seção 4, pergunta 1): a mesma matrícula pode ter mais de uma Parceria concorrente, cada uma com sua fração de área — reforça que a granularidade certa é por instrumento, não só por matrícula. |
| Imóvel e áreas | Unidade | existe | `matricula.area_unidade` e `exploracao_rural.area_unidade` | enum/texto | cadastro da matrícula | consultora OSG | `imovel.unidade` / `imovel.unidadeExtenso` já existentes | Herdar da matrícula e impedir divergência. |
| Imóvel e áreas | Georreferenciamento | existe | `matricula.georreferenciado` e `.georref_prejudica_transferencia` | enum + booleano | cartório / memorial | consultora OSG | família `qualificacaoImovel` já existente | Confirmar se o texto vem do status cadastrado ou do memorial real no BigQuery. |
| Partes | Outorgante | existe, mas em lugar errado | singleton em `exploracao_rural.outorgante_pessoa_id`/`.outorgante_nome`; qualificação em `pessoa.*` | lista de pessoas | instrumento / cadastro de pessoa | consultora OSG | papel `outorgante` já existe | Contratos reais podem ter N partes; capacidade de lista ad hoc é da subtarefa do Bernardo. |
| Partes | Explorador | existe, mas em lugar errado | singleton em `exploracao_rural.explorador_pessoa_id`/`.explorador_nome`; qualificação em `pessoa.*` | lista de pessoas | instrumento / cadastro de pessoa | consultora OSG | papel `outorgado` já existe | Na UI manter “Explorador”; combinar com Bernardo que ele alimenta o papel `outorgado` do motor. |
| Partes | Qualificação das partes | existe | `pessoa.*`, `pessoa.conjuge_id`, `pessoa.regime_bens`, `parentesco.*` | dados cadastrais | documentos pessoais | consultora OSG | campos dos papéis de pessoa já existentes | Não reescrever cerca de 40 campos no rural; mostrar somente estado da qualificação. |
| Partes | Compossuidor | novo | sem relação N por instrumento | relação N:N ordenada | instrumento | consultora OSG | lista `compossuidores` (proposto) | A lista deve aceitar N pessoas. |
| Partes | Fração do compossuidor | novo | sem coluna; não usar `titularidade.fracao` | decimal 0–100 | instrumento / decisão da consultora | consultora OSG | `compossuidor.fracao` e `.fracaoExtenso` (propostos) | **Resolvido (Thiago Santos/OSG, 13/08/2026):** a base é sempre os frutos do próprio instrumento de composse; a soma dá sempre 100%, sem cobertura parcial — ver seção 4. |
| Partes | Anuente / interveniente / garantidor | novo | sem relação por papel | lista de pessoas | instrumento | consultora OSG | papéis a confirmar com Bernardo | Aparece em Nodari. **Já prototipado no mockup** (seção "Partes", botão "+ Adicionar outra parte" com seletor de papel) para não deixar a tela sem lugar para esse caso; falta fechar com Bernardo os nomes exatos e se persiste no cadastro ou fica só na renderização ad hoc do gerador. |
| Percentual e produção | Percentual do outorgante | novo | sem coluna | decimal 0–100 | estudo fiscal | Fiscal + consultora OSG | `exploracao.percentual_outorgante` e `.percentual_outorgante_extenso` (propostos) | Confirmar entregável, vigência e granularidade. |
| Percentual e produção | Percentual do explorador | novo | sem coluna | decimal 0–100 | estudo fiscal | Fiscal + consultora OSG | `exploracao.percentual_explorador` e `.percentual_explorador_extenso` (propostos) | Não chamar de fração de titularidade; validar soma e arredondamento. |
| Percentual e produção | Vigência do percentual | novo | sem coluna | data inicial; final opcional | estudo fiscal | Fiscal | `exploracao.percentual_vigente_desde` (proposto) | **Resolvido (Thiago Santos/OSG, 13/08/2026):** o percentual pode mudar no meio do prazo da Parceria, sem esperar renovação — e a mudança exige Termo Aditivo assinado. A vigência datada não pode presumir sincronismo com o prazo de 3 anos da Parceria; ver seção 4. |
| Percentual e produção | Remuneração fixa | existe, mas em lugar errado | `exploracao_rural.sacas_por_hectare` | decimal atualmente fixo em sacas/ha | estudo fiscal / instrumento | Fiscal | `exploracao.remuneracao.*` (proposto) | Nodari usa quantidade por período; a coluna atual não comporta unidade e periodicidade livres. |
| Percentual e produção | Culturas/atividades permitidas | **novo — CONFIRMADO em `[BV-COM]`** | sem coluna/lista | lista de textos ou catálogo | decisão do consultor | consultora OSG | lista `culturas`; item `cultura.nome` (propostos) | Cláusula Primeira do `[BV-COM]` lista lavouras (soja, algodão, milho, café, cana, cacau, feijão, outros cereais) **e pecuária** (bovinos, suínos, ovinos, aves) — renomear de "culturas" para "culturas/atividades", o campo é mais largo que só cultivo. `tem_cultura_algodao` continua derivado da lista, não digitado duas vezes. |
| Percentual e produção | Benfeitorias indenizáveis | novo — mapeado no catálogo, **não achado no `[BV-COM]`** | sem coluna | booleano | decisão do consultor | consultora OSG | `benfeitorias_indenizaveis` | Este contrato só fala em manter os bens indivisos, não em indenização de benfeitoria — mas a pasta do cliente tem um modelo à parte chamado `V1_Contrato Modelo Parceria Benfeitorias não [indenizáveis].docx` (não aberto nesta revisão), indício de que é cláusula real de Parceria. Confirmar redação/padrão com a consultora. |
| Percentual e produção | Permite penhor / financiamento | **novo — CONFIRMADO em `[BV-COM]`** | sem coluna | booleano | decisão do consultor | consultora OSG | `permite_penhor` | Cláusulas 14ª a 17ª do `[BV-COM]`: os compossuidores autorizam penhor da produção e dos bens em garantia de financiamento, pelo prazo da obrigação garantida. Confirmado pelo menos para Composse; confirmar se a mesma cláusula aparece nas Parcerias de origem. |
| Documento de origem | Tipo do instrumento de origem | novo | sem coluna | enum: parceria, arrendamento, herança, **outro (uso real, não fallback)** | instrumento de origem | consultora OSG | `tipo_instrumento_origem` | `[BV-COM]` mostra 3 títulos reais diferentes para o que a composse trata como equivalente: "Instrumento Particular de Parceria para Fins de Exploração Agropecuária", "Contrato de Parceria Agrícola e Outras Avenças" e — sem a palavra "parceria" nenhuma vez — "Instrumento Particular de Exploração de Atividade Rural" (3 dos 6 instrumentos de origem usam esse 3º nome). "Outro" não é resíduo raro, é metade dos casos reais vistos até agora. Deve ficar associado ao imóvel/detalhe, não como campo único do cabeçalho. |
| Documento de origem | Instrumento de origem da posse | novo | sem relação | relação opcional com instrumento cadastrado ou documento | instrumento de origem | consultora OSG | `exploracao_imovel.origem.*` (proposto) | **CONFIRMADO com números em `[BV-COM]`**: 15 imóveis (alíneas a–o do Anexo Único), vindos de 6 instrumentos de origem distintos, 5 contrapartes diferentes, firmados entre 2021 e 2024 (a composse em si é de 2024). Cada imóvel tem exatamente 1 origem — a multiplicidade é no conjunto de imóveis do contrato, não em cada imóvel. Achado extra: pelo Parágrafo Único da Cláusula Quarta, quando a Parceria de origem de um imóvel termina, o imóvel sai da composse **sem aditivo** — o vínculo precisa de um estado computado (vigente / caído), não uma lista estática. |
| Documento de origem | Documento comprobatório | existe, mas em lugar errado | `documento_arquivo.*` com vínculos a cliente/bem/matrícula/pessoa | arquivo relacionado | arquivo do cliente | consultora OSG | não renderizar; lastro do dado | Planilha é digitada manualmente; importação fica para sprint futura. |
| Composse | Prazo de indivisão | **novo — CONFIRMADO em `[BV-COM]`** | sem coluna | texto ou intervalo de datas | instrumento | consultora OSG | `composse.prazo_indivisao` (proposto) | Cláusula Quarta: 3 anos, contados da assinatura. Distinto da vigência da(s) parceria(s) de origem, que têm datas próprias e independentes. |
| Composse | Indivisão prorrogável | **novo — CONFIRMADO em `[BV-COM]`** | sem coluna | booleano | instrumento | consultora OSG | `indivisao_prorrogavel` | Cláusula Quarta: renova automaticamente por períodos iguais de 3 anos, salvo pedido escrito de divisão feito por qualquer compossuidor até 3 meses antes do vencimento. Regra de renovação, portanto, já está confirmada — não é mais pendência. |

## 3. Nomes a combinar com Bernardo

Saída proposta para a conversa do dia 1:

1. manter na tela o papel **Explorador**, que é o nome da tabela, e mapear essa
   pessoa para o papel já existente `outorgado` no gerador;
2. manter `outorgante` como já existe;
3. criar a lista `compossuidores`, com os campos numéricos `fracao` e
   `fracaoExtenso` por item;
4. permitir N outorgantes e N exploradores por instrumento através da capacidade
   de partes ad hoc da subtarefa irmã;
5. decidir se `anuente`, `interveniente` e `garantidor` entram já no primeiro
   conjunto de papéis;
6. reservar `exploracao.percentual_outorgante` e
   `exploracao.percentual_explorador` para a partilha de frutos, sem reutilizar
   `imovel.percentual`.

**Conferido com Bernardo:** pendente — convite/contato e horário não disponíveis
neste ambiente. Não considerar os nomes propostos como decisão assinada.

## 4. Conferências obrigatórias

Contratos reais sustentam hipóteses e o desenho do mockup, mas não substituem as
respostas das pessoas responsáveis. Preencher nome, data e resposta literal após
cada conversa.

### Consultora da área / OSG (jurídico) — respondida

**Respondida por mensagem (Google Chat), não por reunião** — as perguntas
ficaram estreitas e fechadas o suficiente que não precisaram de conversa aberta
de 1h30; mensagem escrita cumpriu "conferido com quem, em que dia" igual ou
melhor.

| Pergunta | Evidência encontrada | Resposta | Conferido com | Data |
|---|---|---|---|---|
| Pode haver duas Parcerias do mesmo tipo, vigentes ao mesmo tempo, sobre a mesma matrícula inteira (não o par Parceria+Composse, que já é normal)? | Sem nenhum exemplo positivo em ~10 instrumentos reais (Chiapinotto, MMS, Terra Viva, Bela Vista, Rossato, Zuttion, Nodari). Achados adjacentes: `[VM-ADIT]` mostra conversão de tipo (Parceria→Arrendamento) via aditamento sobre a mesma matrícula, não distrato+novo contrato; `[ZUT-COM]` mostra governança variando por imóvel dentro do mesmo instrumento. | **Não, para cobertura idêntica/integral do imóvel — um ato anularia o outro. Mas sim, se cada Parceria cobrir uma fração distinta da área/percentual a explorar, com grupos de outorgados diferentes.** | Thiago Santos (OSG) | 13/08/2026 |
| Na composse, as frações sempre somam 100% da parcela dos outorgados, ou existe caso de cobertura parcial? | 4 composses reais, 3 famílias, todas somando 100% (`[CHI-COM]` 50/50, `[BV-COM]` 70/15/15, `[ROS-COM]` 25/25/25/25, `[ZUT-COM]` 45/45/5/5) — convergência forte, não é prova. Pesquisa externa (`[EXT-Q2]`) mostra que a doutrina **permite juridicamente** cobertura parcial, mesmo sem caso real achado — muda a pergunta de "existe caso?" para "o sistema deveria suportar mesmo assim?". | **Não há cobertura parcial nos frutos: a soma sempre dá 100% do que cabe àquele instrumento de composse.** Uma composse pode, porém, reunir a exploração de várias Parcerias diferentes — ela é sempre consequência da(s) Parceria(s) de origem, nunca o contrário. | Thiago Santos (OSG) | 13/08/2026 |
| Quando o percentual do Planejamento Tributário muda depois da Parceria já assinada, o contrato precisa de Termo Aditivo pra atualizar, ou o valor é só referência? | Nenhum aditivo real lido (`[TV-ADT]`, `[BV-COM]`) foi motivado por mudança de percentual — só por atualização de partes/matrículas. Sem precedente direto. Esta é mecânica de contrato — por isso foi tirada da pergunta ao Fiscal e redirecionada pra aqui. | **Sim, pode mudar no meio do prazo, contrato ainda vigente — e nesse caso é obrigatório Termo Aditivo assinado expressamente pelas partes.** | Thiago Santos (OSG) | 13/08/2026 |

**Já respondidas, não precisam mais ir na mensagem** (mantidas aqui só como
registro): "área total ou cedida" — os dois, sempre lado a lado, `[CHI-PAR]`,
`[MMS-PAR]`, `[TV-ADT]`, `[BV-COM]`. "Partilha de frutos único ou por safra" —
três padrões reais diferentes já vistos (`[MMS-PAR]` 30/70, `[BV-COM]` 70/15/15,
`[EDP-PT]` 90/10, `[SERIO]`, `[NOD-DP]`) — a pergunta virou decisão de produto
("quais suportar na v1"), não descoberta.

**Patrícia confirmou quem participa:** pendente.

**Respondida via Google Chat (Thiago Santos, OSG), 13/08/2026:**

1. **Duas Parcerias simultâneas na mesma matrícula:** objetivamente não, se
   cobrirem a integralidade do imóvel com os mesmos outorgados — um ato anularia
   o outro. Mas pode existir mais de uma Parceria vigente ao mesmo tempo sobre a
   mesma matrícula se cada uma cobrir uma fração distinta da área/percentual a
   explorar — e isso só faz sentido com grupos de outorgados diferentes.
   **Consequência para o schema:** nenhuma migração nova — o modelo de
   cabeçalho+detalhes já representa isso (a mesma matrícula pode aparecer no
   detalhe de dois cabeçalhos de Parceria diferentes, cada um com sua própria
   área/percentual e outorgados). O que falta é só a tela avisar o consultor
   quando a matrícula que ele está selecionando já está em outra Parceria
   ativa — decisão de UX de v1, não lacuna de schema (ver seção 6, item 11).
   Sem exemplo real encontrado ainda.
2. **Cobertura parcial na composse:** não existe, ao menos na prática da OSG — a
   soma das frações dos compossuidores, relativa aos frutos daquele instrumento
   de composse, sempre dá 100%. Mas Thiago acrescenta uma distinção importante:
   uma composse pode cobrir a exploração de **várias Parcerias diferentes** ao
   mesmo tempo (é exatamente o que `[BV-COM]` mostra, com 6 instrumentos de
   origem numa única composse) — o que soma 100% é sempre a parcela de frutos
   daquele instrumento, nunca a soma bruta das Parcerias de origem. A composse é
   sempre **resultado** da Parceria, nunca o contrário ("a posse advém desta").
3. **Termo Aditivo quando o percentual muda:** sim, pode mudar no meio do prazo
   da Parceria, com o contrato ainda vigente — mas exige, sempre, Termo Aditivo
   assinado expressamente pelas partes. Não é possível atualizar o percentual só
   por referência/registro interno; a cláusula precisa ser alterada formalmente.
   **Consequência para o schema:** a mudança de percentual não pode presumir
   sincronismo com a renovação de 3 anos da Parceria (recomendação anterior deste
   levantamento, seção "Fiscal" abaixo, agora revista) — precisa de vigência
   datada própria, e cada mudança deveria referenciar o Termo Aditivo que a
   formalizou.

Com isso, a conferência jurídica com a OSG está fechada. As duas perguntas já
respondidas antes desta rodada (área total×cedida; partilha único×safra)
continuam como estavam — ver abaixo.

**Achados da 2ª rodada de leitura (Cortezia, Rossato, Zuttion, Potrich, via MCP do
Drive — busca por nome de pasta, sem listar a árvore inteira):**

- **"Composse" e "Condomínio" são usados como sinônimos pela própria banca.** No
  pacote da Rossato, o contrato principal se chama "Instrumento Particular de
  Constituição de Composse Rural Pro Indiviso" e o Anexo Único **do mesmo
  pacote, mesma data, mesmas partes** se chama "Anexo Único do Instrumento
  Particular de Constituição de **Condomínio** Rural Pro Indiviso" — `[ROS-COM]`.
  Risco real para o enum `osg_tipo_exploracao`, que trata `composse` e
  `condominio` como valores distintos: pode estar classificando o mesmo
  conceito jurídico em dois lugares por inconsistência de nomenclatura do
  próprio escritório, não por serem instrumentos diferentes.
- **Percentual de partilha de frutos: mais 5 valores reais, nenhum repetido.**
  `[BV-PAR-MP]` (Mata do Puba) 4%/96%; `[BV-PAR-SC]` (Santa Cruz) 6,10%/93,90%;
  `[BV-PAR-VM]` (Vida Mansa, antes da conversão) 35%/65% líquido do lucro (com
  uma segunda regra, de 80% da produção bruta, para limite de venda/entrega —
  são duas bases de cálculo coexistindo no mesmo contrato, não uma). Reforça
  que percentual é dado por instrumento, nunca um valor fixo do cliente.
- **Cortezia tem décadas de Parceria sem nenhuma Composse** (1996, atualização
  2014, 1º e 2º aditivos 2015, rascunho de 3º aditivo 2019) — evidência de que
  nem todo cliente usa os dois instrumentos; Parceria isolada, com muitos
  aditivos ao longo de décadas, é um padrão real por si só (bate com o padrão
  já visto em `[TV-ADT]`).
- **Potrich ainda não tem Composse assinada** — a pasta agrária está vazia; a
  única referência a "Composse Rural: Delci Potrich 25%, Elisângela 25% e
  Regiane 50%" está numa apresentação de reestruturação de agosto/2026
  (`[POT-PPT]`), como proposta, não como instrumento firmado. Evidência de que
  o levantamento captura tanto o que já existe quanto o que está sendo
  desenhado — não confundir os dois.

### Pesquisa externa (agentes Sonnet, web — `[EXT-Q1]`/`[EXT-Q2]`, 11/08/2026)

Camada complementar, não prova: a OSG pode ter particularidades próprias (nunca
ter tido cliente num cenário específico) sem que isso seja proibição legal. Os
dois agentes buscaram doutrina/jurisprudência/prática de mercado, cada um com
instrução explícita de dizer "não achei nada conclusivo" em vez de inventar.

- **Q1 (duas Parcerias simultâneas na mesma matrícula):** nenhuma lei, doutrina
  ou jurisprudência trata do cenário exato. Indício indireto: o art. 96, §1º da
  Lei 4.504/64 cede o **uso específico** do imóvel — duas parcerias idênticas e
  simultâneas sobre a mesma área para o mesmo fim gerariam decisão de manejo e
  partilha contraditórias entre si. Os casos reais de múltiplos contratos sobre
  o mesmo imóvel que a doutrina cita são sempre de **atividades diferentes ou
  períodos não coincidentes** (ex.: pastoreio de entressafra + lavoura de
  verão), nunca duas parcerias iguais e concorrentes. Sem jurisprudência sobre
  esse conflito — pode ser raridade real, não proibição, o que é compatível
  com o que os ~10 contratos lidos já mostravam. Fontes: direitoagrario.com
  (Albenir Querubini, 15/06/2020), CNA/Jurídico (2025), PMV Advogados
  (07/03/2022), Arone Coutinho Advocacia (19/04/2023).
- **Q2 (composse cobrindo só parte da parcela):** achado mais forte que o
  esperado — a doutrina **não exige** que a soma seja 100% como regra externa;
  o 100% visto nos 4 contratos reais é tautológico (a fração é relativa ao que
  está sendo formalizado *naquele* instrumento). Mais importante: a doutrina
  **reconhece explicitamente** que posse comum (pro indiviso) pode coexistir
  com posse individual não formalizada (pro diviso) sobre outra parte do mesmo
  bem — ou seja, **é juridicamente possível** uma composse cobrir só parte da
  parcela dos outorgados, mesmo sem nenhum caso real disso encontrado ainda.
  Isso muda a pergunta de "vai acontecer?" para "o sistema deveria permitir,
  mesmo sem caso real?" — decisão de produto, não mais lacuna de evidência.
  Achado colateral, relevante para a seção 6, item 9: **"composse" e
  "condomínio" não são sinônimos na doutrina** (composse é posse; condomínio é
  propriedade) — o uso intercambiável achado em `[ROS-COM]` parece
  inconsistência de redação daquele escritório, não confirmação de prática de
  mercado. Suaviza a recomendação de colapsar o enum: juridicamente são
  conceitos diferentes, mesmo aparecendo confundidos na prática de um cliente.
  Fontes: Carlos E. Elias de Oliveira/Cartório Rui Barbosa (20/04/2021),
  Migalhas (29/11/2022), OAB-MT (14/04/2021), ConJur (31/07/2026).

### Fiscal — uma pergunta, saída em três frases

Pergunta: **o percentual da parceria é resultado de qual entregável do estudo, e
quando ele muda?**

**Respondida via Google Chat.**

1. **Quem produz o número:** Mônica Matunaga (Fiscal).
2. **Em qual documento:** **não é a planilha WP** — o WP é uso interno do setor,
   "não vai nem para a OSG". O entregável real é um **relatório/apresentação em
   PDF** (convertido de um pptx depois de apresentado ao cliente). Confirmado
   com documento real: `[EDP-PT]` — "PLANEJAMENTO TRIBUTÁRIO, Grupo EDP, Março
   de 2026" (PSA Consultores, 29 slides, achado em `Downloads\SOPs`), com a
   mesma estrutura que Mônica descreveu — e é o estudo por trás da Composse
   "Delci Potrich e Outros" já achada em `[POT-PPT]` (mesmo cliente, Grupo
   Potrich/EDP).
3. **Frequência de mudança:** o percentual é definido por **no mínimo 3 anos**
   (o prazo do contrato de Parceria) — não é revisão periódica automática; só é
   atualizado **se o cliente solicitar**. Confirmado de duas formas
   independentes: a resposta literal da Mônica, e o próprio `[EDP-PT]`, que
   escopa o estudo para "os exercícios de 2026 a 2028" — exatamente 3 anos.
4. **O que acontece com contrato já assinado quando muda** — essa parte foi
   redirecionada para a OSG (é mecânica de contrato/Termo Aditivo, não algo que
   o Fiscal saiba), pergunta 3 da conferência jurídica abaixo. Ainda pendente.

**Conferido com:** Mônica Matunaga (Fiscal), via Google Chat.
**Data:** [confirmar data exata da conversa]

Achado extra do `[EDP-PT]`: o percentual não é fixo por convenção — achamos
agora um 5º valor real, **90% PF / 10% PJ** (Grupo EDP/Potrich), diferente dos
outros 4 já registrados. E o relatório descreve, quase literalmente, o modelo
Parceria→Composse que este levantamento já tinha concluído: *"a exploração
agrícola poderá se dar em regime de parceria rural entre a pessoa jurídica (que
irá ceder a posse do imóvel) e as pessoas físicas (que irão reunir esforços
entre si através de uma composse rural)"*.

Recomendação a apresentar, sem implementar: gravar vigência datada na linha do
percentual — **atualizada após a resposta da OSG (seção "Consultora da área /
OSG" acima, pergunta 3):** a mudança de percentual não está amarrada ao ciclo de
renovação de 3 anos da Parceria; ela pode ocorrer a qualquer momento, sempre por
Termo Aditivo. Descartar a recomendação anterior de herdar o prazo da Parceria —
a vigência do percentual precisa da sua própria data de início e, quando mudar,
referenciar o Termo Aditivo que formalizou a mudança. Tabela de versões só se o
Fiscal confirmar que o número muda mais de uma vez por projeto — o que a
resposta da Mônica sugere que é raro ("só se solicitado pelo cliente"), mas agora
sabemos que, quando muda, é sempre um evento formal, não uma atualização de
referência.

### Agenda

**Atualizado (13/08/2026):** as duas conferências humanas fecharam por Google
Chat, sem nenhuma reunião — Fiscal (Mônica Matunaga) e jurídico (Thiago Santos,
OSG). Não falta mais nenhuma resposta de conteúdo para o “Pronto quando” da
ALE-3. O único item ainda aberto é o acordo de nomenclatura com Bernardo (seção
3) — incluindo o papel `anuente`/`interveniente`/`garantidor` (achado em Nodari)
e a pergunta de se ele entra no primeiro recorte. O cenário de N Parcerias
concorrentes por matrícula que a resposta da OSG trouxe **não exige nomenclatura
nova nem migração**: o modelo de cabeçalho+detalhes já suporta isso; falta só
decidir se a tela avisa proativamente (ver seção 6, item 11, e o mockup).

## 5. Mockup

Há duas versões, deliberadamente mantidas as duas — não é a substituição de uma
pela outra, é rascunho visual vs. entrega em código real.

### 5.1 Rascunho visual (primeira versão, mantido)

- Arquivo: [`contratos_exploracao/mockup.html`](./contratos_exploracao/mockup.html)
- URL: `http://localhost:8080/docs/osg/contratos_exploracao/mockup.html?abrir=1&tipo=parceria`
  (troque `tipo=parceria` por `tipo=composse` para a variação de composse)
- Natureza: HTML estático, CSS copiado à mão para imitar o visual do OSG Work —
  nenhum componente real importado. Serviu para validar o **conteúdo** dos
  campos (nomes, selos, seções) rápido, antes de qualquer decisão de como
  construir de verdade.
- **Limite reconhecido nesta revisão:** o card da ALE-3 rejeita explicitamente
  ferramentas que geram HTML desconectado do código real (Figma, Stitch),
  citando precedente ruim — "inventa nome de campo e inventa campo que não
  existe, custou três rodadas de correção". Este arquivo é a mesma categoria de
  risco, feito à mão em vez de por IA. Não apagamos porque documenta a
  evolução do levantamento, mas **não é a entrega que o card pede**.

### 5.2 Preview em código real (entrega que o card pede)

- Arquivo HTML de entrada (padrão `sisifo-preview.html`, o único precedente
  real do repositório para "prévia isolada servida pelo Vite"):
  [`contratos-exploracao-preview.html`](../../contratos-exploracao-preview.html)
- Componente montado: [`src/previews/ContratosExploracaoPreview.tsx`](../../src/previews/ContratosExploracaoPreview.tsx)
- URL: `http://localhost:8080/contratos-exploracao-preview.html`
- Componentes reais reaproveitados, não recriados:
  `src/components/equipe/osg/formKit.tsx` (`FieldSection`, `fieldCls`,
  `labelCls`, `switchBoxCls`), `src/lib/osgFormGrid.ts` (`formGridCls`,
  `formSpanCls`, grade travada por `gradeDoFormulario.test.tsx`),
  `OsgDialog.tsx` + `Tabs` (mesma composição de `MatriculaModal.tsx`),
  `Select`/`Input`/`Switch`/`Table`/`Badge` do design system.
- Componentes novos, no mesmo padrão dos existentes (reaproveitáveis pela
  próxima sprint, se aprovado):
  `src/components/equipe/osg/oficina-de-contratos/exploracao-rural/ExploracaoRuralDadosTab.tsx`,
  `ExploracaoRuralImoveisTab.tsx`, `ExploracaoRuralModal.tsx`.
- **Sem hook, sem consulta ao banco, sem rota, sem registro de página
  protegida** — como o card exige. `MatriculaDadosTab.tsx` (o componente que o
  card manda copiar) já é puro/props-driven, sem fetch interno; os três
  componentes novos seguem o mesmo desenho. `matriculas`/`pessoas` chegam como
  fixture (`src/previews/contratosExploracaoModel.ts`), no mesmo formato
  (`MatriculaRow`/`PessoaRow`) que um hook real devolveria — trocar o fixture
  por um hook é o único ajuste que a próxima sprint precisa fazer nesta casca.
- Campos novos (sem coluna hoje) existem só como estado local do componente —
  nenhum é gravado, nenhum tem migração. Selo **existe**/**novo** em cada
  campo, com `Badge` real, não `<span>` estático.
- Validado nesta revisão: `bunx eslint` limpo (0 erros), `bun run typecheck`
  limpo (0 erros no projeto inteiro), servidor Vite local respondendo 200 no
  `.html` e no módulo `.tsx` transformado. **Não validado nesta revisão:**
  clique manual no navegador — sem ferramenta de captura de tela disponível
  nesta sessão para conferir renderização/estilo visualmente; recomenda-se
  abrir a URL acima antes de considerar a peça pronta para a consultora.

O preview segue as seções numeradas do cadastro atual: **Instrumento**, **Imóvel e
áreas**, **Partes**, **Percentual e produção** e **Documento de origem**, mais a
aba **Imóveis e origens**. Campos de matrícula e qualificação são exibidos como
leitura do cadastro já existente (fixture no preview; consulta real na próxima
sprint).

## 6. Migrações candidatas para a próxima sprint

Esta lista é declaração de dependências futuras, não autorização para criar SQL:

1. criar um cabeçalho de instrumento e ligar os registros atuais de
   `exploracao_rural` como detalhes por imóvel, preservando as 25 colunas existentes;
2. adicionar FK de matrícula ao detalhe, mantendo `matricula_texto` apenas como
   legado/fallback;
3. criar lista de partes por instrumento, com papel e ordem, incluindo a fração
   interna do compossuidor;
4. criar partilha de frutos com os dois percentuais e vigência datada — a
   mudança de percentual exige Termo Aditivo e não se sincroniza com a renovação
   de 3 anos da Parceria (confirmado pela OSG, seção 4); a vigência deveria
   referenciar o aditivo que formalizou a mudança;
5. criar culturas permitidas e as flags `benfeitorias_indenizaveis`,
   `vigencia_prorrogavel`, `permite_penhor` e `indivisao_prorrogavel`;
6. representar instrumentos de origem por imóvel/detalhe, permitindo várias origens
   no mesmo contrato;
7. generalizar remuneração fixa somente se o Fiscal confirmar que quantidade,
   unidade e periodicidade devem ser suportadas;
8. criar os marcadores e listas do gerador depois do acordo de nomes com Bernardo;
9. decidir se `composse` e `condominio` continuam dois valores do enum ou se
   colapsam num só — achado da 2ª rodada: o próprio escritório usa os dois
   nomes para o mesmo instrumento dentro de um único pacote assinado (`[ROS-COM]`);
10. avaliar se a regra de governança/administração precisa granularidade por
    imóvel dentro do instrumento (achado real em `[ZUT-COM]`: 2 matrículas têm
    regra de administrador exclusivo, diferente do resto do contrato) — não é
    óbvio que isso entre na v1, mas precisa ser uma decisão, não uma omissão;
11. **não é migração de schema** — decidir se a tela avisa proativamente quando
    a matrícula selecionada já está vinculada a outra Parceria ativa (duas ou
    mais Parcerias simultâneas sobre a mesma matrícula, cada uma com sua fração
    de área/percentual e outorgados diferentes, é juridicamente possível,
    confirmado pela OSG — seção 4, pergunta 1). O modelo de cabeçalho+detalhes
    já suporta o dado sem tabela nova; falta só decidir se o aviso soma
    percentuais/áreas automaticamente ou fica só informativo (protótipo no
    mockup, seção "Imóvel e áreas");
12. criar a lista de papéis extras por instrumento (`anuente`, `interveniente`,
    `garantidor`, N outorgantes/exploradores adicionais) — achado real em
    Nodari. O mockup já prototipa a interação (seção "Partes", botão
    "+ Adicionar outra parte" em ambos os blocos, Parceria e Composse); falta
    fechar com Bernardo os nomes exatos e se o dado fica só na renderização
    ad hoc do gerador (subtarefa dele) ou também precisa de campo persistido no
    cadastro rural.

Não é necessária migração para área documento, área real, área explorada da
matrícula, unidade, georreferenciamento, qualificação de pessoa, cônjuge, regime de
bens, parentesco ou titularidade: esses dados já existem e não devem ser movidos.

## 7. Fontes conferidas

- `docs/osg/catalogo-familias-e-flags.md`, capítulos de Parceria e Composse;
- migração de criação de `exploracao_rural` e `docs/rls/mapa-do-banco.md`;
- aba `MatriculaDadosTab.tsx`, somente como referência visual e de nomenclatura;
- vocabulário e papéis atuais do gerador;
- **2ª rodada de leitura (11/08/2026, via MCP do Google Drive — busca por nome de
  pasta/cliente, sem listar a árvore inteira, sem subagente):**
  - `[ROS-COM]` — Grupo Rossato: "Instrumento Particular de Constituição de
    Composse Rural Pro Indiviso" (Dilceu, Catia, Caroline, Luiz Eduardo — 25%
    cada, 16/01/2024) + seu próprio Anexo Único (11 imóveis, mesma pasta),
    ambos lidos por completo;
  - `[ZUT-COM]` — Grupo Zuttion: "Instrumento Particular de Constituição de
    Composse Rural Pro Indiviso" (Celio 45%, Zirlene 45%, Carolina 5%, Maria
    Gabriela 5%, ~jan/2022), 13 imóveis, lido por completo;
  - `[BV-PAR-MP]`, `[BV-PAR-SC]` — Contratos de Parceria Agrícola do bloco Bela
    Vista com Agropecuária Mata do Puba (17/05/2022, 4%/96%) e Indústria de
    Derivados da Mandioca Santa Cruz (17/05/2022, 6,10%/93,90%), 8 páginas
    lidas de cada;
  - `[VM-ADIT]` — Fazenda Vida Mansa/Arvoredo II (bloco Bela Vista): Parceria
    original de 14/05/2021 entre José Alípio/Ariane e os 3 outorgados, depois
    convertida por "Instrumento Particular de Aditamento de Retificação e
    Ratificação" em Contrato de Arrendamento + Compromisso de Compra e Venda
    sobre os mesmos imóveis;
  - `[COR-PAR]` — Grupo Cortezia: Contrato de Parceria Agrícola 1996 + 1º/2º
    Aditivos (2015) + atualização (2014) + rascunho de 3º aditivo (2019),
    listados, não lidos por completo — nenhuma pasta de Composse existe para
    este cliente;
  - `[POT-PPT]` — Grupo Potrich: apresentação de reestruturação societária
    ("VF_Apresentação Vanir_Potrich_Sucessão_Agosto.2026"), cita uma Composse
    Rural (Delci 25%, Elisângela 25%, Regiane 50%) como parte da estrutura
    **almejada**, não ainda assinada — pasta de Composse do cliente está vazia,
    consistente com isso.
- **3ª rodada — conferência com o Fiscal (Google Chat) + achado documental
  cruzado:**
  - Mônica Matunaga (Fiscal) respondeu por escrito, via Google Chat, à pergunta
    do card sobre o percentual da parceria — ver seção 4 "Fiscal" para a
    resposta completa;
  - `[EDP-PT]` — "PLANEJAMENTO TRIBUTÁRIO, Grupo EDP, Março de 2026" (PSA
    Consultores, relatório/apresentação de 29 slides, `Downloads\SOPs\Grupo
    EDP_Relatório_Planejamento Tributário.pptx`), lido por completo (texto
    extraído de todos os slides). Confirma a resposta da Mônica com documento
    real: entregável é relatório/apresentação, não a planilha WP; escopo de
    exatamente 3 anos (2026-2028); percentual real de 90% PF / 10% PJ. É o
    estudo por trás da Composse "Delci Potrich e Outros" já achada em
    `[POT-PPT]` — mesmo cliente (Grupo Potrich/EDP), duas fontes independentes
    convergindo.
- **4ª rodada — conferência jurídica com a OSG (Google Chat), 13/08/2026:**
  - Thiago Santos (OSG) respondeu por escrito, via Google Chat, às 3 perguntas
    fechadas do card sobre Parceria/Composse — ver seção 4 "Consultora da área /
    OSG" para as respostas completas e as consequências para o schema. Fecha a
    última conferência humana pendente do "Pronto quando" da ALE-3.
- contratos e anexos MMS, Bela Vista e Nodari indicados pelo solicitante — `[BV-COM]`
  (Instrumento de Composse Rural "Sérgio Pitt e Outros" + Anexo Único completo,
  assinados em 28/08/2024, `G:\Drives compartilhados\OSG - Sucessão\Fazenda Bela
  Vista\...\Contrato de Composse\`) lido ponta a ponta nesta revisão, não só
  referenciado;
- SOPs de parceria, composse e revisão, usados como evidência de processo.

### Confirmações técnicas — resolvidas nesta revisão (não dependiam de reunião)

- **`exploracao_rural` vazia em produção:** reconfirmado ao vivo (`select count(*)`)
  nesta mesma sessão — 0 linhas, em qualquer ambiente, para qualquer cliente. Não é
  mais indício pelo fallback do relatório; é contagem direta.
- **Autoridade do georreferenciamento — não é "ou", é "e".** Lido o código:
  `matricula.georreferenciado` (`MatriculaDadosTab.tsx`, seletor `Sim/Não/Parcial/Em
  processo`) é só um **status declarado à mão** no cadastro da matrícula — não carrega
  coordenada nenhuma. O **memorial real** (área/perímetro/sistema de referência/
  certificação SIGEF + vértices em GMS, fiéis ao PDF) mora no BigQuery
  (`psa_osg.georef_cabecalho`/`.georef_detalhe`), é buscado ao vivo por `matricula_id`
  via `useGeorefByMatricula.ts` (endpoint `/api/v1/osg/documentos/georreferenciamento`,
  `404` = matrícula sem georref, não é erro) e convertido em campos do binding
  (`imovel.georefArea`, `.georefPerimetro`, `.georefSistema`, `.georefCertificacao`,
  `.georefDataCertificacao` + lista `{{#vertices}}`) por `mapearGeorefCabecalho`/
  `mapearVertice` em `mapeadores.ts:877-907` — já consumido hoje pelo gerador via a
  `FonteLista` `georef` (`binding.ts:151`).
  **Consequência para esta tarefa: nenhum trabalho novo.** O mecanismo já é genérico
  por `matricula_id`, não por tipo de documento — no dia em que a exploração rural
  ligar-se a uma matrícula real (o combobox da seção 2), ela herda o memorial de
  graça, sem nenhuma tela nova de georreferenciamento nem coluna nova. O campo
  "Georreferenciamento existe" na seção 2 do mockup está correto como está: mostra o
  status (leitura), o memorial entra sozinho na hora de gerar o documento.
