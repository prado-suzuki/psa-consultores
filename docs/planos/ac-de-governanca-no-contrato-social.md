# A alteração contratual de governança no contrato social

Plano de handoff. Nasce da análise de **14 e 15/09/2026** sobre a `develop`, cruzando o que os
cadastros de governança guardam (GOV-01, GOV-02, GOV-03) e o que o motor entende (MOT-01) com o
que os contratos registrados escrevem. Todas as contagens abaixo foram medidas, e a fonte de cada
uma está anotada.

**Revisado em 15/09/2026**, depois de uma conferência do plano contra o código e contra produção
(MCP, só SELECT). A revisão mudou a Frente C por inteiro (o evento passa a ser derivado por
estado, e não do `audit_logs`; a colisão com a administração simples envolve oito blocos, não
dois; a flag de governança segue o estado proposto, não o cadastro; e documento validado **corre
risco** com retag de flag), acrescentou regras ao piso da alçada (§3), tirou a cauda
institucional de dentro do bloco de competência (§6) e corrigiu a lista do que falta em produção
(§8). O que motivou cada mudança está anotado no lugar, para que ninguém desfaça por engano.

O corpus são os **sete arquivos** da pasta "AC Participações · Governança registrada": seis
contratos com capítulo de governança (Zamo, Horita, AgroFerragens Luizão, Bela Vista 4ª AC,
Perci 9ª AC, VF 5ª AC do Perci) mais o `VF_Modelo de Contrato Social_ Controladora`, que é o
modelo da casa e não tem capítulo de governança.

---

## 0. O que este plano não cobre

- **O documento do Acordo de Quotistas**, os blocos dele e a ligação do `mapearAcordoQuotistas`
  com o cadastro da GOV-03. É frente do Eduardo.
- **A cláusula do contrato que cita o acordo** (data de assinatura, vigência, signatários) e a
  apuração de haveres. Descem ao contrato social, mas saem pela mesma frente do acordo.
- **De onde vem o quórum** quando o acordo e o contrato guardam o mesmo número. Decisão aberta
  daquela frente; este plano só registra que ela existe e que toca o bloco do contrato.

O que sobra, e é o escopo daqui: fazer o contrato social receber o **capítulo da Administração
com Conselho e Diretoria**, e fazer a alteração contratual saber que ele mudou.

---

## 1. O que já existe, para não reexecutar

Medido na `develop` em 15/09/2026.

| Peça | Estado |
|---|---|
| `orgao_governanca`, com gênero, mínimo, máximo, mandato e cargos | pronto (GOV-01, parametrização de 11/09) |
| `matriz_alcadas` e as cinco tabelas da grade | pronto (GOV-02) |
| Telas de Órgãos e de Matriz de Alçadas | prontas, com 24 atividades e 32 papéis no catálogo |
| Entidades `orgaoGovernanca` e `competenciaMatriz` no `vocabulario.ts` | prontas (MOT-01) |
| Papéis `conselhoAdministracao`, `diretoria`, `reuniaoSocios`, `orgao` no `binding.ts` | prontos |
| Coleção aninhada `orgaosComCompetencia` + `competencias`, fonte `matriz_alcadas` | pronta |
| `src/lib/templates/contextoGovernanca.ts` e `src/lib/osg/entradaGovernanca.ts` | prontos, com a letra da alínea calculada depois do descarte |
| A tela Gerar lendo a Matriz do cliente, com auto-vínculo dos órgãos padrão | pronta |
| Família de variantes por dentro de seção aninhada dentro de bloco repetidor | suportada pelo `render.ts` (um nível de família, e é o que a alínea precisa) |
| **Blocos de governança na Biblioteca** | **zero.** 231 versões atuais em produção, nenhuma cita Conselho, Diretoria ou alçada |
| **Evento de governança** | **não existe.** São 9 flags `evento_*` no catálogo, nenhuma de governança |

Atenção ao caminho: `contextoGovernanca.ts` mora em `src/lib/templates/`, não em `src/lib/osg/`.

---

## 2. A medição que sustenta o plano

- **Tamanho do capítulo.** Entre 10 e 16 cláusulas. No Zamo são 15 cláusulas, 27 parágrafos e
  50 alíneas de competência (24 no Conselho, 26 na Diretoria). No Horita são 77 alíneas.
- **O regime de funcionamento é texto fixo.** Reeleição admitida, direito a um voto por membro,
  voto de desempate do presidente, instalação com maioria absoluta dos membros em exercício e
  convocação com dez dias de antecedência aparecem **iguais nos seis**. Não viram campo.
- **O que varia e o cadastro já guarda:** composição (3 a 4, 3 a 5, 3 a 6) e mandato (2 ou 3 anos).
- **A cauda institucional.** Entre 24% e 64% das alíneas, conforme o documento, não são decisões
  com alçada: são deveres do órgão (convocar a Reunião de Sócios, cumprir o acordo de quotistas,
  manifestar-se sobre o relatório da administração, decidir os atos omissos). Não têm linha na
  matriz e não devem ter.
- **A escada da alçada.** Zamo tem 7 pisos e 7 tetos, AgroFerragens 3 pisos e nenhum teto,
  Horita 1 piso, Perci 1 de cada, Bela Vista nenhum valor no capítulo.

---

## 3. Frente A: a alçada chega em peças, e não como frase montada

**O defeito.** `entradaGovernanca.ts` chama `textoDaAlcada()` e entrega "até R$ 5.000.000,00"
pronto; o `vocabulario.ts` declara `alcada` como `tipo: 'texto'`. Daí saem os dois sintomas: o
"até" fica fixo, e não há de onde derivar o extenso, porque campo derivado precisa de um número
irmão e o irmão é prosa.

**O piso não é campo novo.** Ele é o teto de quem aponta para este órgão na mesma linha. A escada
inteira da atividade "contratação de prestadores de serviços" no Zamo:

| Órgão | Célula | O contrato escreve |
|---|---|---|
| Gestão | até 500 mil, sobe para Diretoria | (não recebe cláusula) |
| Diretoria | até 5 MM, sobe para Conselho | "superior a R$ 500.000,00 **e até** R$ 5.000.000,00" |
| Conselho | até 15 MM, sobe para Reunião de Sócios | "**superior a** R$ 5.000.000,00" |

A faixa da Diretoria é o teto dela mais o teto de quem aponta para ela. Nada disso pede campo
novo nem mudança de tela.

**As regras do piso**, que a versão anterior deste plano não escrevia e o teste tem de cobrir:

1. **O piso vem de qualquer célula da linha, inclusive de órgão interno.** A Gestão do Zamo não
   entra no contrato (`entra_no_contrato = false`) e é ela que dá o piso da Diretoria.
   `entradaDaGovernanca` filtra os órgãos que recebem cláusula, mas as células da linha continuam
   todas lá, e a derivação do piso tem de olhar as células, não os órgãos filtrados.
2. **Mais de uma célula apontando para o mesmo órgão:** o piso é o **maior** teto entre elas. É
   o único valor a partir do qual toda decisão chega a este órgão sem passar por ninguém abaixo.
3. **Unidade diferente entre quem aponta e quem recebe** (percentual subindo para moeda, ou o
   inverso): não há faixa. A célula sai só com o teto, e a linha entra em `pendencias` do
   documento, porque a matriz está pedindo uma comparação que o contrato não sabe escrever.
4. **Célula que sobe sem alçada** (só `fora_da_politica`, ou papel de análise) não contribui
   para o piso de ninguém.
5. **Órgão com teto e ninguém apontando para ele** sai sem piso, e a alínea não pode inventar um.

**O que muda**

- `src/lib/osg/entradaGovernanca.ts`: além do `alcada` pronto (que fica, para quem quiser a forma
  curta), publicar na célula `alcadaValor`, `alcadaUnidade`, `alcadaBase` e o `alcadaPiso`
  derivado pelas regras acima. O mapeador emite `alcadaValor` e `alcadaPiso` **com duas decimais
  e vírgula**, como o capital: `paraNumeroBR` lê "1.234" como 1,234 quando não há vírgula
  (defeito conhecido, registrado na memória da família de variantes), e a formatação na origem é
  o que mantém esse defeito restrito à edição manual no painel.
- `src/lib/templates/vocabulario.ts`, entidade `competenciaMatriz`: declarar `alcadaValor`
  (`tipo: 'valor'`), `alcadaExtenso` (derivado, `valorExtenso`, o mesmo código de
  `capitalExtenso`), `alcadaPiso` e `alcadaPisoExtenso`, o par percentual com
  `percentualCartorialCampo`, e as condicionais `temTeto`, `temPiso` e `temFaixa` com
  `condicionalCampo`.
- `src/lib/matrizAlcadas.ts`: `textoDaAlcada` deixa de ser a única saída; o `resumoDaCompetencia`
  (que alimenta a grade e o log) não muda.

**Como se prova.** Teste sobre a escada acima: as três células produzem os três textos do
contrato registrado, com o extenso em cada valor. Mais um caso por regra do piso: duas células
apontando para o Conselho com tetos diferentes, percentual subindo para moeda, célula que sobe
sem alçada, e órgão com teto sem ninguém abaixo.

---

## 4. Frente B: uma condicional por grupo de papel

**Por quê.** A diferença entre a alínea do Conselho e a da Diretoria, na mesma linha da matriz, é
**redação**, e ela pertence ao bloco. O motor já tem o mecanismo: a família de variantes
(`familia.ts`) elege uma redação por item a partir dos dados do próprio item. O que falta é algo
em que o seletor possa pegar: hoje `papeis` chega como prosa concatenada ("Aprova, Monitora") e o
seletor compara igualdade de string.

**O que muda**

- `src/lib/osg/entradaGovernanca.ts`: levar o `grupo` do papel junto (ele já existe em
  `papel_governanca.grupo`, com os valores Decisão, Análise, Preparação, Negociação e Execução).
- `src/lib/templates/mapeadores.ts`, `mapearCompetenciaMatriz`: publicar as condicionais
  `decide`, `analisa`, `prepara`, `negocia` e `executa`.
- `src/lib/templates/vocabulario.ts`: declarar as cinco em `competenciaMatriz`.

O seletor da família compara como string e aceita `""` como valor esperado, então "decide E NÃO
analisa" se escreve `{"competencia.decide":"sim","competencia.analisa":""}`. Não precisa de
negação no motor.

**Como se prova.** Célula com papéis de dois grupos acende as duas condicionais; célula sem papel
nenhum não acende nenhuma.

---

## 5. Frente C: o evento de governança, o estado proposto e a colisão com a administração simples

As três metades. Sem o evento, o assistente não oferece a governança. Sem a matéria declarada no
estado proposto, a alteração contratual erra dos dois lados. E sem resolver a colisão, o contrato
sai com duas administrações, ou com nenhuma.

### 5.1 O evento é derivado por ESTADO, não do `audit_logs`

A versão anterior deste plano derivava o evento das `mudancas` de `audit_logs` na janela do
documento registrado. **Não funciona, por três razões medidas:**

1. A janela de `useMudancasDesdeORegistro` (`src/hooks/useEventosDaAlteracao.ts`) filtra
   `entity_id IN (pj, ...administracaoIds)`. Os logs de órgão, matriz e linha da matriz carregam
   o id do órgão, da matriz e da linha; nunca chegariam em `mudancas`.
2. O próprio `eventosDaAlteracao.ts` abandonou o `audit_logs` para a sede (ramo 1, comentado no
   código): editar A para B e voltar a A acendia o evento. Governança tem o mesmo problema.
3. A janela é `performed_at > snapshot_validado_em`. Matriz preenchida **antes** do último
   registro fica fora da janela, o evento nunca acende, e com a regra do §5.2 a lista sai vazia:
   a governança nunca entraria no contrato.

**O desenho que fica:** o evento sai da comparação entre o que a peça registrada **publicou** e o
que o cadastro **produz hoje**, que é o mesmo par que a sede usa.

- `src/lib/osg/baselineDaPeca.ts`: o `BaselineDaPeca` ganha `governanca`, uma impressão digital
  da lista `orgaosComCompetencia` do snapshot da base (por órgão: nome, mínimo, máximo, mandato,
  cargos; por competência: atividade, papéis, alçada, piso, sobe). `null` quando o snapshot não
  tem a lista (peça anterior à governança) e `[]` quando tem a lista vazia.
- `src/lib/osg/eventosDaAlteracao.ts`: um ramo novo, que recebe em `ArgsDaDerivacao` a lista viva
  (`governancaViva`, a mesma que `listasDaGovernanca(entradaGov)` já monta no controller) e
  compara com `baseline.governanca`:
  - base `null` ou `[]` e viva com órgão: evento com evidência "instalação da governança: N
    órgãos, M competências";
  - base com conteúdo e viva diferente: evento com evidência "alteração da governança: o que
    mudou" (nomes de órgão que entraram e saíram, e contagem de competências alteradas, no molde
    do `diffDaLinha` de `matrizAlcadas.ts`);
  - iguais, ou viva vazia com base vazia: sem evento.
- `src/hooks/useEventosDaAlteracao.ts`: `ArgsDosEventos` ganha `governancaViva`; o
  `useGerarDocumentoController.ts` passa `listasDaGovernanca(entradaGov).orgaosComCompetencia`
  na chamada de `useEventosDerivados` (hoje na linha 1248). A janela de `audit_logs` não muda.
- **Migration**: uma linha em `tmpl_flag`, nome `evento_governanca`, tipo `manual`, escopo
  **`pj`**, que é o escopo das outras nove `evento_*` (a versão anterior dizia `documento`, e não
  é o padrão), descrição no padrão das outras ("Instalação ou mudança nos órgãos de governança
  e nas alçadas").

**Um evento, não dois**, mas **duas redações.** Instalar a governança e mudar as alçadas depois
reescrevem o mesmo capítulo e os dois precisam da matriz viva passar. A evidência diz ao
consultor qual foi, mas a evidência não chega ao bloco, e a resolução da instalação ("instituem
os sócios o Conselho de Administração…") não é a da mudança ("alteram-se as alçadas…"). Por isso
o §5.3 publica também `governanca_instalada` e `governanca_alterada`, e o §6 tem dois blocos de
resolução, cada um com o evento E uma das duas.

### 5.2 O estado proposto

`src/lib/osg/estadoProposto.ts` declara, por matéria, de onde vem cada dado. Hoje
`orgaosComCompetencia` não está declarada em lugar nenhum, e a regra de fallback produz três
comportamentos, dois deles errados:

| Situação | Hoje | Certo |
|---|---|---|
| A primeira AC de governança | entra a lista viva (a base não conhecia) | igual, mas por declaração e não por acidente |
| Uma AC alheia depois dela (sede, cessão) | prevalece a base: republica o registrado | igual |
| **Uma AC de sede logo após alguém preencher a matriz, sem evento** | **entra a governança inteira sem ninguém pedir** | lista vazia |
| **A AC que existe para mudar as alçadas** | **prevalece a base: as competências velhas, em silêncio** | entra a viva |

**O que muda.** Uma constante `LISTAS_DE_GOVERNANCA = ['orgaosComCompetencia']`, acrescentada a
`listasVivas` quando `evento_governanca` está confirmado, e acrescentada ao conjunto `governada`
do laço de listas, para que sem evento a lista saia vazia em vez de viva.

### 5.3 A colisão com a administração simples

Os blocos de hoje, medidos em produção nos DOIS modelos `tipo = 'societario'` (Agro e
Participações), na ordem em que estão no modelo:

| Bloco | Tipo | Flags | Obrigatório |
|---|---|---|---|
| Capítulo — Administração | capitulo | nenhuma | sim |
| Cláusula — Administração e poderes | clausula | `e_constituicao` | sim |
| Cláusula — Administração e poderes (consolidação) | clausula | `e_alteracao` | não |
| Parágrafo — Administração e poderes (1) | paragrafo | nenhuma | sim |
| Parágrafo — Administração e poderes (2) | paragrafo | nenhuma | sim |
| Cláusula — Vedação à substituição do administrador | clausula | nenhuma | sim |
| Parágrafo — Vedação à substituição do administrador | paragrafo | nenhuma | sim |
| Resolução: mudança na administração | clausula | `evento_mudanca_administracao` | não |

A versão anterior deste plano via só as duas cláusulas. **São sete blocos de administração
simples mais o cabeçalho do capítulo.** Retaguear só as cláusulas deixaria os dois parágrafos e
a cláusula de vedação órfãos dentro do capítulo de governança, e o contrato com o regramento
simples e o de órgãos ao mesmo tempo.

As flags são AND simples, sem negação (`flags.ts`), então não dá para escrever "e_alteracao E NÃO
governança". A saída é a mesma que o motor já usa em `membrosFixo`/`membrosEmFaixa` e
`jaAssinado`/`aindaNaoAssinado`: publicar os dois lados.

**O que muda**

1. **Uma fonte `governanca` no contexto de flags**, ao lado de `empresa` em
   `avaliarFlags(declarativas, { empresa: empresaRow })` (controller, linha 1080). Ela **não lê o
   cadastro**: lê a mesma decisão que o §5.2 toma. O campo `noContrato` é `'sim'` quando a base
   registrada já publicava `orgaosComCompetencia` com conteúdo **ou** `evento_governanca` está
   confirmado; na constituição (peça sem base) é `'sim'` quando o cadastro tem órgão com
   `entra_no_contrato`. A versão anterior lia "o cliente tem órgão que entra no contrato", e isso
   quebrava a AC de sede com matriz preenchida e sem evento: a flag acendia, a administração
   simples saía, o capítulo de governança entrava com a lista vazia do §5.2 e era descartado, e
   o contrato saía **sem administração nenhuma**. Os dois campos da instalação e da mudança saem
   da mesma fonte: `instalada` é `'sim'` quando a base não tinha a lista, `alterada` quando
   tinha.
2. **Quatro flags declarativas no catálogo** (`tmpl_flag` com `entidade = 'governanca'`):
   `governanca_por_orgaos` (`noContrato = 'sim'`), `administracao_simples` (`noContrato = ''`),
   `governanca_instalada` (`instalada = 'sim'`) e `governanca_alterada` (`alterada = 'sim'`).
3. **Migration retaggeando os sete blocos de administração simples** com `administracao_simples`
   (as duas cláusulas somam a flag às que já têm; os cinco sem flag ganham a primeira). O
   cabeçalho "Capítulo — Administração" **fica sem flag e compartilhado**: os dois regramentos
   moram no mesmo capítulo, e um segundo cabeçalho daria dois "Capítulo IV". O desimpedimento
   continua só com `evento_mudanca_administracao`. A "Resolução: mudança na administração"
   ganhou `administracao_simples` (ela cita `refs.administracao_social` e reescreve a
   administração isolada), e o lado da governança tem a própria resolução, que cita
   `refs.capituloAdministracao` (migration `20260923154552_resolucao_mudanca_administracao_na_governanca.sql`).
4. **Retroatividade para documento validado.** A versão anterior afirmava que "documento já
   validado não corre risco: ele renderiza dos flags congelados". **É o contrário.** Só peça com
   `status = 'registrado'` renderiza os blocos do snapshot (controller, linha 447); peça
   validada e não registrada compõe o **modelo vivo** (vínculo bloco→flag de hoje) com as
   `snapshot_flags` **congeladas**. Retaguear a cláusula de administração com uma flag que o
   snapshot não tem derruba a cláusula de todo validado, e em produção há 8 documentos
   validados, **os 8 não registrados** (3 em rascunho, 5 em revisão). É exatamente o defeito que
   gerou `comFlagDaPecaRetroativa` quando `e_constituicao` nasceu. A mesma cura: a função passa
   a completar também o par `governanca_por_orgaos`/`administracao_simples`, e snapshot que não
   traz nenhum dos dois recebe `administracao_simples`, porque toda peça selada antes desta
   frente é de administração simples. Só completa quando falta o par inteiro; snapshot que já
   traz um deles é decisão selada.

**Como se prova.** Teste em `flags.test.ts` para a retroatividade (snapshot antigo ganha
`administracao_simples`; snapshot com `governanca_por_orgaos` não ganha nada). Teste de
composição com os três cenários do §5.2 mais o quarto que a versão anterior errava: AC de sede,
matriz preenchida, sem evento, base sem governança; o contrato sai com os sete blocos simples e
nenhum de governança.

---

## 6. Frente D: os blocos

É o item que define o prazo. Da ordem de 90 a 100 blocos, em migration, no formato que a
`20260910222715_resolucao_instituicao_de_usufruto.sql` já estabeleceu: `tmpl_flag`, `tmpl_bloco`,
`tmpl_bloco_versao`, `tmpl_bloco_flag` e `tmpl_documento_bloco`. O vínculo entra em todos os
documentos `tipo = 'societario'`, então Agro e Participações vêm juntos sem trabalho a mais.

**Duas regras de semeadura**, aprendidas na frente da doação (memória `osg-doacao-quotas-usufruto`):
o id de bloco novo nasce de `uuidgen`, nunca da sequência visual dos existentes (três ids
sequenciais colidiram com blocos criados fora do repositório e sobrescreveram redação); e a
**posição** no `tmpl_documento_bloco` é **calculada por documento** ("logo depois do último bloco
de administração simples daquele modelo"), nunca por UUID de âncora fixa, porque os dois modelos
não têm os mesmos blocos e um deles ficaria sem o capítulo, em silêncio. Bloco sem flag e com
`obrigatorio = false` nunca compõe; quem decide se um bloco de governança entra é a flag mais o
descarte por lista vazia.

Todos os blocos do capítulo de governança levam `governanca_por_orgaos`. O que o capítulo precisa:

1. **As cláusulas de composição**, uma por órgão, pelos papéis nomeados
   (`conselhoAdministracao`, `diretoria`, `reuniaoSocios`), com `membrosFixo` e `membrosEmFaixa`
   escolhendo a redação com ou sem faixa. Sem cabeçalho de capítulo próprio: o cabeçalho é o
   "Capítulo — Administração" compartilhado (§5.3).
2. **O regime de funcionamento** como texto fixo, conforme o §2.
3. **A cláusula de competência** como bloco repetidor sobre `orgaosComCompetencia`, com a seção
   aninhada `{{#competencias}}` dentro.
4. **A alínea como família de variantes**, com seletor pelas condicionais da Frente B e por
   `sobe`, `temTeto` e `temPiso`. A família é citada por dentro da seção aninhada
   (`{{familia nome="…"}}` dentro de `{{#competencias}}`), que é o caso que o `render.ts` suporta.
5. **A cauda institucional** como **bloco próprio**, fixo, logo depois do repetidor, com `ancora`
   (ex.: `governancaFim`). A versão anterior a colocava "no mesmo bloco da competência", e isso
   impede a citação do §6.6: `refs.<ancora>` só é publicada para bloco **sem** `escopo`
   (`index.ts`, `renderizarComReferencias`); instância de repetidor recebe `ref` carimbada no item
   e não publica âncora nenhuma. Bloco fixo depois do repetidor é o único que fecha o intervalo.
6. **Dois blocos de resolução da AC**, um para a instalação (`evento_governanca` +
   `governanca_instalada`) e um para a mudança (`evento_governanca` + `governanca_alterada`),
   conforme o §5.1. A citação do que muda é **pelo capítulo**, com uma âncora só
   (`{{ refs.capituloAdministracao }}` no cabeçalho compartilhado, que devolve "Capítulo IV"): é
   robusta a órgão descartado, e é como o Zamo escreve ("altera-se todo o regramento do capítulo
   da Administração"). Se algum contrato exigir o intervalo de cláusulas, as duas âncoras são a
   da primeira cláusula de composição e a da cauda do item 5, ciente de que cláusula de composição
   descartada por falta de órgão devolve referência vazia.

---

## 7. Decisões que precisam de resposta antes da Frente D

1. **Competência por cargo.** O Horita divide competência por diretor, não por órgão: Conselho 23
   alíneas, Diretor de Mercado e Finanças 22, Diretores de Operações Agrícolas 20, Diretor
   Presidente 12. Ou cada diretor vira um órgão no cadastro (e o `cargos_do_orgao` fica sem uso),
   ou aquele contrato não sai do gerador.
2. **Órgão que não exerce alçada.** A AgroFerragens tem Conselho Fiscal e Conselho Consultivo, que
   recebem capítulo e não participam de decisão nenhuma. Marcar `entra_no_contrato` os transforma
   em coluna da matriz, com 24 células de "não participa" para preencher antes de a cláusula
   existir. E o mandato do Fiscal é "até a próxima Reunião de Sócios que aprovar as contas", que
   não cabe num inteiro de anos.

As duas mudam o desenho da tela conforme a resposta, e por isso vêm antes dos blocos.

---

## 8. Armadilhas para quem executa

- **Produção está atrás, e mais do que uma migration.** Conferido pelo MCP em 15/09/2026:
  - `20260911201231_gov01_parametrizacao_do_orgao.sql` não foi aplicada: `genero`,
    `padrao_chave`, `membros_minimo`, `membros_maximo`, `mandato_anos` e `cargos_do_orgao` não
    existem em `orgao_governanca`. Leitura não quebra (`select('*')`), mas gravar órgão com os
    campos novos quebra, e o auto-vínculo por `padrao_chave` nunca casa.
  - `20260914131228_gov02_o_papel_ganha_infinitivo.sql` também não: `papel_governanca` não tem
    `infinitivo`, e a alínea sairia na terceira pessoa ("Delibera sobre…").
  - A tabela `acordo_quotistas` (GOV-03) não existe lá. É da frente do Eduardo, mas vai no mesmo
    `develop → main`, e o merge trava até as três chegarem pelo chat do Lovable.
  - Há 0 órgãos e 0 matrizes em produção, e as 9 flags `evento_*` estão lá.
- **`{{ refs.ancora }}` devolve "Cláusula Sexta", com a palavra junto.** Escrever "das Cláusulas
  {{refs.a}} à {{refs.b}}" duplica a palavra. "alteram-se da {{refs.a}} à {{refs.b}}" sai correto.
  Para capítulo devolve "Capítulo IV".
- **Nome de campo que não existe no vocabulário não dá erro**, só nunca casa. Foi assim que
  `capitalValorExtenso` fez o aumento sair com o algarismo novo e o extenso velho. Vale o mesmo
  teste de caracterização para os campos novos de alçada, e para o nome da lista em
  `LISTAS_DE_GOVERNANCA`.
- **A letra da alínea é calculada depois do descarte** (`contextoGovernanca.ts`), e tem de
  continuar assim: buraco em alínea de contrato registrado é erro que a Junta devolve.
- **Flag nova em bloco velho derruba documento validado** (§5.3, item 4). Toda flag que passe a
  ser exigida por bloco já existente precisa do par retroativo em `comFlagDaPecaRetroativa`.
- **`db:sync`, não `db push`**, e `types.ts` só com o delta.

---

## 9. Ordem de entrega

1. **Frentes A e B em paralelo.** Nenhuma depende da outra e nenhuma mexe em tela. Ao fim delas o
   documento ainda não muda, porque não há bloco que use os campos novos.
2. **Frente C inteira, num commit só**: baseline, derivação, hook, estado proposto, fonte de
   flags, retroatividade, e a migration com `evento_governanca`, as quatro declarativas e o retag
   dos sete blocos. O evento sem a matéria, ou o retag sem a retroatividade, não entrega nada ou
   derruba peça validada.
3. **As duas decisões do §7**, com a consultoria. Podem correr desde já, em paralelo com 1 e 2.
4. **Frente D**, que depende de 1, 2 e 3.
5. **Produção**: as três migrations do §8, pelo chat do Lovable, antes do merge.

A prova de aceite é o corpus: gerar o contrato do Zamo e comparar com o registrado, alínea a
alínea. É o mesmo método que fechou a parceria rural e a composse. Mais um caso que o corpus
não tem e o §5.3 exige: um cliente **sem** governança gerando uma AC de sede depois desta frente,
com os sete blocos simples no lugar e nenhum de governança.
