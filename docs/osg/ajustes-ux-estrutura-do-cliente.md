# Ajustes de UX — Estrutura do Cliente

**Análise de 21/09/2026, na `develop`. Decisões aprovadas pela Patrícia na mesma data.**
As cinco rotas do agrupamento "Estrutura do Cliente" do OSG Work:

| Tela | Rota |
|---|---|
| Qualificação das Partes | `/equipe/osg/work/qualificacao-das-partes` |
| Quadro Societário | `/equipe/osg/work/quadro-societario` |
| Cadastro Patrimonial | `/equipe/osg/work/diagnostico-patrimonial` |
| Controle de Matrículas | `/equipe/osg/work/controle-matriculas` |
| Exploração Rural | `/equipe/osg/work/exploracao-rural` |

O corpo é **só problema · ajuste · onde mexer · aceite**. Diagnóstico, evidência de
produção, regras de FK e a conferência contra os padrões da casa ficam nos apêndices.

---

## 0. O que importa ler primeiro

**O incômodo relatado era de UX — "botões repetidos, falta de padrão, tooltips que não
explicam". A leitura confirmou isso e encontrou duas coisas maiores embaixo, que não são
de UX: dois diálogos de exclusão descrevem menos do que a exclusão faz.**

- **Excluir um bem apaga movimentos de quota em cascata**, e com eles o capital social
  registrado da empresa. O diálogo fala só de matrículas. Em produção existe hoje um bem
  (`PS-BARR-01`) com **0 matrículas e 42 movimentos**: o diálogo dele diz, literalmente,
  *"Nenhuma matrícula vinculada. Esta ação não pode ser desfeita."*
- **Excluir uma pessoa** cascateia para checklist, administração e flags de projeto,
  orfana documentos — e, na maioria dos casos reais, **simplesmente falha**, mostrando a
  mensagem do Postgres em inglês na tela. O diálogo cita apenas parentesco.

**Essas duas entram na frente de todo o resto** (§1 e §2). São correção de fato, não
preferência.

O restante é o que a percepção original apontava, e tem uma causa só: as cinco telas
foram feitas em momentos diferentes e cada uma resolveu sozinha as **mesmas cinco
decisões** — como se nomeia um botão de ícone, onde fica o botão de criar, como se
confirma uma exclusão, o que a tela diz quando a consulta falha, e como um número diz de
onde veio. Não há um problema de UX: há cinco gramáticas.

**Doze fatias independentes, todas de front. Nenhuma migration** — tudo deriva de dado
que já existe.

**Não há decisão pendente.** As doze estão fechadas por ela em 21/09/2026.

---

## 1. Bem que pagou quotas não pode ser excluído

**Decisão de 21/09: bloquear, e direcionar para o Quadro Societário.**

**Problema**
O diálogo de exclusão de bem enumera as matrículas vinculadas e cala sobre o resto. Um bem
usado como pagamento de aporte tem seus movimentos de quota apagados em cascata pelo
banco — o capital social registrado da empresa é reescrito, sem que a tela diga isso e sem
que haja como desfazer.

**Ajuste**
Antes de oferecer a exclusão, o diálogo conta os movimentos de quota pagos com este bem.

- **Havendo ao menos um**, o diálogo **não oferece exclusão**. Ele nomeia a empresa cujo
  capital seria afetado, diz quantos movimentos existem, e oferece "Ir para o Quadro
  Societário", onde o movimento se desfaz. O único outro botão é "Fechar".
- **Não havendo nenhum**, o diálogo segue exatamente como hoje (as três variantes de
  matrícula: cascade, keep, sem matrícula).

Texto do bloqueio, na forma de mensagem contextual (o que aconteceu · o que fazer agora):

> Este bem paga {n} movimento(s) de quota de {empresa}. Excluí-lo mudaria o capital social
> registrado.
> Desfaça o movimento no Quadro Societário antes de excluir o bem.

**Onde mexer**
- `src/pages/equipe/osg/DiagnosticoPatrimonial.tsx` — `DeleteBemDialog`.
- `src/hooks/useDiagnosticoPatrimonial.ts` — hook novo `useMovimentosDoBem(bemId)`, no
  molde do `useMatriculasByBem` (linha 360): `enabled: !!bemId`, consulta só ao abrir o
  diálogo. Precisa de `empresa_pessoa_id` e da contagem.

**Aceite**
- Ao clicar na lixeira de `PS-BARR-01`, vejo o nome da empresa, a contagem de movimentos e
  os botões "Fechar" e "Ir para o Quadro Societário" — e **nenhum** botão que exclua.
- Ao clicar na lixeira de um bem sem movimento e com duas matrículas, vejo o diálogo de
  hoje, com "Manter matrículas" e "Excluir bem e matrículas".
- Ao clicar na lixeira de um bem sem movimento e sem matrícula, vejo "Nenhuma matrícula
  vinculada. Esta ação não pode ser desfeita." e o botão "Remover".

---

## 2. Pessoa presa a um vínculo não abre diálogo de exclusão

**Decisão de 21/09: conferir os vínculos ao clicar na lixeira. Não pré-carregar consulta
por pessoa.**

**Problema**
Três coisas no mesmo controle.

1. O diálogo diz que "os vínculos de parentesco associados também serão removidos", e a
   lista está incompleta: saem junto os itens de checklist, a administração, as flags de
   projeto e os itens não aplicáveis da solicitação; os documentos ficam sem dono.
2. Para a maior parte das pessoas cadastradas a exclusão **falha**, porque o banco a
   recusa (titularidade, movimento de quota, acordo). A pessoa lê a frase de confirmação,
   confirma, e recebe um erro.
3. Esse erro é a mensagem crua do Postgres, em inglês, num toast.

**Ajuste**
A lixeira deixa de abrir o diálogo direto. Ao ser clicada, ela consulta os vínculos da
pessoa — uma consulta por clique, não por linha — e então:

- **Pessoa presa** (titular de matrícula, parte de movimento de quota, signatária ou
  sociedade relacionada de acordo): abre uma **recusa**, que nomeia o vínculo que impede e
  onde ele se desfaz. Sem botão de remover.

  > {Nome} é titular de {n} matrícula(s) e não pode ser removida.
  > Retire a titularidade no Cadastro Patrimonial antes de remover a pessoa.

  A mesma forma para os outros três vínculos, nomeando a tela onde se desfaz.

- **Pessoa livre**: abre o diálogo de hoje, com a **lista completa** do que sai junto —
  parentescos, itens de checklist, órgãos de governança — e a nota de que os documentos
  enviados ficam sem pessoa vinculada.

E o `onError` do `useDeletePessoa` deixa de imprimir `error.message`. Passa à forma fixa da
§4 do padrão, com o fecho que já existe no catálogo:

> **Não foi possível remover a pessoa.**
> Tente novamente. Se o problema continuar, entre em contato com o suporte.

O erro cru vai para `console.error`.

**Onde mexer**
- `src/pages/equipe/osg/QualificacaoDasPartes.tsx` — o `AlertDialog` da linha vira um
  diálogo controlado, no molde do `DeleteBemDialog`.
- `src/hooks/useQualificacaoDasPartes.ts` — hook novo `useVinculosDaPessoa(pessoaId)`;
  `useDeletePessoa`, no `onError`, passa a usar `FECHO_SUPORTE` de `@/lib/rlsMessages`.
- **Corrigir também o comentário errado** em `useDeletePessoa` (linhas 137-139): ele diz
  que o CASCADE do banco apaga as linhas do quadro societário da pessoa. Não apaga —
  `movimentacao_quotas` é `NO ACTION`, e é justamente por isso que a exclusão falha.

**Aceite**
- Ao clicar na lixeira de uma pessoa que é titular de matrícula, vejo uma frase dizendo
  qual vínculo impede e em que tela desfazê-lo, e **nenhum** botão "Remover".
- Ao clicar na lixeira de uma pessoa sem vínculo nenhum, o diálogo cita parentescos, itens
  de checklist e documentos.
- Em nenhum momento vejo texto em inglês ou nome de tabela na tela.

---

## 3. Falha de consulta deixa de ser lista vazia

**Problema**
Em quatro das cinco telas, uma consulta que falhou e um cliente sem cadastro dizem a mesma
frase: "Nenhum bem cadastrado para este cliente." A Exploração Rural é a única que separa
os dois — e o comentário dela registra o caso real que isso já causou.

A Exploração Rural, por outro lado, imprime a mensagem do banco na tela.

**Ajuste**
As quatro telas ganham o bloco de erro que a Exploração Rural já tem: moldura
`border-destructive/40`, ícone, e a frase "Não foi possível carregar {o quê} deste
cliente." E a Exploração Rural **perde** o `error.message` visível — ele vai para
`console.error`, e a tela mantém só a primeira frase.

Como o mesmo desenho passa a existir cinco vezes, ele vira um componente:
`EstadoDeFalha`, ao lado das telas.

**Onde mexer**
- `src/components/equipe/osg/EstadoDeFalha.tsx` (novo).
- As cinco páginas: `QualificacaoDasPartes.tsx`, `QuadroSocietario.tsx`,
  `DiagnosticoPatrimonial.tsx`, `ControleMatriculas.tsx`, `ExploracaoRural.tsx` — as quatro
  primeiras precisam passar a ler `error` dos hooks, que hoje descartam.

**Aceite**
- Com a consulta falhando, vejo "Não foi possível carregar…" com moldura de erro em
  qualquer das cinco telas, e **não** "Nenhum bem cadastrado".
- Em nenhuma das cinco vejo mensagem de banco na tela.

---

## 4. Todo botão de ícone ganha nome, pelo mesmo mecanismo

**Decisão de 21/09: corrigir `<Button title>` neste módulo agora. A ampliação da catraca
para o repositório inteiro fica em tarefa separada.**

**Problema**
Quatro formas diferentes de nomear o mesmo tipo de botão, nas mesmas cinco telas:

| Tela | Como o botão de ícone é nomeado hoje |
|---|---|
| Qualificação das Partes | nada — lápis e lixeira sem nome nenhum |
| Quadro Societário | nada |
| Cadastro Patrimonial | nada na lista; dentro do modal, um `title=` e um botão sem nome |
| Controle de Matrículas | `title=` (4 ocorrências) |
| Exploração Rural | `aria-label`, sem balão visual |

`title=` deixou de ser mecanismo permitido em 17/09/2026. A catraca não pega estas porque
elas estão em `<Button title>`, e ela varre a tag nativa `<button>`; o recorte de
`<Button title>` dela cobre hoje só os sete arquivos da TIP-02.

**Ajuste**
Todos passam a `ButtonTooltip` (`@/components/ui/button-tooltip`), que põe `aria-label` e
balão de uma vez. O texto é o nome da ação, no infinitivo, sem ponto final:

`Editar pessoa` · `Excluir pessoa` · `Editar bem` · `Excluir bem` · `Editar matrícula` ·
`Excluir matrícula` · `Vincular a um bem` · `Desvincular do bem` · `Editar titular` ·
`Remover titular` · `Editar exploração rural` · `Excluir exploração rural`

Dois casos particulares, no modal do bem e da matrícula:

- `MatriculasSection.tsx:47` — o `ConfirmAction` de "Remover" não recebe `triggerTitle`, e
  o botão fica **sem nome nenhum**. Passa a receber `Remover matrícula`.
- `TitularidadeLinha.tsx:88` — o botão desabilitado explica a si mesmo por um `title` que
  **nunca aparece**, porque `disabled:pointer-events-none` na base do `Button` impede o
  evento (achado do apêndice C de 21/09, cujo comportamento global você decidiu não
  mexer). A explicação sai do botão e vira texto de apoio permanente na seção de
  Titularidade: "A matrícula precisa de ao menos um titular."

**Onde mexer**
`ControleMatriculas.tsx` (219, 227, 235, 260) · `QualificacaoDasPartes.tsx` ·
`DiagnosticoPatrimonial.tsx` · `ExploracaoRural.tsx` ·
`diagnostico-patrimonial/bem/MatriculasSection.tsx` (46, 47, 53) ·
`diagnostico-patrimonial/titularidade/TitularidadeLinha.tsx` (78, 88).

**Aceite**
- Passando o mouse sobre qualquer botão de ícone das cinco telas e dos modais de bem e
  matrícula, vejo um balão com o nome da ação.
- Navegando por teclado, o leitor de tela anuncia o mesmo texto.
- Uma busca por `title=` nos arquivos acima não devolve nenhum `title` de botão.

---

## 5. O lápis sai da coluna de Ações

**Problema**
É o "botão repetido" da percepção original. A linha inteira já abre o modal de edição
(`rowActivateProps`), e ao lado há um lápis que faz exatamente a mesma coisa. Em três
telas ele está sempre visível; na Exploração Rural aparece no hover — mais uma forma
diferente para o mesmo botão.

**Ajuste**
A coluna de Ações fica só com o que a linha **não** faz: excluir, vincular, desvincular. O
lápis sai das quatro listas. O Quadro Societário já fez esse movimento e registrou por
quê — a coluna de Ações saiu da `TabelaSocios`.

**Onde mexer**
`QualificacaoDasPartes.tsx` · `DiagnosticoPatrimonial.tsx` · `ControleMatriculas.tsx` ·
`ExploracaoRural.tsx`.

**Aceite**
- Nas quatro listas, a coluna Ações não tem lápis.
- Clicando em qualquer ponto de uma linha, o modal de edição abre.
- Selecionando texto dentro de uma linha com o mouse, o modal **não** abre (comportamento
  atual do `rowActivateProps`, que não muda).

---

## 6. A lista diz quais bens entram no documento

**Decisão de 21/09: não criar mapa de cor novo. Badge neutro, e a regra como texto de
apoio visível.**

**Problema**
A regra que decide se o bem chega ao contrato gerado só é dita dentro do modal do bem. Na
lista, "Integralizado" e "Aprovado" parecem igualmente adiantados — e só o segundo entra.
Em produção são 16 bens de 26 que entram; os outros 10 não, e a tela não dá sinal.

**Ajuste**
Duas coisas, nenhuma delas tooltip.

1. Acima da tabela, texto de apoio permanente, com a frase que **já existe** em
   `AVISO_STATUS_ELEGIVEIS` e hoje só aparece no modal:
   *"Levam o bem para o documento gerado: Aprovado · Aprovado para 2ª Instancia."*
2. A coluna Status passa de texto solto a `Badge variant="outline"` — **neutro, sem cor
   por status**. Bem sem status continua mostrando "—".

**Onde mexer**
`src/pages/equipe/osg/DiagnosticoPatrimonial.tsx`. A frase vem de
`@/lib/osg/statusIntegralizacao`, sem redação nova. **Nenhum arquivo de cor é criado.**

**Aceite**
- Abrindo o Cadastro Patrimonial com um cliente selecionado, leio na tela, acima da
  tabela, quais status levam o bem ao documento.
- A coluna Status mostra a palavra dentro de um selo de contorno neutro, igual para todos
  os sete valores.
- Um bem sem status mostra "—".

---

## 7. "Papel" tem um nome só, e uma fonte só

**Problema**
O mesmo campo tem três nomes na interface — **"Papel"** na lista da Qualificação, **"Tipo
Empresa"** no modal, e um selo sem rótulo na aba do Quadro Societário. E o mapa
`PR/CN/SC → rótulo` está copiado em **quatro arquivos**, que já divergem: dois trazem as
três opções, um traz só duas.

**Ajuste**
Uma palavra na interface: **Papel**. Uma fonte no código: `src/lib/osg/papelDaEmpresa.ts`,
no modelo do que `navegacaoOsgWork.ts` fez com os títulos das telas — os quatro pontos
passam a ler de lá.

E o campo no modal ganha texto de apoio, que é a informação que falta para escolher:
*"Proprietária e Controladora aparecem no Quadro Societário."*

**Onde mexer**
`src/lib/osg/papelDaEmpresa.ts` (novo) ·
`qualificacao-das-partes/pessoa/PessoaDadosTab.tsx` (22, 144) ·
`pages/equipe/osg/QualificacaoDasPartes.tsx` (28-32) ·
`pages/equipe/osg/QuadroSocietario.tsx` (18-21) · `osg/gerar/EscolhaEmpresa.tsx` (9-11).

**Aceite**
- O rótulo é "Papel" na coluna da lista e no campo do modal.
- Ao abrir o campo Papel de uma PJ, leio abaixo dele que Proprietária e Controladora
  aparecem no Quadro Societário.
- As três opções (Proprietária, Controladora, Sócia) saem escritas iguais nas três telas.

---

## 8. O Quadro Societário diz por que a empresa não está lá

**Decisão de 21/09: com abas, mostrar quantas empresas ficaram de fora. Sem abas, orientar
a definir o Papel da PJ que já existe, em vez de mandar cadastrar uma nova.**

**Problema**
Duas situações, as duas verificadas em produção.

1. Uma PJ com Papel nulo ou "Sócia" simplesmente **não vira aba**, e a tela não diz uma
   palavra. Dois clientes têm isso hoje, com PR/CN aparecendo ao lado.
2. Quando nenhuma PJ se qualifica, o texto diz *"Este cliente não possui empresas
   Proprietária (PR) ou Controladora (CN) cadastradas"* e oferece "Ir para Qualificação das
   Partes". Dois clientes estão nesse estado **com PJ cadastrada** — o texto manda
   cadastrar, e a ação certa é definir o Papel da empresa que já existe.

**Ajuste**
Dois textos derivados do dado que a tela já carregou (`pessoas` já vem completa; nenhuma
consulta nova).

- **Com abas:** uma linha abaixo delas — *"{n} empresa(s) deste cliente não têm Papel
  Proprietária ou Controladora e não aparecem aqui."*
- **Sem abas, mas com PJ cadastrada:** a frase passa a nomear o que existe e a ação passa
  a ser definir o Papel — *"Este cliente tem {n} empresa(s) cadastrada(s), nenhuma com
  Papel Proprietária ou Controladora. Defina o Papel na Qualificação das Partes."*
- **Sem abas e sem PJ nenhuma:** o texto de hoje, que está correto.

**Onde mexer**
`src/pages/equipe/osg/QuadroSocietario.tsx`.

**Aceite**
- Num cliente com uma CN e uma PJ sem Papel, vejo a aba da CN e, abaixo, a frase contando
  a que ficou de fora.
- Num cliente com três PJ, todas sem Papel, o texto fala em **definir o Papel**, não em
  cadastrar empresa.
- Num cliente sem PJ nenhuma, leio o texto de hoje.

---

## 9. Um conceito, uma palavra: "participa da estruturação"

**Problema**
"Integraliz-" significa duas coisas na mesma tela. O filtro "Integralizados / Não
integralizados" lê `participa_estruturacao`; a coluna "Status", com o valor
"Integralizado", lê `status_integralizacao` — outro campo. E a própria linha usa uma
terceira redação para o primeiro: "Não participa da estruturação".

**Ajuste**
O filtro passa a se chamar **"Participa da estruturação"**, com as opções **"Todos" ·
"Participa" · "Não participa"**, casando palavra por palavra com a marca que a linha já
mostra. "Integraliz-" fica sendo só o status.

**Onde mexer**
`src/pages/equipe/osg/DiagnosticoPatrimonial.tsx` — rótulo e `SelectItem`. Os valores
internos do estado (`dentro`/`fora`) não mudam.

**Aceite**
- Filtrando por "Não participa", toda linha listada mostra a marca "Não participa da
  estruturação", com a mesma palavra.
- A palavra "integralizado" só aparece na coluna Status.

---

## 10. "Órfã" é dita uma vez

**Problema**
Três marcas para o mesmo estado na mesma linha: a coluna do "!" com balão, o badge "Órfã"
na coluna "Bem vinculado", e o contador no cabeçalho. O balão explica o que já está
escrito duas vezes ao lado — é literalmente o "tooltip que não explica" da percepção
original.

**Ajuste**
Sai a coluna do "!" e o balão dela. Ficam o badge "Órfã" e o contador. A definição vira
texto de apoio, uma vez, acima da tabela: *"Matrícula órfã é a que ainda não foi vinculada
a um bem."*

**Onde mexer**
`src/pages/equipe/osg/ControleMatriculas.tsx` — a primeira `TableHead`/`TableCell` e o
`ElementTooltip` saem.

**Aceite**
- Uma matrícula órfã mostra o badge "Órfã" e nada mais na linha.
- Leio uma vez, acima da tabela, o que "órfã" significa.
- A tabela tem uma coluna a menos.

---

## 11. O botão de criar fica sempre no mesmo lugar

**Problema**
"Nova PJ", "Nova PF", "Novo bem" e "Nova matrícula" ficam no cabeçalho do card da lista.
"Nova exploração rural" fica dentro do card de **Filtros**, ao lado dos campos de busca.

**Ajuste**
Passa para o cabeçalho do card da lista, como nas outras quatro.

**Onde mexer**
`src/pages/equipe/osg/ExploracaoRural.tsx` — o `Button` sai do `CardContent` dos filtros
para o `CardHeader` do card da tabela, que hoje tem título à esquerda e o resumo de
imóveis/área à direita. O resumo desce para uma linha própria abaixo do título.

**Aceite**
Nas cinco telas, o botão de criar está na mesma posição: à direita do título do card da
lista.

---

## 12. Os filtros ganham rótulo de verdade

**Problema**
Nas cinco telas o `<Label>` dos filtros é texto solto: sem `htmlFor`, e o campo sem `id`.
Clicar no texto não foca o campo, e nenhum campo de busca ou filtro tem nome acessível. A
busca da `TabelaSocios` não tem nem rótulo visível.

**Ajuste**
`htmlFor` + `id` nos campos de busca; `aria-label` nos `SelectTrigger` (o `Select` do Radix
é um botão, e envolvê-lo em `<label>` dispara o clique duas vezes — a regra está escrita no
`formKit.Campo`). A busca da `TabelaSocios` ganha `aria-label="Buscar sócio"`.

**Onde mexer**
As cinco páginas · `quadro-societario/TabelaSocios.tsx`.

**Aceite**
- Clicando no texto "Buscar", o cursor entra no campo de busca, nas cinco telas.
- O leitor de tela anuncia o nome de cada filtro e de cada busca.

---

## Classificação, depois das decisões de 21/09

Cada fatia aparece **uma vez**, e todas estão fechadas.

**Decisão fechada — segue para implementação**

| | Fatia | Decisão |
|---|---|---|
| §1 | Bem com movimento de quotas | bloquear e direcionar ao Quadro Societário |
| §2 | Pessoa presa a vínculo | conferir ao clicar; sem pré-carga por pessoa |
| §3 | Falha ≠ lista vazia | — (padrão escrito) |
| §4 | Nome do botão de ícone | corrigir o módulo agora; catraca global em tarefa separada |
| §5 | Lápis sai | aprovado |
| §6 | Elegibilidade visível | badge neutro + texto de apoio; sem mapa de cor novo |
| §7 | "Papel", nome e fonte únicos | — (fonte única, padrão escrito) |
| §8 | Quadro Societário diz por que a empresa não está lá | com abas, contar as que ficaram de fora; sem abas, orientar a definir o Papel |
| §9 | "Participa da estruturação" | aprovado |
| §10 | "Órfã" dita uma vez | aprovado |
| §11 | Lugar do botão de criar | aprovado |
| §12 | Rótulo dos filtros | — (padrão escrito, `formKit.Campo`) |

**Fora do escopo — história própria**

- **Preenchimento por CNPJ na Qualificação das Partes.** Pergunta do canal de 04/09, já
  registrada como tarefa própria na TIP-03 §6. Não é texto: é fluxo que não existe.
- **Flexão de número nos `(s)`** destas telas — "matrícula(s)", "órfã(s)", "imóvel(is)",
  "sócio(s)", "registro(s)", e o `(s)` dentro de `origemDoValor`. É a mesma frente aprovada
  em 21/09 para a Solicitação de Documentos; um lote só, para não haver duas redações.
- **O estado vazio da Exploração Rural** — "…para ver e gerenciar as explorações rurais."
  A forma canônica da TIP-03 §5 é "…para abrir {o quê} deste cliente.", e a Exploração
  Rural não estava naquela lista. É uma frase de copy: entra no lote de texto acima.
- **`...` no lugar de `…`** ("Carregando...", "Selecione...") — backlog paralelo declarado
  no padrão, com 216 ocorrências medidas.
- **`bg-osg-moss text-white` escrito à mão** em cinco botões dos modais e do Quadro. No
  tema OSG `--primary` **é** `--osg-moss`: o pixel é idêntico. É dívida de código, não
  problema de interface — não tratar como achado de UX.
- **Ampliar a catraca de `<Button title>`** ao repositório inteiro. Decidido em 21/09 como
  tarefa separada; acende cinco arquivos fora deste módulo (apêndice B).
- **Matrícula usada em exploração rural.** `exploracao_rural_imovel.matricula_id` é
  `NO ACTION`: excluir uma matrícula assim falharia com erro do banco. Em produção há
  **zero** explorações rurais, então o caso não existe hoje. Registrado, **não
  implementado** — decisão de 21/09 de não criar comportamento especulativo.

---

# Apêndice A — Evidência de produção

Medições de 21/09/2026, por `query_database` do MCP do Lovable, **apenas SELECT**, no
projeto `4cb1f76a-b443-437e-a047-67a69019a54a`. Nenhum dado pessoal foi lido.

## A.1 Volumes

| O que | Quanto |
|---|---|
| Bens | 26 |
| Matrículas | 33, das quais **8 órfãs** (24%) |
| Pessoas | 108 — 88 PF, 20 PJ |
| PJ por Papel | 9 PR · 5 CN · 2 SC · **4 sem Papel** |
| Parentescos | 21 |
| Movimentos de quota | 53, dos quais 42 pagos com bem |
| Titularidades | 52, de 19 pessoas distintas |
| Pessoas citadas em movimento de quota | 53 |
| **Explorações rurais** | **0** |

## A.2 O bem que sustenta a §1

```
id                                  ba44a1c0-0001-4000-a000-000000000001
referencia_dp                       PS-BARR-01
tipo_bem                            PS
status_integralizacao               Integralizado
matrículas                          0
movimentos de quota pagos com ele   42
```

O diálogo atual, para este bem, mostra o ramo "sem matrícula": *"Nenhuma matrícula
vinculada. Esta ação não pode ser desfeita."*

## A.3 O status dos bens, e a §6

| Status | `participa_estruturacao` | Bens | Vai ao documento? |
|---|---|---|---|
| Aprovado | true | 16 | **sim** |
| Integralizado | true | 4 | não |
| (nulo) | true | 3 | não |
| Não se aplica | true / false | 1 / 1 | não |
| Em análise | true | 1 | não |

Regra em `STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO`. **16 de 26**, e a lista não dá sinal.

A contradição possível pelo modelo — `participa_estruturacao = false` com
`status_integralizacao = 'Integralizado'` — **não ocorre hoje**: o único bem com
`participa = false` tem status "Não se aplica". A §9 corrige a colisão de vocabulário, não
um caso existente.

## A.4 As PJ invisíveis no Quadro Societário, e a §8

| Cliente | PJ com Papel PR/CN | PJ sem Papel ou "Sócia" |
|---|---|---|
| `284a18c6…` | 0 | 1 |
| `dab60768…` | 0 | 3 |
| `e1c0df8e…` | 2 | 1 |
| `63289a75…` | 2 | 1 |

Os dois primeiros veem a frase "não possui empresas PR ou CN cadastradas" **tendo empresas
cadastradas**. Os dois últimos veem abas, e uma empresa desaparece sem aviso.

## A.5 As regras de FK que sustentam a §1 e a §2

Lidas de `information_schema` em produção.

**Quem referencia `pessoa`:**

| Tabela filha | Coluna | Regra | Efeito de excluir a pessoa |
|---|---|---|---|
| `titularidade` | `titular_pessoa_id` | **RESTRICT** | **falha** (19 pessoas) |
| `acordo_signatario` | `pessoa_id` | **RESTRICT** | **falha** |
| `acordo_sociedade_relacionada` | `empresa_pessoa_id` | **RESTRICT** | **falha** |
| `movimentacao_quotas` | 4 colunas | **NO ACTION** | **falha** (53 pessoas) |
| `onus_quotas`, `itcd_simulacao*`, `exploracao_rural_parte` | várias | NO ACTION | falha |
| `parentesco` | `pessoa_id`, `parente_pessoa_id` | CASCADE | apaga — **é o único que o diálogo cita** |
| `checklist_cliente_item` | `pessoa_id` | CASCADE | apaga, e some do Checklist |
| `administracao` | `administrador_pessoa_id`, `pj_pessoa_id` | CASCADE | apaga |
| `projeto_flag_valor` | `pj_pessoa_id` | CASCADE | apaga |
| `solicitacao_item_nao_aplicavel` | `pessoa_id` | CASCADE | apaga |
| `documento_arquivo` | `pessoa_id` | SET NULL | documento fica sem dono |
| `pessoa` (cônjuge, filiação), `bem`, `exploracao_rural*`, `impedimento`, `acordo_quotistas`, `documento_gerado` | várias | SET NULL | desvincula |

**Quem referencia `bem`:**

| Tabela filha | Coluna | Regra |
|---|---|---|
| `movimentacao_quotas` | `bem_id` | **CASCADE** ← a §1 |
| `titularidade` | `bem_id` | CASCADE |
| `checklist_cliente_item` | `bem_id` | CASCADE |
| `solicitacao_item_nao_aplicavel` | `bem_id` | CASCADE |
| `matricula` | `bem_id` | SET NULL (o "manter matrículas" do diálogo) |
| `documento_arquivo` | `bem_id` | SET NULL |

**Quem referencia `matricula`:**

| Tabela filha | Coluna | Regra |
|---|---|---|
| `exploracao_rural_imovel` | `matricula_id` | **NO ACTION** ← hoje inócuo (0 explorações) |
| `titularidade`, `impedimento`, `checklist_cliente_item`, `solicitacao_item_nao_aplicavel` | `matricula_id` | CASCADE — os dois primeiros o diálogo cita |
| `documento_arquivo`, `matricula.matricula_anterior_id` | — | SET NULL |

---

# Apêndice B — Conferência contra os padrões da casa

Feita **antes** de fechar a redação, como na lista de 21/09. **Nenhum documento de padrão
precisou de correção.**

## B.1 `geral/texto-explicativo-na-tela.md` (em vigor desde 17/09)

A árvore da §2 **derrubou tooltip em quatro pontos** onde a percepção original pedia um:

| Onde | Degrau que resolveu | Resultado |
|---|---|---|
| Regra de elegibilidade do bem (§6) | 3 — vale toda vez, é necessária para decidir | texto de apoio visível, **não** tooltip |
| Definição de "órfã" (§10) | 3 — e o balão atual repetia o badge ao lado | texto de apoio, e o balão **sai** |
| Papel PR/CN no modal (§7) | 3 — informação para escolher o valor | texto de apoio abaixo do campo |
| "Precisa de ao menos um titular" (§4) | 3 — e o `title` atual **nunca** dispara | texto de apoio na seção |

A regra decisiva nos quatro: *informação necessária para preencher, decidir ou interpretar
não pode depender de passar o mouse.*

**Degrau 0** (§4) é o que governa os botões de ícone: o texto **é** o nome, `aria-label`
mais `<Tooltip>`, e `ButtonTooltip` faz os dois. "Não repita o rótulo" não vale ali.

**Mecanismo** (§4): `title=` só em `<iframe>`. As 4 ocorrências de `ControleMatriculas`, a
de `MatriculasSection` e a de `TitularidadeLinha` são conversão, não exceção.

**Mensagem contextual** (§3): as recusas da §1 e da §2 têm as duas partes — o que aconteceu
· o que fazer agora. O fecho de falha reusa `FECHO_SUPORTE`, que já existe no catálogo, em
vez de nascer de novo.

**O que não entra** (§4): nenhuma frase proposta usa "favor", "o mesmo", gerundismo,
"clique aqui", "realizar a validação" ou "o usuário". Nenhuma cita tabela, coluna ou código
de erro.

## B.2 `geral/paleta-por-area.md`

A §6 poderia ter virado um oitavo mapa de cor de status, ao lado dos sete que existem
(`chamado`, `entregavel`, `mapeamento`, `projeto`, `sprint`, `task`, `solicitacao`).
**Decisão de 21/09: não criar.** O selo fica neutro e a informação vai para o texto, o que
também respeita a regra de que **âncora nunca pinta papel de status** — o `text-osg-moss`
que hoje destaca "Fundador" e "Proprietária/Controladora" na Qualificação fica como está,
por não ser status, e não ganha companhia.

## B.3 A catraca `src/lib/textoDeAjuda.test.ts`

Duas coisas, e a segunda é o achado.

1. A dívida de `title=` em **tag nativa** fechou em 17/09 e está em **zero**. Nenhuma fatia
   daqui a reabre.
2. A catraca de **`<Button title>`** existe, é feita com o parser do TypeScript, e cobre
   **apenas os sete arquivos da TIP-02**. Por isso as seis ocorrências deste módulo passam
   caladas. A §4 as converte; **ampliar o recorte da catraca é tarefa separada**, decidida
   em 21/09, e acende cinco arquivos fora daqui:

   `pages/equipe/osg/OrgaosGovernanca.tsx` (2) · `osg/montagem/MontadorWorkbench.tsx` (3) ·
   `osg/biblioteca/FichaBloco.tsx` (3) · `equipe/dev/consulta-efd-icms/EfdResultsTable.tsx`
   (2) · `equipe/dev/efd-export/EFDExportProfiles.tsx` (2).

## B.4 `sprints/sprint-13/Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md` (TIP-03)

Executada em 18/09. **Nada desta lista repete aquela.** Conferido item a item:

- §5 daquela lista canonizou o estado vazio — *"Selecione um cliente na barra acima para
  abrir {o quê} deste cliente."* As quatro telas de lá já estão conformes. A Exploração
  Rural não estava na lista (é mais nova) e continua fora de forma; está registrada no
  "fora do escopo", junto do lote de texto.
- §6 acrescentou o texto de apoio da Qualificação das Partes; está na tela e não se mexe.
- §3 tirou o "(!)" do rótulo do filtro de órfãs; feito. A §10 daqui trata da **coluna**, que
  é outro controle.
- §7 mapeou os placeholders; segue backlog paralelo.

## B.5 `AGENTS.md`

- **Nenhuma migration, nenhum enum, nenhuma RPC.** Os dois hooks novos são `SELECT`.
- Componente não fala com o Supabase: `useMovimentosDoBem` e `useVinculosDaPessoa` nascem
  em `src/hooks/`.
- Teto de 600 linhas: `DiagnosticoPatrimonial.tsx` está em 391 e ganha pouco; o
  `EstadoDeFalha` extraído tira linha das cinco.
- `useDeletePessoa` já usa `useAuditLog`; nenhuma mutation nova é criada.

---

# Apêndice C — O que a leitura conferiu e não virou tarefa

- **O Quadro Societário é a tela mais bem resolvida das cinco**, e serve de referência para
  as outras: um comando só ("Registrar movimento"), a porta de escolha do gesto antes do
  formulário, a coluna de Ações removida da tabela com o motivo escrito, e a
  indisponibilidade de cada gesto dita por extenso em vez de escondida num botão
  desabilitado. As §5 e §4 levam esse mesmo critério às outras quatro.
- **A Exploração Rural é a única que já acerta** o estado de erro e o `aria-label`. Ela
  entra nesta rodada só nos ajustes de consistência que se aplicam (§3 parcial, §4, §5,
  §11, §12) — decisão de 21/09 de não criar comportamento especulativo enquanto não houver
  uso real (0 registros em produção).
- **`AjudaSocietaria`** é o único "(i)" de ajuda das cinco telas, e está bem construído
  (abre por teclado, fecha no Escape antes do diálogo, não dispara o controle ao lado).
  Nenhuma fatia daqui precisou dele; se alguma explicação futura passar do degrau 4, é ele
  que se reusa, não um balão novo.
- **`useAllMatriculas`** carrega todas as matrículas do banco e filtra o cliente no
  cliente. Funciona com 33 linhas; é dívida a observar, não a corrigir aqui.
