# Campos — Parceria e Composse rural

Detalhe completo, fontes e conferências em [`levantamento-contratos-rurais.md`](./levantamento-contratos-rurais.md).

## 1. Campos que já existem em outro cadastro (reaproveitáveis)

Já têm tela própria, correta, em outro módulo da OSG Work — o cadastro de
exploração rural só seleciona/lê por FK, não redigita.

| Campo | Tabela.coluna | Módulo / Tela / Modal | Observação |
|---|---|---|---|
| Qualificação do outorgante / explorador / compossuidor (nome, CPF/CNPJ, endereço etc.) | `pessoa.*` | Qualificação das Partes → Modal de Pessoa, aba Dados | Selecionar por FK. |
| Vínculo familiar / cônjuge / regime de bens | `parentesco.*`, `pessoa.conjuge_id`, `.regime_bens` | Qualificação das Partes → Modal de Pessoa, aba Dados (painel de Parentesco) | Leitura; não entra no formulário de exploração. |
| Identificação da matrícula (número, cartório, livro, folha, data) | `matricula.numero/.cartorio_id/.livro/.folha/.data_matricula` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Selecionar por FK. |
| Localização do imóvel (Município/UF) | `matricula.municipio_imovel/.uf_imovel` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura. |
| Áreas do imóvel (documento, real, unidade) | `matricula.area_documento/.area_real/.area_unidade` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura. |
| Área explorada | `matricula.area_explorada` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | ⚠ Grão errado: hoje é 1 valor por matrícula; Parceria/Composse precisa de 1 valor por instrumento × imóvel (a mesma matrícula pode estar em mais de uma Parceria ao mesmo tempo). |
| Georreferenciamento (status) | `matricula.georreferenciado/.georref_prejudica_transferencia` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura; memorial real vem do BigQuery — já resolvido, sem trabalho novo. |
| Documento comprobatório / estudo fiscal (arquivo) | `documento_arquivo.*` | Documentos do Cliente (também embutido como aba Documentos nos modais) | Selecionar arquivo já classificado; sem importação nova. |
| Administradores do outorgante (quando PJ) | `administracao.pj_pessoa_id/.administrador_pessoa_id/.cargo` | Qualificação das Partes → Modal de Pessoa Jurídica, aba Administração | Confirmado via schema (19/08/2026). Já lido no preview (`administracaoFixture`); antes o mockup assumia "sem campo". |
| Proprietário registrado do imóvel | `titularidade.matricula_id/.titular_pessoa_id/.fracao` | Diagnóstico Patrimonial → Modal de Matrícula, aba Titularidade | Confirmado via schema (19/08/2026). Distinto do outorgante/explorador — é o dono patrimonial, pode ser outra pessoa. Já lido no preview (`titularidadeFixture`). |
| Cartório de registro do imóvel | `cartorio.nome_completo/.comarca/.uf`, via `matricula.cartorio_id` | Diagnóstico Patrimonial → cadastro de Cartório | Confirmado via schema (19/08/2026). Já lido no preview (`cartoriosFixture`). |
| **Nome do imóvel** | `bem.denominacao`, via `matricula.bem_id` | Diagnóstico Patrimonial → Modal de Bem | É o "denominado **Fazenda X**" da Cláusula Primeira dos dois modelos. Não é campo da matrícula nem texto livre. No dev, 23/23 matrículas têm `bem_id` preenchido. Passou a ser lido no preview em 19/08/2026 (`bensFixture`). |
| **Limites e confrontações** | `matricula.confrontacoes_texto` | Diagnóstico Patrimonial → Modal de Matrícula | A Cláusula Primeira promete "com seus limites e confrontações dispostos no ANEXO ÚNICO" — o texto existe e nunca era lido. 23/23 preenchidos no dev. Lido no preview desde 19/08/2026. |
| **Capital social do outorgante (PJ)** | `v_quadro_societario.vlr_total` (Σ por `empresa_pessoa_id`) | Quadro Societário | **Corrigido em 19/08/2026:** estava listado como "sem coluna". A view existe e devolve o valor (ex.: R$ 9.541.796 num cliente real do dev). O preview passou a exibir derivado; o campo digitável sobrou só para PJ sem quadro cadastrado. |

## 2. Campos que precisam ser criados

Inclui colunas que **já existem** em `exploracao_rural` mas não têm nenhuma
tela que grave nelas hoje (0 linhas em produção) — contam como "novo" na
prática, porque não há front-end funcionando.

| Campo | Tipo de dado | Tabela/coluna (se já existe) | O que salva |
|---|---|---|---|
| ~~Referência do instrumento~~ | texto | `exploracao_rural.referencia` (existe, sem tela) | **Removido do mockup em 19/08/2026:** identificador interno, não aparece em nenhum dos dois modelos de contrato — a tela numera sozinha (ER 01, ER 02…). |
| Tipo de exploração | enum | `exploracao_rural.tipo_exploracao` (existe, sem tela) | Se é Parceria, Composse, Arrendamento etc. |
| Data de assinatura / encerramento | data | `exploracao_rural.data_assinatura/.data_encerramento` (existe, sem tela) | Datas do instrumento. |
| ~~Vigência (texto)~~ | texto | `exploracao_rural.vigencia` (existe, sem tela) | **Removido do mockup em 19/08/2026:** coluna legada duplicando `data_assinatura`/`data_encerramento`. A migração deve apagar a legada e manter as duas datas. |
| Vigência prorrogável | booleano | sem coluna | Se a Parceria renova sozinha ao vencer. |
| ~~Prazo de renovação~~ | texto | sem coluna | **Removido do mockup em 20/08/2026:** nenhum contrato real lido tem essa cláusula escrita por extenso — a redação do Parágrafo Segundo é fixa (vira prazo indeterminado). Sem lastro, tirado. |
| Declarado no IRPF | booleano | `exploracao_rural.declarado_irpf` (existe, sem tela) | Se consta na declaração do cliente. |
| Sacas por hectare | decimal | `exploracao_rural.sacas_por_hectare` (existe, sem tela) | Remuneração em quantidade fixa, não em percentual. **Não alimenta o contrato** (19/08/2026): nenhum dos dois modelos da banca tem cláusula de quantidade fixa, então o caso `[NOD-DP]` não é gerável hoje; quem consome a coluna é o `FiscalReport` (coluna "Sacas/ha"). **Mantido de propósito** — diferente de `declarado_irpf`, este descreve a remuneração do negócio, e tirá-lo esconderia a lacuna do modelo. Fora de escopo, confirmado em reunião: contrato de trading com preço em dólar/saca não se aplica (quem faz é a trading). |
| Exploradores (vínculo) | relação N:N com pessoa | `exploracao_rural.explorador_pessoa_id` (existe, mas só 1) | **Confirmado em reunião de validação (19/08):** vira lista — contrato real (`[BV-PAR]`) tem 3 outorgados numa parceria só. Sem fração individual; o percentual de cada um só existe na Composse. Outorgante continua único (não vira lista) — confirmado na mesma reunião. |
| Imóvel vinculado ao instrumento | relação N:N com matrícula | sem coluna (`exploracao_rural.bem_id` é singular) | Um instrumento pode cobrir várias matrículas — hoje só cabe 1. |
| Compossuidores | relação N:N com pessoa | sem coluna | Quem divide a posse na Composse. |
| Fração do compossuidor | decimal (0–100) | sem coluna | Fatia de cada um nos frutos; soma sempre 100%. |
| ~~Partes extras (anuente/interveniente/garantidor)~~ | relação N:N com pessoa + papel (texto) | sem coluna | **Descartado em 19/08/2026.** A procedência estava errada aqui: não era "achado real em contrato" — a fonte é uma célula da aba "CONTRATOS AGRÍCOLAS" da planilha `[NOD-DP]`. Grep nos 5 contratos reais transcritos: **zero ocorrências** dos três papéis. Na reunião de validação a consultora descartou ("não precisaria, a gente não tá colocando mais"). O que existe em contrato é a cláusula "DA ANUÊNCIA" (`[BV-PAR]`, 14ª) — a outorgante autorizando penhor, já coberta pela flag `permite_penhor`. Removido do preview; volta se aparecer contrato que use. |
| Percentual do outorgante | decimal (0–100) | sem coluna | Fatia da partilha de frutos de quem cede a terra. |
| Percentual do explorador | decimal (0–100) | sem coluna | Fatia de quem explora. |
| ~~Vigência do percentual~~ | data | sem coluna | **Removido em 19/08/2026.** Não veio de contrato: veio da resposta do Thiago (13/08) de que mudança de percentual exige Termo Aditivo. Não aparece em nenhum dos modelos — é metadado de histórico, e aditivo não é o contrato padrão. |
| ~~Termo Aditivo de referência~~ | texto | sem coluna | **Removido em 19/08/2026,** mesmo motivo do anterior: é a entidade aditivo (`documento_anterior_id`/`documento_raiz_id` no motor, com o Bernardo), fora da ALE-3. |
| Culturas/atividades permitidas | lista de texto | sem coluna | O que pode ser plantado/criado na área. |
| ~~Benfeitorias indenizáveis~~ | booleano | sem coluna | **Removido do mockup em 19/08/2026 — o lado `true` não tem lastro.** A regra legal é indenizar (art. 13, VI, do Dec. 59.566/66, para benfeitorias necessárias e úteis feitas com consentimento), e o contrato da banca justamente renuncia a ela: todos os modelos e cópias por cliente no Drive são "Benfeitorias **não** indenizáveis" — modelo padrão, variante com ciclo completo, Santa Terezinha, Novo Campo, Grupo São Francisco, Agrícola Terra Santa, Anjo da Guarda, Santa Barbara, Família Webber. Nenhum "com indenizáveis". A indenização, quando ocorre, é **instrumento apartado** — o próprio modelo diz "salvo se as partes pactuarem em instrumento apartado", e existem contratos de "Compra e Venda de Benfeitorias" (Richart, Fazenda Pedras II/III e V, Avila, "Edmilson com benfeitorias - quitar PF"). Único registro na parceria transcrita (`[BV-PAR]`): não indenizável. O parágrafo da Cláusula Décima virou texto fixo no modelo `05-`; a indenização, quando ocorre, é outro tipo de instrumento. Volta se a consultora apontar contrato de parceria que indenize. |
| Permite penhor/financiamento | booleano | sem coluna | Se produção/bens podem virar garantia. |
| Prazo de indivisão | **número + unidade** | sem coluna | Por quanto tempo os compossuidores não podem dividir o imóvel. **Estruturado em 19/08/2026** (era texto livre): a composse nova do Franciosi ficou com "prazo de 10 anos… renovando-se o prazo de 3 anos", porque o "3" sobrou do template oficial. |
| Indivisão prorrogável | booleano | sem coluna | Se esse prazo renova sozinho. |
| Aviso prévio para não renovar | **número + unidade** | sem coluna | Prazo pra avisar que quer sair, antes do vencimento. Estruturado junto com o prazo de indivisão. |
| Regra de administração (Composse) | enum: maioria dos percentuais / administradores nomeados + lista de pessoas | sem coluna | Achado ao escrever o modelo de contrato: `[BV-COM]` usa maioria; `[ROS-COM]` nomeia 2 pessoas fixas. Sem regra padrão única entre os exemplos. |
| Periodicidade de liquidação de haveres (Composse) | enum: mensal/anual + número de parcelas | sem coluna | Achado ao escrever o modelo de contrato: `[BV-COM]` usa 60 parcelas mensais; `[ROS-COM]` usa 10 parcelas anuais. |
| Tipo do instrumento de origem (por imóvel) | enum: Parceria / Arrendamento / Exploração própria / Herança / Outro | sem coluna | De que tipo de contrato anterior aquele imóvel específico veio. Só existe na Composse. |
| Instrumento de origem (por imóvel) | relação opcional com outro instrumento | sem coluna | Qual contrato anterior deu a posse daquele imóvel — varia por imóvel numa mesma Composse. |
| Foro (comarca/UF) | texto + UF | sem coluna | Onde as partes elegem resolver conflitos. Confirmado: procurei em todo o schema, não existe em lugar nenhum. Já é campo editável no preview. |
| Testemunhas (2) | nome + **CPF + RG**, × 2 | sem coluna | Nenhuma tabela de testemunha existe no banco. **Corrigido em 19/08/2026:** o bloco de assinatura dos dois templates oficiais da banca pede os três, não só o nome. |
| Número de vias assinadas | número | sem coluna | A cláusula de encerramento cita o número e ele varia: `[BV-PAR]` 4 vias, `[BV-COM]` 3 vias. Achado em 19/08/2026; campo editável no preview. |
| **Origem fora do sistema (por imóvel)** | título do instrumento (texto) + data + outorgante da origem (nome, CPF/CNPJ, município, UF, **NIRE, capital social na data da assinatura, administradores**) | sem coluna | **Bloqueio para gerar Composse, achado em 19/08/2026:** o "Considerando V" cita, por grupo de imóveis, o título/data/outorgante da origem. No `[BV-COM]`, **5 das 6 origens são contratos com terceiros que não são clientes da PSA** — não existem como `exploracao_rural` nem como `pessoa`, então não havia o que selecionar. Campos editáveis no preview desde 19/08/2026 (`OrigemExternaDraft`), usados quando a origem não é instrumento cadastrado. **NIRE, capital social e administradores** entraram na mesma data por exigência literal do template oficial ("qualificação completa da empresa, que deverá conter o NIRE e o capital social na data da assinatura, bem como dos administradores") — e o capital é o **da data da origem**, valor histórico, que não sai de `v_quadro_societario`. |
| ~~Capital social do outorgante (PJ)~~ | — | — | Movido para a tabela 1: **é derivável** de `v_quadro_societario`. Ver linha correspondente acima. |
