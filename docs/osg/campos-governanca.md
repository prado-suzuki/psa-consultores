# Campos dos documentos de governança

Levantamento dos campos que o cadastro de governança precisa sustentar, enumerados **a
partir dos documentos reais de cliente**, não do que os procedimentos internos dizem que
deveria existir. É o insumo da tela de cadastro de governança.

> Status: **documentação de design**. Nada aqui é migration ou schema final. Mesmo método e
> mesmo vocabulário de [`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md).

## Como ler

- **Campo**: o dado que precisa ser guardado, com o nome que o documento usa.
- **Tipo**: texto, número, moeda, data, booleano, enum, ou *grade* quando o campo só existe
  no cruzamento de dois eixos.
- **Origem**: de onde o valor vem.
  - `cadastro-existente` — já está no banco hoje, é só ler.
  - `cadastro-novo` — não existe em lugar nenhum, precisa ser criado.
  - `manual-projeto` — decisão do trabalho de governança, não é fato de cadastro.
  - `derivada-computada` — sai de contagem ou consulta sobre o que já existe.
  - `enum` — conjunto fechado de valores, listado na própria linha.
- **Consumido por**: em quais documentos aquele campo aparece. É o que mostra o que vale a
  pena cadastrar uma vez e reusar.

## Panorama

**Sete processos, seis documentos.** O Diagnóstico de Governança, o Questionário de
Governança e a Matriz de Alçadas são **o mesmo artefato com três nomes** (confirmado pela
consultoria em 13/08/2026). A pasta `01_Diagnostico_de_Governanca` estar vazia não é lacuna:
o produto daquele processo é arquivado como Matriz.

Os sete processos e onde cada um declara seus campos:

| # | Processo (pasta no Drive) | Documento que produz | Seção | Evidência usada |
|---|---|---|---|---|
| 1 | `01_Diagnostico_de_Governanca` | **é a Matriz de Alçadas** | §1 | pasta vazia; o produto é arquivado como Matriz |
| 2 | `02_Acordo_de_Quotistas` | Acordo de Quotistas | §3 | estrutura completa da Bela Vista + regras de redação do escritório |
| 3 | `03_Protocolo_de_Remuneracao` | Protocolo de Remuneração | §2 | formulário em branco + 2 entregues (Brunetta, Potrich) |
| 4 | `04_Matriz_de_Alcadas` | Matriz de Alçadas | §1 | modelo VF lido por inteiro + 4 matrizes reais (EVMT, EDP, Bigolin, VF) |
| 5 | `05_Regimento_Interno_do_Conselho` | Regimento Interno | §4 | exemplo real do Grupo Morena |
| 6 | `06_AC_Reflexo_Governanca_Participacoes` | AC Reflexo | §5 | exemplo real do Perci Smaniotto |
| 7 | `07_Instalacao_Conselho_Diretoria` | Ata de Eleição + Termo de Posse | §6 | Bela Vista e Delfino |

**Os sete estão cobertos.** São seis seções de campos porque o processo 1 e o processo 4
produzem o mesmo artefato. O Diagnóstico não é lacuna: é a Matriz sob outro nome.

**Nome único, decidido em 13/08/2026: `Matriz de Alçadas`.** Tudo que os procedimentos e as
pastas chamam de Diagnóstico de Governança ou Questionário de Governança passa a se chamar
Matriz de Alçadas, no cadastro e na tela. Os outros dois nomes ficam registrados aqui apenas
como sinônimos de origem, para quem for procurar o material no Drive.

**A Matriz é o documento-eixo.** Ela referencia o Protocolo de Remuneração, a eleição e a
destituição do Conselho e do Diretor, a distribuição mínima do contrato social e a remuneração
global dos conselheiros. Amarra quatro dos seis, e agora também é o instrumento do
diagnóstico, ou seja, a primeira tela do fluxo.

---

## 1. Matriz de Alçadas

Grade de autoridade. Linhas são atividades, colunas são órgãos, e a célula diz **qual o papel
daquele órgão naquela decisão**. O modelo da PSA não traz nenhum valor em reais: as 155
células numéricas são índice de texto. Os limites em R$ aparecem só nos exemplos de cliente.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 1 | Atividade | enum (catálogo de ~20) | `cadastro-novo` | Matriz |
| 2 | Órgão deliberativo | enum | `cadastro-novo`, derivado da estrutura do cliente | Matriz, Protocolo, Acordo, Regimento |
| 3 | Papel na decisão | enum (14 valores) | `manual-projeto` | Matriz |
| 4 | Limite em R$ da alçada | moeda, opcional | `manual-projeto` | Matriz, Protocolo |
| 5 | Data de referência da matriz | data | `manual-projeto` | Matriz |

**Catálogo de atividades (as ~20 linhas do modelo VF):** distribuição de lucros; alienação de
participações; aumento de capital, fusão, cisão e incorporação; atos estranhos à atividade;
expansão com imóveis rurais; alienação e oneração de imóveis; emissão de garantias (aval,
fiança, penhor, CPR); salário de admissão e promoções; contratação e desligamento; remuneração
variável (bônus e PPR); prestadores; operações de crédito; aquisição de insumos; limites de
investimento fixo; orçamento; eleger administradores em controladas; planejamento estratégico;
políticas e normas; representação legal; procuração; plano safra.

**Vocabulário fechado do papel na decisão, 14 valores:** delibera · aprova · autoriza ·
submete à aprovação · sugere · indica · propõe · analisa · consolida · executa · implementa ·
garante · fornece informações · não participa.

**Órgãos no modelo VF:** Reunião de Sócios · Conselho de Administração · Diretor Executivo ·
Gerentes corporativos. **O conjunto não é arbitrário nem livre:** as regras de redação do
Acordo de Quotistas descrevem a mesma estrutura como uma **cascata** (Conselho de
Administração se instalado; Diretoria formal se instituída; administradores do contrato social
na ausência dos anteriores). A leitura mais provável é que os órgãos sejam **derivados da
estrutura que o cliente tem**, e não escolhidos livremente. Falta confirmar com a consultoria.

---

## 2. Protocolo de Remuneração

Tem **dois eixos**, e eles são de naturezas diferentes:

- **quem recebe**: grupo de beneficiário, **definido por cliente**;
- **quem aprova ou revisa**: órgão deliberativo, **compartilhado com a Matriz**.

Os grupos variam por cliente, e isso está provado por três documentos com três conjuntos
diferentes:

| documento | grupos |
|---|---|
| formulário em branco (modificado pela última vez em out/2024) | Acionistas · Conselheiros de Administração · Diretores |
| entregue ao Potrich (mar/2026) | Sócios Fundadores · Sucessores na Gestão |
| entregue à Brunetta (mar/2026) | Fundadores · Sócios Gestores · Familiares |

Os grupos nascem como **denominações atribuídas a pessoas nomeadas na qualificação** do
próprio documento ("doravante denominado FUNDADOR"). Logo não é enum: é cadastro de grupos por
projeto, com rótulo livre e pessoas vinculadas.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 6 | Grupo de beneficiário (rótulo) | texto | `manual-projeto` | Protocolo, Acordo |
| 7 | Pessoas do grupo | vínculo n:n | pessoa: `pessoa.id` (`cadastro-existente`); o vínculo é `cadastro-novo` | Protocolo, Acordo |
| 8 | Família do benefício | enum (15) | `cadastro-novo` | Protocolo |
| 9 | Critério | enum (~60, dentro da família) | `cadastro-novo` | Protocolo |
| 10 | Resolução do critério | enum: concedido, não concedido, condicionado | `manual-projeto` | Protocolo |
| 11 | Valor | moeda | `manual-projeto` | Protocolo |
| 12 | Periodicidade do valor | enum: mensal, anual, por evento | `manual-projeto` | Protocolo |
| 13 | Índice de atualização | enum: salário-mínimo, INPC, IGPM | `manual-projeto` | Protocolo |
| 14 | Dia de pagamento | número (dia útil) | `manual-projeto` | Protocolo |
| 15 | Especificação em espécie | texto | `manual-projeto` | Protocolo |
| 16 | Ciclo de substituição | número (anos) | `manual-projeto` | Protocolo |
| 17 | Órgão que aprova ou revisa | enum (mesmo do campo 2) | `manual-projeto` | Protocolo, Matriz |
| 18 | Condição | texto | `manual-projeto` | Protocolo |
| 19 | Prazo de sigilo | número (anos) | `manual-projeto` | Protocolo, Acordo |

**As 15 famílias:** remuneração pelo trabalho · jornada e férias · veículos · benefícios de
fornecedores · despesas corporativas · aeronave · telefonia · saúde · seguro de vida · auxílio
educação · moradia · investimentos em unidades do grupo · recursos humanos e materiais ·
adiantamentos e empréstimos · outros.

**Cobertura parcial não é o padrão.** O documento entregue resolve praticamente toda a lista,
e boa parte das respostas é **negativa**: não fornece cartão corporativo, não custeia seguro de
vida, educação, telefonia nem imóvel particular. A planilha é o menu, e o documento resolve
cada linha em concedido, não concedido ou condicionado. Por isso o campo 10 tem três valores e
não é booleano.

**O item guarda valor.** Exemplos reais: remuneração mensal fixa por grupo; teto para
construção de moradia em unidade do grupo; veículo especificado por modelo com ciclo de troca
em anos. Junto vem o índice de correção e a periodicidade de revisão.

---

## 3. Acordo de Quotistas

O documento mais longo, com cerca de 20 cláusulas. Boa parte do texto é redação jurídica que
não vira campo; o que vira campo são os **parâmetros que mudam de cliente para cliente** e os
**institutos que podem ou não existir** naquele acordo.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 20 | Grupo familiar (ramo) | texto | `manual-projeto` | Acordo, Protocolo |
| 21 | Nomenclatura do grupo | enum: "RAMO [nome]", "DESCENDENTES DE [nome]" | `manual-projeto` | Acordo |
| 22 | Quórum de deliberação ordinária | enum: maioria simples | `manual-projeto` | Acordo, Regimento |
| 23 | Quórum de maioria absoluta do capital | percentual | `manual-projeto` | Acordo |
| 24 | Quórum de destituição de administrador | percentual (dois terços) | `manual-projeto` | Acordo |
| 25 | Ordem do direito de preferência | lista ordenada | `manual-projeto` | Acordo |
| 26 | Objetos sujeitos à preferência | multi-enum: quotas, imóveis, máquinas, equipamentos, oportunidades de negócio, participações | `manual-projeto` | Acordo |
| 27 | Institutos de venda presentes | multi-enum: lock-up, drag along, tag along | `manual-projeto` | Acordo |
| 28 | Metodologia de valor da quota | enum: PL, fluxo de caixa descontado, dupla avaliação | `manual-projeto` | Acordo |
| 29 | Consolida composse na avaliação | booleano | `manual-projeto` | Acordo |
| 30 | Limite de aval e fiança | percentual do faturamento | `manual-projeto` | Acordo, Matriz |
| 31 | Mecanismo de solução de litígios | enum: arbitragem, judicial | `manual-projeto` | Acordo, Protocolo |
| 32 | Câmara arbitral | texto | `manual-projeto` | Acordo, Protocolo |
| 33 | Prazo para indicação de árbitros | número (dias) | `manual-projeto` | Acordo |
| 34 | Representante dos quotistas | vínculo | `pessoa.id` (`cadastro-existente`); o papel é `cadastro-novo` | Acordo |
| 35 | Quotas gravadas com usufruto | booleano | `cadastro-novo` | Acordo, contrato social |
| 36 | Titular do direito de voto da quota | enum: nu-proprietário, usufrutuário | `cadastro-novo` | Acordo, contrato social |

**Regras de vocabulário que o cadastro precisa respeitar:**

- **Nunca usar "núcleo familiar"**: o termo exclui cônjuge implicitamente. Os rótulos aceitos
  são "RAMO [nome]" ou "DESCENDENTES DE [nome]", e a escolha é por acordo.
- **Cônjuge não integra grupo nenhum** e nunca ingressa no quadro societário. Em herança,
  divórcio ou incapacidade recebe haveres em dinheiro, nunca quotas.
- **Quórum de três quartos não existe** na régua do escritório: são maioria simples, maioria
  absoluta do capital e dois terços.

**O usufruto é campo, e é estrutural.** Nas doações com reserva de usufruto vitalício, o
direito de voto pode ficar com o doador, por aplicação supletiva do art. 114 da Lei das S/A via
art. 1.053 do Código Civil. Ou seja, **quem detém a quota não é necessariamente quem vota**, e
qualquer cálculo de quórum que ignorar isso dá resultado errado.

---

## 4. Regimento Interno do Conselho

O procedimento interno diz que este é o único produto sem rol de perguntas padrão, e que seria
artesanal. **O exemplo real contradiz:** tem 16 parâmetros, todos objetivos.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 37 | Quantidade mínima de membros | número | `manual-projeto` | Regimento, AC Reflexo |
| 38 | Quantidade máxima de membros | número | `manual-projeto` | Regimento, AC Reflexo |
| 39 | Remuneração dos conselheiros | moeda ou "nenhuma" | `manual-projeto` | Regimento, Matriz |
| 40 | Mandato do presidente | número (anos) | `manual-projeto` | Regimento |
| 41 | Quórum de deliberação | percentual | `manual-projeto` | Regimento |
| 42 | Duração máxima da reunião | número (horas) | `manual-projeto` | Regimento |
| 43 | Periodicidade das reuniões | enum: mensal, bimestral, trimestral | `manual-projeto` | Regimento |
| 44 | Prazo de convocação ordinária | número (dias) | `manual-projeto` | Regimento |
| 45 | Prazo de convocação extraordinária | número (horas) | `manual-projeto` | Regimento |
| 46 | Local das reuniões | texto | `manual-projeto` | Regimento |
| 47 | Diária do conselheiro | moeda | `manual-projeto` | Regimento |
| 48 | Período de formação de novo membro | número (meses sem voto) | `manual-projeto` | Regimento |
| 49 | Quórum de exclusão de membro | percentual | `manual-projeto` | Regimento |
| 50 | Hipóteses de vacância | texto ou multi-enum | `manual-projeto` | Regimento |
| 51 | Ausências que causam perda do cargo | número | `manual-projeto` | Regimento |
| 52 | Prazo para eleger substituto | número (dias) | `manual-projeto` | Regimento |
| 53 | Alçada da diretoria votada anualmente | booleano | `manual-projeto` | Regimento, Matriz |

---

## 5. AC Reflexo

A alteração contratual que leva a governança para dentro do contrato social. Não inventa
parâmetro: **repete em cláusula o que o Regimento e a Ata definiram**. Por isso a maior parte
dos campos é reuso.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 54 | Mandato dos conselheiros | número (anos) | `manual-projeto` | AC Reflexo, Ata de Eleição |
| 55 | Reeleição admitida | booleano | `manual-projeto` | AC Reflexo, Ata de Eleição |
| 56 | Vice-presidente eleito pelos membros | booleano | `manual-projeto` | AC Reflexo |
| 57 | Voto de desempate do presidente | booleano | `manual-projeto` | AC Reflexo, Regimento |
| 58 | Distribuição mínima de lucros | percentual | `manual-projeto` | AC Reflexo, Matriz |

Reusa os campos 37, 38 e 41 (mínimo, máximo e quórum).

**A composição do conselho é `manual-projeto`, e isso estava em dúvida.** Não é lida de
cadastro nenhum: é decisão do trabalho de governança, escrita no contrato social pela própria
AC Reflexo.

**Mandato não tem padrão da PSA.** Três clientes, três valores. É decisão por cliente, e o
campo não pode ter valor sugerido.

---

## 6. Instalação do Conselho e da Diretoria

Produz dois documentos, a Ata de Eleição e o Termo de Posse.

| # | Campo | Tipo | Origem | Consumido por |
|---|---|---|---|---|
| 59 | Órgãos previstos no contrato social | multi-enum: conselho, diretoria | `cadastro-novo` | Ata, Matriz |
| 60 | Pessoa eleita | vínculo | `administracao.administrador_pessoa_id` → `pessoa.id` (`cadastro-existente`) | Ata, Termo de Posse |
| 61 | Cargo | texto livre | `administracao.cargo` (`cadastro-existente`) | Ata, Termo de Posse |
| 62 | Eleito é sócio | booleano | `derivada-computada` de `quadro_societario.socio_pessoa_id` | Ata |
| 63 | Mandato por órgão | número (anos) | `manual-projeto` | Ata, AC Reflexo |
| 64 | Início do mandato | data | `administracao.data_inicio` (`cadastro-existente`) | Termo de Posse |
| 65 | Fim do mandato | data | `administracao.data_fim` (`cadastro-existente`) | Termo de Posse |
| 66 | Marco de contagem do mandato | enum: assinatura do termo de posse, data da ata | `manual-projeto` | Ata |
| 67 | Quórum de instalação da reunião | texto ou percentual | `manual-projeto` | Ata |
| 68 | Tipo de convocação | enum: primeira, segunda | `manual-projeto` | Ata |
| 69 | Deliberação unânime | booleano | `manual-projeto` | Ata |
| 70 | Presidente da mesa | vínculo | `pessoa.id` (`cadastro-existente`); o papel de mesa é `cadastro-novo` | Ata |
| 71 | Secretário da mesa | vínculo | `pessoa.id` (`cadastro-existente`); o papel de mesa é `cadastro-novo` | Ata |

**A mesa diretora é outra coisa que o conselho.** Presidente e secretário da mesa são papéis
da reunião, e não se confundem com presidente do conselho. Modelar como o mesmo campo produz
ata errada.

**O Termo de Posse é quase todo qualificação de pessoa**, que o catálogo de geração de
documentos já modela, mais cargo, data de início e data de fim, que já existem em
`administracao`.

---

## Eixos compartilhados

Três coisas aparecem em quase todos os documentos e devem ser cadastradas uma vez:

**Órgão deliberativo.** Campo 2, reusado nos campos 17 e 30. Aparece na Matriz, no Protocolo,
no Acordo e no Regimento. Provavelmente derivado da estrutura do cliente, seguindo a cascata
conselho, diretoria, administradores do contrato social.

**Pessoa e sua qualificação.** Aparece em todos. Já existe no banco e já é modelada pelo
gerador de documentos.

**Grupo de pessoas.** Campos 6, 7, 20 e 21. O Protocolo chama de grupo de beneficiário e o
Acordo chama de ramo ou descendentes. **É a mesma estrutura com dois usos**, e vale confirmar
se deve ser um cadastro só.

---

## O que já existe no banco e o que precisa ser criado

Conferido **ao vivo no banco em 13/08/2026**, tabela por tabela e coluna por coluna, com token
de usuário e leitura pela API. Nome real, nunca presumido.

**Existe e é só ler:**

| tabela | colunas verificadas |
|---|---|
| `administracao` | `administrador_pessoa_id`, `pj_pessoa_id`, `cargo`, `pode_isoladamente`, **`poderes`**, `data_inicio`, `data_fim` |
| `quadro_societario` | `socio_pessoa_id`, `empresa_pessoa_id`, `quotas`, `percentual`, `vlr_total`, `data_referencia` |
| `capital_integralizacao` | `vlr_capital_arredondado`, `pct_capital`, `reserva_capital`, `vlr_contabil`, `vlr_mercado`, `pct_vlr_contabil`, `pct_vlr_mercado` |
| `pessoa` | `denominacao`, `cpf_cnpj`, `tipo_pessoa`, `genero`, `estado_civil`, `regime_bens`, `profissao`, `nacionalidade`, `naturalidade_municipio`, `naturalidade_uf`, `filiacao_pai`, `filiacao_mae`, `documento_identidade_*`, `endereco_*`, **`is_fundador`**, `conjuge_id` |

`quadro_societario` **tem** `percentual` e `data_referencia`. Quem não os usa é a tela, que
deriva a participação das quotas. **Listar percentual como cadastro novo seria erro.**

**Não existe, confirmado por resposta 404 da API:**

`capital_social` · `conselho` · `conselho_membro` · `mandato` · `orgao_governanca` · `alcada` ·
`matriz_alcada` · `protocolo_remuneracao` · `regimento_interno` · `governanca`.

Ou seja, **nenhuma tabela de governança existe**. O capital é calculado na geração, a partir de
`capital_integralizacao`. Também não existe marcação de usufruto sobre a quota nem de quem
exerce o voto (campos 35 e 36).

**Duas lacunas da síntese de arquitetura já foram fechadas e o documento está desatualizado
nelas:** `pessoa.genero` **existe** (a síntese diz "inexistente hoje") e `administracao.poderes`
**existe** (a síntese lista poderes junto com mandato, quórum e alçada como lacuna). Das quatro,
só mandato, quórum e alçada continuam sem lugar.

**`pessoa.is_fundador` já existe** e é um começo do eixo de grupos do Protocolo, mas não
resolve: é booleano de uma condição só, e os grupos reais são de dois a três por cliente, com
rótulo próprio.

**Legado a registrar, não a resolver:** `administracao.cargo` é texto livre e tem hoje **12
linhas com 2 valores**, "Administrador" (8) e "Sócio-Administrador" (4), nenhum de governança.
São dois valores, não quatro como o enunciado supõe. O campo 61 segue texto livre por decisão
tomada: cargos de conselho se repetem entre clientes, mas os de diretoria são inventados por
cliente ("Diretor de Sistema de Irrigação").

**Catálogo de tipos de documento, e aqui o enunciado precisa ser corrigido.** `documento_tipo`
tem **68 tipos**, distribuídos em `Qualificação das Partes` (32), `Diagnóstico Patrimonial`
(29), `Quadro Societário` (6) e `Avulso da solicitação` (1). **Nenhum é documento produzido pela
PSA.** Os três que tocam governança são o que o **cliente entrega**: "Matriz de alçadas
existente", "Protocolo/acordo societário ou familiar" e "Regimentos, políticas e regulamentos
(cooperativa)". A palavra "existente" no primeiro deles denuncia o sentido. Então **não há
nomenclatura pronta a reusar**: os nomes dos seis documentos produzidos precisam ser criados,
e a recomendação de criar a categoria de governança fica registrada, sem execução.

---

## Decisões em aberto

**Se os órgãos da Matriz são derivados ou livres.** A cascata do Acordo de Quotistas sugere
que são derivados da estrutura do cliente. É inferência de duas fontes independentes, não
confirmação. **Vai para a consultoria.**

**Os três produtos de entrevista.** O enunciado da tarefa atribui ao Diagnóstico a "qualidade
que une os sócios", o organograma macro e os interesses profissionais de cada um. **Nenhum dos
três está na Matriz nem em qualquer outro documento.** Saem da conversa e não são registrados
em campo. Decidir se entram como texto livre no cadastro ou ficam fora.

**Nomenclatura dos processos.** As pastas do Drive dizem P4 governança e P3 sucessão; o
enunciado da tarefa descreve a plataforma com P5 governança e P4 sucessão. **Vai para o
Bernardo**, junto com a contagem de processos, que agora se resolve como sete processos e seis
documentos.

---

## Premissas do enunciado que os documentos corrigiram

1. **Quatro dos cinco artefatos "que faltam" existem.** A planilha do protocolo, quatro
   matrizes de alçadas reais, a DAC dos diretores e três arquivos de referência do protocolo
   estão todos no Drive. O risco número 1 do enunciado está eliminado.
2. **O catálogo de tipos de documento não cobre governança.** Os 23 tipos existentes são do que
   o cliente entrega, não do que a PSA produz.
3. **O Regimento não é artesanal.** O exemplo real tem 16 parâmetros objetivos.
4. **Os três produtos de entrevista do Diagnóstico não existem como documento.** Ver decisões
   em aberto.
5. **O formulário em branco do Protocolo não é a referência mais nova.** Ele foi modificado
   pela última vez em outubro de 2024, e os dois documentos entregues são de março de 2026. A
   prática corrente é a dos entregues, que usam grupos definidos por cliente.
6. **`administracao.cargo` tem dois valores, não quatro.**
7. **`pessoa.genero` e `administracao.poderes` já existem.** A síntese de arquitetura os lista
   como lacuna.

---

## Contra o "pronto quando" da tarefa

| critério | situação |
|---|---|
| Os sete documentos têm os campos declarados numa tabela | **atendido.** Os sete processos estão na tabela do panorama, em seis seções de campos, porque dois processos produzem o mesmo artefato |
| Toda linha marcada como já existente tem tabela e coluna verificadas | **atendido.** Verificação ao vivo em 13/08, e não por leitura do mapa: tabela existente respondeu 200 e coluna foi lida do retorno; tabela inexistente respondeu 404 |
| A lista foi lida em voz alta com a consultora e com Family Business | **não atendido.** A consultora respondeu por escrito e em parte, através de outra analista. A leitura em voz alta não aconteceu |
| O mockup abre no navegador com os rótulos que a Patrícia validou | **não atendido.** Não começou, e depende de a Patrícia validar os rótulos antes |

Os dois critérios pendentes dependem de agenda com pessoas de fora do time, não de trabalho
técnico. O produto final declarado da tarefa é **o mockup**, e esta tabela é o insumo dele.
