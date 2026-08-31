# Nota de decisao - Matriz de Alcadas e Alteracao Contratual

## Status

Decisao pendente. Nao transformar esta nota em especificacao definitiva nem criar tarefas de implementacao com base em uma opcao ainda nao aprovada.

## Contexto

A frente de Governanca da Sprint 12 inclui o cadastro e a geracao de documentos como Matriz de Alcadas, Acordo de Quotistas e Protocolo de Remuneracao. Algumas decisoes de governanca tambem podem exigir alteracao do contrato social.

As Alteracoes Contratuais sao tratadas como uma frente separada:

- Eduardo e Alexandre cuidam do cadastro de governanca e dos documentos proprios da governanca.
- Bernardo cuida das Alteracoes Contratuais.
- A integracao entre as frentes precisa definir como uma decisao aprovada de governanca origina uma demanda ou insumo para AC.

## Materiais analisados

### Mockup de governanca

- Branch remota: `origin/mockup/cadastro-governanca`
- Commit final analisado: `e35daf79`

O mockup apresenta formularios de governanca ao lado de uma previa viva do contrato social. Na Matriz, a proposta visual sugere que os assuntos e papeis dos orgaos podem gerar alineas de competencia no contrato.

O mockup e uma ferramenta de descoberta, nao uma implementacao pronta:

- usa fixtures e estado local;
- nao persiste dados;
- nao usa o motor documental produtivo;
- possui simplificacoes e textos historicos que foram corrigidos ao longo da branch.

### Matriz de Alcadas real

- `/home/bernardo/Downloads/VF Matriz de Alçadas Bigolin.pdf`

A Matriz organiza atividades por orgao ou papel:

- Reuniao de Socios;
- Conselho;
- Diretor Executivo;
- Gerente Administrativo Financeiro.

As celulas nao contem apenas um papel simples. Elas podem registrar:

- aprovacao, proposicao, execucao e acompanhamento;
- limites monetarios;
- condicoes relacionadas ao orcamento ou a politicas internas;
- excecoes para bens, pessoas ou tipos de operacao;
- diferencas entre sociedades controladas, terceiros e cooperativas;
- combinacoes de mais de uma acao dentro da mesma atividade.

### Alteracao Contratual real

- `/home/bernardo/Downloads/5ª Alteração_Perci Smaniotto Participações Ltda...pdf`

O documento altera e consolida o contrato social para incluir uma estrutura de governanca. Entre outros pontos, ele trata de:

- Conselho de Administracao e Diretoria;
- composicao, eleicao, mandato e reeleicao;
- convocacao, reunioes e quoruns;
- vacancia, renuncia e substituicao;
- competencias do Conselho e da Diretoria;
- competencias reservadas a Reuniao de Socios;
- representacao legal e limites de valor;
- atuacao isolada ou conjunta de diretores e procuradores;
- referencia e obrigatoriedade do Acordo de Quotistas.

Os dois documentos sao de clientes diferentes. A comparacao demonstra padroes conceituais, mas nao comprova correspondencia literal entre uma Matriz especifica e uma AC especifica.

## Problema identificado

A relacao entre a Matriz de Alcadas e o contrato social aparentemente nao e sempre de uma linha da Matriz para uma clausula da AC.

Foram observados os seguintes tipos de relacao:

- uma linha da Matriz pode alimentar mais de uma clausula ou alinea;
- varias linhas podem ser consolidadas em uma unica clausula juridica;
- somente a parte juridicamente relevante de uma linha pode chegar ao contrato;
- detalhes operacionais de gerentes e executores podem permanecer apenas na Matriz;
- o contrato pode exigir regras que nao aparecem na Matriz, como mandato, reeleicao, vacancia, convocacao e posse;
- a redacao da AC acrescenta estrutura e linguagem juridica que nao existem na Matriz.

Exemplos observados:

- Distribuicao de lucros pode aparecer na competencia do Conselho para propor ou encaminhar e na competencia da Reuniao de Socios para aprovar.
- Remuneracao pode ser separada entre remuneracao global, remuneracao individual, contratacao, promocao e programa de participacao em resultados.
- Representacao legal pode consolidar limites financeiros, formas de assinatura conjunta, procuradores e necessidade de autorizacao previa.
- Atividades operacionais atribuidas a gerentes podem ser relevantes para a Matriz sem pertencer ao contrato social.

## Conclusao provisoria

Nao esta confirmado que uma alteracao em uma linha da Matriz deva modificar automaticamente uma clausula correspondente do contrato social.

A hipotese mais segura, ainda pendente de decisao, e considerar a relacao como uma transformacao entre:

1. decisoes de governanca aprovadas;
2. identificacao dos pontos com possivel reflexo societario;
3. elaboracao de uma proposta ou demanda de AC;
4. consolidacao juridica em blocos do contrato social;
5. revisao humana antes da geracao definitiva.

Nesse desenho, a Matriz nao gera sozinha a AC. Ela fornece parte dos insumos para uma AC reflexa, junto com outras decisoes de governanca.

## Outras fontes da AC de governanca

O exemplo analisado indica que a AC nao depende somente da Matriz. Ela tambem pode consumir decisoes sobre:

- orgaos existentes e sua estrutura;
- composicao minima e maxima;
- mandato e reeleicao;
- quoruns e regras de reuniao;
- presidencia e voto de desempate;
- vacancia e substituicao;
- eleicao e investidura;
- poderes de representacao;
- existencia e efeitos do Acordo de Quotistas.

Parte desses dados aparece no mockup dentro de Regimento Interno, Instalacao dos Orgaos e cadastro estrutural de governanca.

## Opcoes a avaliar

### Opcao A - Relacao direta por linha

Cada linha da Matriz marcada como societaria possui um bloco correspondente na AC.

Vantagens:

- fluxo mais simples;
- rastreabilidade direta;
- previa imediata.

Riscos:

- nao representa bem consolidacoes e desdobramentos;
- pode levar detalhes operacionais ao contrato;
- exige que a Matriz seja estruturada em funcao do modelo juridico;
- pode produzir redacao inadequada sem revisao.

### Opcao B - Mapeamento para conceitos juridicos

Linhas e celulas da Matriz alimentam conceitos intermediarios, como distribuicao de lucros, garantias, representacao e investimentos. Os conceitos aprovados selecionam ou parametrizam blocos da AC.

Vantagens:

- permite relacoes muitos-para-muitos;
- separa linguagem de negocio de linguagem juridica;
- favorece reutilizacao entre modelos de contrato.

Riscos:

- exige uma camada adicional de modelagem;
- demanda homologacao do mapa entre conceitos e blocos juridicos;
- pode ser complexo para a primeira versao.

### Opcao C - Handoff assistido sem geracao automatica

A Governanca registra e aprova as decisoes. O sistema identifica ou permite marcar os pontos com reflexo societario e cria uma demanda de AC com um resumo estruturado. A redacao e selecionada posteriormente no fluxo de AC.

Vantagens:

- preserva a separacao de responsabilidade;
- reduz o risco de automacao juridica prematura;
- permite aprender com casos reais antes de fixar o mapeamento.

Riscos:

- exige maior intervencao manual;
- entrega menos automacao inicial;
- pode duplicar alguma interpretacao entre as frentes.

### Opcao D - Modelo hibrido

Alguns campos com relacao comprovadamente direta parametrizam automaticamente blocos da AC. Os demais apenas geram alertas, comparativos ou uma demanda para revisao.

Vantagens:

- automatiza os casos seguros;
- mantem revisao humana nos casos interpretativos;
- permite evolucao gradual do mapeamento.

Riscos:

- precisa deixar claro ao usuario o que foi automatizado e o que depende de revisao;
- exige classificacao e testes por campo ou conceito.

## Decisoes pendentes

1. Definir se a primeira versao cria apenas o handoff para AC ou tambem gera uma previa automatica.
2. Definir se o vinculo sera por linha da Matriz, por conceito juridico ou por ambos.
3. Identificar quais campos possuem reflexo societario obrigatorio, opcional ou inexistente.
4. Definir quem aprova a versao da governanca utilizada como insumo da AC.
5. Definir se uma mudanca aprovada cria automaticamente uma nova demanda de AC.
6. Definir como comparar a governanca vigente com a versao ja registrada no contrato social.
7. Definir se Regimento Interno e Instalacao dos Orgaos sao documentos separados ou apenas fontes estruturadas para outros documentos.
8. Definir o limite entre a entrega de Eduardo/Alexandre e o inicio do fluxo de Bernardo.

## Impacto no planejamento da Sprint 12

- Nao criar ainda uma tarefa definitiva de geracao automatica da AC a partir da Matriz.
- As tarefas de Governanca devem garantir dados persistidos, versionados e aprovados.
- A frente de AC deve ser planejada separadamente.
- A integracao entre as duas frentes pode, inicialmente, ser representada por um handoff ou snapshot estruturado.
- A opcao definitiva deve ser escolhida depois de analisar mais casos reais e validar o fluxo com os responsaveis.
