# MOT-01: os placeholders da governança

Levantamento dos nomes de campo, feito antes de tocar em código, porque o card
pede que "os nomes dos campos precisem ser combinados antes de as duas
começarem" e a GOV-02 já está de pé no sandbox.

Escopo desta linha: **só a capacidade do motor**. Nenhum bloco, modelo ou
cláusula é escrito aqui. A AC de governança é da GOV-C e da GOV-G; o documento
do acordo sai na GOV-03.

## O defeito, em uma frase

`src/lib/templates/vocabulario.ts` conhece oito tipos de entidade (`pessoa`,
`sociedade`, `bem`, `matricula`, `cartorio`, `vertice`, `instrumento`,
`origemPosse`) e `binding.ts` conhece os papéis que apontam para eles. Nenhum é
órgão de governança, competência ou parâmetro de acordo. Um `{{ orgao.nome }}`
cai em `desconhecidos` no `detectarBindings` e **some do documento sem avisar**.

O precedente é o rural: o cadastro de exploração rural acrescentou `instrumento`
e `origemPosse` e NÃO criou entidade nova para pessoa e matrícula, porque o
contrato rural qualifica as mesmas pessoas. A governança repete o movimento.

## 1. Entidade `orgaoGovernanca`

Fonte: a tabela `orgao_governanca` (GOV-01), mais as seis colunas que a
parametrização acrescenta. Os campos por extenso existem porque o contrato
escreve "03 (três)", com número e extenso na mesma frase.

| Campo | Tipo | Coluna de origem | Onde aparece |
|---|---|---|---|
| `nome` | texto | `nome` | "O Conselho de Administração será composto..." |
| `membrosMinimo` | inteiro | `membros_minimo` | "no mínimo 03" |
| `membrosMinimoExtenso` | derivado | de `membrosMinimo` | "(três)" |
| `membrosMaximo` | inteiro | `membros_maximo` | "e no máximo 06" |
| `membrosMaximoExtenso` | derivado | de `membrosMaximo` | "(seis) membros" |
| `membrosFixo` | condicional | derivado: mínimo igual ao máximo | encolhe a frase para "composto por 03 (três) membros", que é a redação do Horita e do Bela Vista |
| `mandatoAnos` | inteiro | `mandato_anos` | "com mandato de 03" |
| `mandatoAnosExtenso` | derivado | de `mandatoAnos` | "(três) anos" |
| `cargos` | texto | `cargos_do_orgao` já concatenado | "sendo Diretor de Mercado e Finanças, Diretor Operações e Diretor de Sistema de Irrigação" |
| `semCargos` | condicional | derivado: lista vazia | dispara "com denominação atribuída no momento da composição", a redação do Mattei |
| `representaSozinhoAte` | moeda | `representa_sozinho_ate` | "cujo valor não exceda R$ 2.000.000,00" |
| `representaSozinhoAteExtenso` | derivado | de `representaSozinhoAte` | "(dois milhões de reais)" |
| `representaAssinantesAcima` | inteiro | `representa_assinantes_acima` | "deverão ser assinados por 02 (dois) representantes". A Patricia definiu em 10/09 que o número fica aberto: o cliente decide quantos, e o campo guarda o número em vez de uma marcação de "dois" |
| `representaAssinantesAcimaExtenso` | derivado | de `representaAssinantesAcima` | "(dois)" |

`vigencia_inicio` e `vigencia_fim` **não entram**: nos sete contratos lidos a
vigência do órgão não vira cláusula nenhuma. São histórico do sistema.

`entra_no_contrato` também não é campo de texto: é o filtro que decide se o
órgão gera cláusula, e isso é decisão de composição do modelo, não placeholder.

## 2. Papéis do órgão

Papel é o que a tela Gerar pergunta ao consultor ("qual registro é este?"), e
cada órgão recebe uma cláusula com redação PRÓPRIA no contrato. Então são papéis
nomeados, no molde de `proprietario` e `socio2`, e não uma lista:

```
conselhoAdministracao  -> orgaoGovernanca
diretoria              -> orgaoGovernanca
reuniaoSocios          -> orgaoGovernanca
```

Mais um papel genérico `orgao`, para o cliente que criou instância própria.

**Por que não uma lista de órgãos.** No contrato, a cláusula do Conselho e a da
Diretoria não são a mesma frase com outro nome: a do Conselho fala de mandato e
reeleição, a da Diretoria fala de representação e procuradores, e a Reunião de
Sócios nem membros tem, tem quórum de instalação. Uma lista obrigaria o bloco a
ter condicional para cada variação, que é o oposto de bloco legível.

## 3. Entidade `competenciaMatriz` e a lista de alíneas

Fonte: `matriz_competencia` mais `matriz_atividade` (GOV-02). Uma competência é
uma célula da grade: o que UM órgão faz em UMA atividade.

| Campo | Tipo | Onde aparece |
|---|---|---|
| `atividade` | texto | o nome da atividade, que abre a alínea |
| `detalhamento` | texto | o complemento do nome, colado depois dele |
| `papeis` | texto | os verbos da célula, já concatenados |
| `alcada` | texto | "até R$ 100.000,00 (cem mil reais)" ou "até 10% do orçamento aprovado" |
| `sobePara` | texto | o nome do órgão de cima |
| `foraDaPolitica` | condicional | acrescenta "e autorizar os atos não previstos nestas políticas" |

A lista, em `PAPEIS_LISTA`:

```
competencias  -> itemKey `competencia`, fonte: a matriz do cliente,
                 filtrada pelo órgão do bloco
```

**A fonte é nova.** As fontes de hoje (`quadro`, `administracao`) saem de uma
relação da empresa escolhida. Esta sai da matriz do cliente e precisa saber de
QUAL órgão, que é o órgão vinculado no mesmo bloco. É a única peça do
levantamento que não tem precedente exato, e é onde mora o risco da linha.

Alternativa se o filtro por órgão se mostrar caro: três listas fixas,
`competenciasDoConselho`, `competenciasDaDiretoria`,
`competenciasDaReuniaoDeSocios`. Rígido, mas cobre os três órgãos padrão que
recebem cláusula, e foi o que o de-para do Mattei mostrou.

## 4. A grade da matriz como tabela, e para onde ela NÃO vai

**A grade não entra no contrato social.** Conferido nos arquivos: a
consolidação do Mattei tem duas tabelas, e as duas são o quadro societário
(SÓCIAS, QUOTAS, VALOR) e o bloco de assinaturas. O próprio
`V1_Matriz de Alçadas_Contrato Social Mattei.docx`, cujo nome anuncia a matriz,
tem ZERO tabelas. No contrato a matriz vira alínea, uma por atividade, dentro
da cláusula de competência do órgão, que é o que o de-para das 23 linhas já
tinha mostrado.

O `pronto quando` do card pede que "a grade da matriz saia como tabela", e isso
é capacidade do motor para o **documento da Matriz de Alçadas**, que hoje a OSG
entrega como planilha. Não é o contrato.

Dito isso, a limitação técnica é real e vale para qualquer tabela dinâmica. O
`tabela.ts` monta a tabela a partir do texto renderizado: uma linha que começa e
termina com `|` vira linha, e as células saem do split por `|`. As LINHAS saem
de graça do loop de seção. As COLUNAS, não: estão literais no texto do bloco.

A matriz tem uma coluna por órgão, e o número de órgãos muda de cliente para
cliente. Então uma das duas:

1. a seção aceitar separador vazio, de modo que
   `{{#celulas}}| {{ resumo }} {{/celulas}}` emita as células na mesma linha;
2. o modelo da matriz ser montado por cliente, com as colunas escritas.

A (1) é a que mantém um modelo só. **Medir antes de escolher.**

## 5. Entidade `acordoQuotistas`

Fonte: o levantamento, não tabela existente, porque o cadastro do acordo é a
GOV-03 e vem depois. Os 33 parâmetros medidos nos três acordos reais estão em
`src/previews/cadastroGovernancaDados.ts` (branch `mockup/cadastro-governanca`),
com a cláusula de cada um copiada do documento.

Os que descem ao contrato social, e portanto a GOV-C vai consumir, eu tinha
contado como seis. Medindo nos sete contratos, **quatro deles não variam** e
portanto são texto fixo do modelo, não campo:

| Candidato | Medição | Veredito |
|---|---|---|
| Ordem do direito de preferência | duas ordens medidas: o Via Fértil dá à holding primeiro, o modelo dá aos descendentes dos signatários | campo |
| Métodos de avaliação | Bela Vista, Horita e Agro Ferragens usam patrimônio líquido mais fluxo; Perci, Mattei e Zamo só patrimônio líquido | vira UMA condição |
| Regra de combinação | "maior valor" nos 2 que têm | texto fixo |
| Prazo máximo do balanço | "60 (sessenta) dias" em 6 de 6 | texto fixo |
| Horizonte do fluxo | "05 (cinco) anos" em 3 de 3 | texto fixo |
| Taxa mínima de crescimento | IPCA nos 2 que têm | texto fixo |

Os três parâmetros do fluxo não são campos independentes: são um bloco que
entra ou não, comandado por `usaFluxoDeCaixa`. Dentro do bloco os números não
variam.

Duas listas do acordo pedem `repetidor.ts`:

```
quotistasSignatarios   -> pessoa, os que assinaram a primeira versão
sociedadesRelacionadas -> sociedade, até onde o acordo alcança
```

## 6. O que fica decidido fora daqui

- **Os nomes das seis colunas novas de `orgao_governanca`** dependem da
  validação da Patricia. Este documento assume os nomes propostos em 10/09.
- **A regra de assinatura conjunta** depende da Anne: se as três alternativas
  são sempre as mesmas, `representaDoisAcima` é condicional; se variam, vira
  lista e o campo muda de forma.
- **GOV-01 e GOV-02 não estão em produção** (falta PR e merge do Bernardo). Não
  trava o desenvolvimento, que vincula contra o schema, mas trava a validação do
  aceite se ela for feita em produção.

## 7. O que o "Ajustar dados manualmente" vai mostrar

Vale para quem for escrever os blocos de verdade (GOV-C). O painel "Conferência
dos dados" da tela Gerar oferece um grupo de campos por BINDING, e binding é
papel citado direto no texto. Item de coleção que se repete não é binding, e
nunca teve campo ali. Daí a forma do bloco decidir o que o consultor vê.

**Cláusula por órgão, cada um pelo nome.** É o formato do contrato de verdade,
um capítulo para o Conselho, outro para a Diretoria, outro para a Reunião de
Sócios:

```
{{ conselhoAdministracao.artigoMaiusculo }} {{ conselhoAdministracao.nome }} ...
{{ diretoria.artigoMaiusculo }} {{ diretoria.nome }} ...
```

O painel mostra os três grupos, um por órgão, cada um com nome, mínimo, máximo e
mandato. Os três se vinculam sozinhos pela `padrao_chave`, sem pergunta.

**Um bloco só, repetindo a coleção.** Se a composição virar uma frase única
repetida por órgão, com "repete a coleção" em `orgaosComCompetencia`, o
documento sai certo e o painel não mostra órgão nenhum: todos viraram item.

**A armadilha.** Escrever `{{ orgao.nome }}` num bloco SEM marcar "repete a
coleção" transforma `orgao` em papel unitário, e a tela passa a perguntar "qual
é o Órgão de governança?" num campo de escolha. O vínculo automático não cobre
`orgao`, que é genérico e não tem `padrao_chave`. Foi esta pergunta que travou o
consultor na primeira geração de 14/09.

**O limite conhecido.** O mesmo órgão pode aparecer pelos dois caminhos: pelo
nome na cláusula de composição e como item na de competências. O ajuste manual
alcança só o primeiro. Renomear o Conselho no painel faz a composição dizer um
nome e a competência dizer outro. Os números não correm esse risco, porque
mínimo, máximo e mandato não aparecem na cláusula de competência. Igualar isso é
GOV-C, não MOT-01.

**Campo `interno`.** `orgaoGovernanca.genero` não aparece no painel e não deve
aparecer: é propriedade da palavra, não do órgão, e serve só para o motor
escrever "O Conselho" e "A Diretoria". Corrige-se no cadastro do órgão.
