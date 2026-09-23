# TAREFA Relatorios e Apresentacoes

**Responsável: Alexandre • Origem: TIP-03 e revisão de 18/09/2026**

> **🟡 Código concluído em 18/09/2026.** A validação funcional fica pendente do sandbox: publicar as
> duas Edge Functions e subir os três modelos `.pptx` no bucket `osg-templates`. Sem isso, os decks
> patrimonial e societário continuam respondendo 404 e não há como encerrar a tarefa honestamente.

## Subtarefas

- **T1 ✅** Aplicar os textos, rótulos e estados vazios aprovados.
- **T2 ✅** Implementar o alternador de orientação e a impressão do diagrama.
- **T3 ✅** Mostrar um resultado por apresentação solicitada, sem mascarar falhas nem confirmar
  download sem URL.
- **T4 🟡** Publicar e testar no sandbox as duas Edge Functions e os três modelos. Atualizar o status
  para concluído somente depois dos três downloads e da impressão em ambas as orientações.

**⚠️ MUDANÇA DE RPC - pré-requisito de T4:** publicar `gerar-apresentacao` e
`gerar-slides-tributarios`. No bucket privado `osg-templates`, subir exatamente
`TEMPLATE_PATRIMONIAL.pptx`, `TEMPLATE_SOCIETARIA.pptx` e `TEMPLATE_TRIBUTARIO.pptx`. Para o
planejamento tributário, o sandbox também precisa das migrations já existentes que criam
`wp_importacao` e `wp_apresentacao`, incluindo `20260901203113`, `20260901210821` e
`20260904200000`.

**Objetivo:** aplicar a revisão de títulos e subtítulos das duas telas de saída do OSG Work, separar
o que é texto do que é funcionalidade, e deixar o desenho da estrutura legível — que é a única
crítica que não se resolve escrevendo melhor.

**Escopo:** as rotas `/equipe/osg/work/relatorios` e `/equipe/osg/work/apresentacoes`, o
agrupamento que as contém no menu, e o diagrama `EstruturaAtual`.

**Origem dos achados:**

| Fonte | O que ela traz | Peso |
|---|---|---|
| `Revisao_textos_OSG_Work_para_analista.docx`, 18/09/2026 | 20 trocas de texto, justificadas uma a uma, e 8 pontos técnicos | pedido da coordenação |
| Canal, Patrícia, 18/09 11:44 e áudio | "você deixa relatórios e apresentações… acho que fica mais clean do que a Biblioteca ali"; "slides fazem parte de apresentações, você não tá gerando slides, tá gerando apresentação" | decisão |
| Canal, Patrícia, 18/09 — **três áudios** | o desenho em duas faixas não deixa ver "quem tá em quem"; o vão entre as faixas está apertado demais; **e um alternador vertical/horizontal para a pessoa escolher** | decisão |
| Canal, Patrícia, 18/09 | "eu sei q tem coisa do slide que ainda nao ta pronta, só desconsiderar essas partes" | recorte de escopo |
| Leitura do código, 18/09 | confirma 14 itens, contradiz 5 e acha a causa de um sexto | verificação |

**Nota de estado:** o subtítulo de Relatórios **já está** mapeado na
[`Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md`](../sprints/sprint-13/Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md)
§2, com outra redação. Os dois textos corrigem o mesmo erro; o §2 desta lista resolve a colisão, e
a linha de lá sai no mesmo commit.

---

## 0. O que sai de escopo, por decisão da Patrícia

"Só desconsiderar essas partes" retira desta lista **tudo que vive dentro do .pptx**, porque o
conteúdo do deck ainda não está pronto:

- a seção 3 inteira do documento (títulos e subtítulos dos 5 slides, `3. Tributário` → `3.1`,
  `3.3`, `3.5`);
- a decisão "peça independente × capítulo 3 de um deck maior";
- a numeração que pula de 3.1 para 3.3 e repete 3.5;
- o `[nota a preencher]` no primeiro slide.

**O que NÃO sai junto:** os textos **da tela** que prometem esse conteúdo. Enquanto duas das três
peças não geram arquivo, a tela não pode afirmar que geram — ver §7. Os slides ficarem para depois
é motivo para **segurar** o texto do rodapé, não para publicá-lo.

---

## 1. O nome das duas páginas

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Menu → agrupamento | Rótulo do grupo | Relatórios e **Slides** | Relatórios e **Apresentações** | **Decisão da Patrícia, 18/09, com o motivo dela:** *"slides fazem parte de apresentações, então você não tá gerando slides, tá gerando apresentação"*. O slide é a parte; a apresentação é a entrega, e é ela que o menu nomeia |
| Menu, cabeçalho e painel de entrada | Rótulo da tela | **Biblioteca de** Apresentações | **Apresentações** | Mesma decisão. E "Biblioteca" já nomeia outra tela da área — **Biblioteca de Modelos**, na Oficina de Contratos. Duas bibliotecas em menus vizinhos guardando coisas diferentes |
| Controle de Acessos | Nome da página | Biblioteca de Apresentações | Apresentações | É o nome que o gestor lê ao conceder acesso; tem de ser o mesmo do menu |

**Como implementar:** `src/lib/navegacaoOsgWork.ts:263` (label) e `:348` (rótulo do grupo);
`src/config/protectedPages.ts:797` (`page_name`). **A chave `bibliotecaApresentacoes` e a rota
`/equipe/osg/work/apresentacoes` não mudam** — a rota é `page_path`, chave de `page_permissions` em
produção, e a chave do objeto é nome interno. O `page_name` novo chega ao banco sozinho, pelo
`useSyncProtectedPages`. **Nome de arquivo e de componente também ficam** (`BibliotecaApresentacoes.tsx`).

**A coluna "SLIDES" da tabela fica** (`BibliotecaApresentacoes.tsx:136`). O critério dela separa as
duas coisas: slide é a **parte**, e contar as partes de cada apresentação é o que a coluna faz.
O que sai é "Slides" como **nome da entrega**, que é o caso do rótulo do menu.

**Divergência registrada:** o documento de revisão lista "Biblioteca de Apresentações" entre os
itens *"que podem ser mantidos"*. A decisão do canal é posterior e é da coordenação; ela manda.

---

## 2. Texto que não descreve a tela

O subtítulo de Relatórios promete "diagnóstico patrimonial e quadro societário" — que são as duas
peças da **outra** tela. É o mesmo achado da TIP-03 §2, e há duas redações concorrentes:

| Origem | Redação proposta |
|---|---|
| `Ajustes_Demais_Rotas…` §2 | "Consulte e imprima a relação de terras exploradas e a estrutura atual do cliente." |
| Documento de revisão, 18/09 | "Consulte informações sobre os imóveis explorados, produtores responsáveis e origem da posse." |

**Redação a aplicar** — junta o verbo da primeira com o conteúdo da segunda, e sobrevive ao renome
dos dois relatórios no §3:

> **Consulte e imprima os imóveis explorados, os produtores responsáveis e a origem da posse.**

**Por que não uma das duas puras:** a da TIP-03 nomeia os relatórios pelos títulos de hoje, que o §3
troca — ela nasceria desatualizada. A do documento de revisão perde **"imprima"**, que é a única
ação da tela: não há geração de arquivo ali, o PDF sai pela impressão do navegador.

| Local | Campo | Texto atual | Ajustar para |
|---|---|---|---|
| Menu e cabeçalho → Relatórios | Subtítulo | "Os relatórios de tela do cliente: diagnóstico patrimonial e quadro societário." | "Consulte e imprima os imóveis explorados, os produtores responsáveis e a origem da posse." |
| Controle de Acessos | Descrição da página | "Relatórios de tela do cliente: diagnóstico patrimonial e quadro societário" | "Imóveis explorados, produtores responsáveis e origem da posse, para consulta e impressão" |

**Como implementar:** `src/lib/navegacaoOsgWork.ts:255` e `src/config/protectedPages.ts:790`.
**E apagar a linha correspondente da TIP-03 §2 no mesmo commit** — duas listas com a mesma correção
em redações diferentes divergem na primeira que for aplicada.

---

## 3. Tela Relatórios — títulos, subtítulos e rodapés

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Cabeçalho da coluna | Rótulo | RELATÓRIO DE TELA | RELATÓRIOS | A coluna lista mais de um |
| Relatório 1 | Título | Relação de terras exploradas | **Terras e áreas exploradas** | "Relação de" não acrescenta significado |
| Relatório 1 | Subtítulo | "Instrumentos de exploração rural, com imóvel, área cedida e prazos." | "Imóveis rurais explorados, com matrícula, localização, áreas e, quando houver, dados do instrumento de exploração." | **O código confirma o achado:** sem registro em `exploracao_rural` a tabela cai para as matrículas e mostra 6 colunas em vez de 13 — outorgante, prazos e sacas/ha somem. O texto de hoje promete contrato mesmo quando não há nenhum |
| Relatório 2 | Título | Estrutura atual — produtores e imóveis | **Produtores por imóvel e origem da posse** | O título de hoje exige interpretação; o novo diz qual relação será mostrada |
| Relatório 2 | Subtítulo | "Quem explora cada imóvel hoje, e por qual origem de posse." | "Veja quem explora cada imóvel e qual é a origem da posse." | **Adaptado — ver §6.a:** a sugestão original fechava a lista em "própria, parceria ou arrendamento", e o desenho tem cinco categorias |
| Relatório 2 | Legenda | "a cor é a origem da posse de cada imóvel" | "A cor indica a origem da posse de cada imóvel." | Frase de legenda, com verbo que diz a função da cor |
| Rodapé da lista | Texto | "Marque o que entra na impressão." | "Selecione os relatórios que devem entrar na impressão." | "O que" é genérico; o novo nomeia o objeto e o efeito |
| Nota de destino | Texto | "Não viram .pptx. Vão para a área Fiscal no pacote de abertura de demanda, junto com o que estiver em Documentos do Cliente." | "Estes relatórios não geram arquivos .pptx. Eles serão incluídos na área Fiscal do pacote de abertura de demanda, junto aos arquivos de Documentos do Cliente." | Instrução operacional sem sujeito implícito |
| Estado vazio | Texto | "Selecione um cliente na barra acima para ver os relatórios de tela." | "Selecione um cliente na barra acima para abrir os relatórios deste cliente." | **Acréscimo desta lista:** é a forma canônica fixada na TIP-03 §5, e estas duas telas não estavam entre as seis de lá |

**Como implementar:** `src/components/equipe/osg/relatorios/catalogoDaBiblioteca.ts:75-76` e `:81-82`
(nome e origem das duas peças); `src/pages/equipe/osg/Relatorios.tsx:86` (cabeçalho), `:116`
(rodapé), `:131-132` (nota), `:69` (estado vazio);
`src/components/equipe/osg/relatorios/EstruturaAtual.tsx:142` (legenda).

**Dois textos que andam junto com o renome e não estão no documento:**

- `TerrasExploradas.tsx:186` — "Carregando a **relação de terras**…". Com o título sem "relação de",
  a espera fica sendo o único lugar que ainda usa a palavra. Vira "Carregando as terras
  exploradas…". **`TerrasExploradas.test.tsx:108` asserta essa string** e muda no mesmo commit.
- `EstruturaAtualDoCliente.tsx:28` — "Carregando a **estrutura atual**…" → "Carregando os produtores
  e imóveis…".

**Um item que o documento manda manter e que o renome derruba:** o bloco interno do primeiro modal
chama-se **"Imóveis e áreas exploradas"**, e o cartão passa a chamar-se **"Terras e áreas
exploradas"**. O modal empilharia dois cabeçalhos quase idênticos — exatamente o que o `modoPrevia`
do diagrama existe para evitar. **Esconder o cabeçalho da `Secao` quando `modoPrevia`**
(`TerrasExploradas.tsx:241`), como a `EstruturaAtual` já faz: o título do modal já nomeia a peça.

---

## 4. Tela Apresentações — títulos, subtítulos e ações

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Menu e cabeçalho | Subtítulo | "Escolha o que vai para a apresentação do cliente e gere o deck." | "Selecione as apresentações que deseja gerar para o cliente." | Cada peça é um arquivo, não um deck único. **"Gerar" está certo e não é escolha** — ver §6.d |
| Peça 1 | Subtítulo | "Bens, titularidades e matrículas do cadastro patrimonial." | "Bens, titularidades e matrículas consolidados a partir do cadastro patrimonial." | É apresentação construída **a partir** do cadastro, não o cadastro |
| Peça 2 | Título | Quadro Societário **/** Organograma | Quadro Societário **e** Organograma | A barra sugere alternativa; a peça reúne as duas visões |
| Peça 2 | Subtítulo | "Empresas, sócios e participações do quadro societário." | "Empresas, sócios e participações organizados em uma visão da estrutura societária." | O texto de hoje repete o título sem dizer o que se recebe |
| Peça 3 | Título | Papéis de Trabalho — Planejamento Tributário | **Planejamento Tributário** | "Papéis de Trabalho" é material interno de apoio; o que chega ao cliente é análise tributária |
| Peça 3 | Subtítulo | *não aparece na linha* | "Premissas, carga tributária, transferência da atividade rural e resumo da tributação." | **Não é falta de texto, é falta de lugar** — ver §6.b |
| Botão | Rótulo | Gerar apresentação | Gerar apresentações | Marca-se mais de uma peça e cada uma é um arquivo |
| Rodapé | Texto | "Cada peça marcada baixa o .pptx dela. O histórico dos arquivos do planejamento tributário fica no Gerador de Slides, no Digital Dev." | "Cada peça selecionada gera um arquivo .pptx separado. O histórico dos arquivos de Planejamento Tributário fica no Gerador de Slides, no Digital Dev." | **Só depois do §7.** Hoje a frase é falsa para duas das três peças |
| Estado vazio | Texto | "Selecione um cliente na barra acima para gerar a apresentação." | "Selecione um cliente na barra acima para abrir as apresentações deste cliente." | Forma canônica da TIP-03 §5 |
| Toast de sucesso | Título | "**Papéis de Trabalho**: apresentação {v} gerada" | "**Planejamento Tributário**: apresentação {v} gerada" | Vai junto com o renome: mesma palavra no cartão, no botão e no toast |

**Como implementar:** `catalogoDaBiblioteca.ts:47-48`, `:54-55`, `:64-65` (as três peças);
`src/lib/navegacaoOsgWork.ts:264` (subtítulo); `BibliotecaApresentacoes.tsx:189` (botão), `:194-197`
(rodapé), `:114` (estado vazio), `:90` (toast). **Não renomear** `PapeisDeTrabalhoReport.tsx`,
`useDomainPapelDeTrabalho.ts` nem a tabela `wp_apresentacao`: são nomes internos.

---

## 5. O desenho: a escolha da orientação e o vão entre as faixas

**Três áudios da Patrícia, 18/09, e são dois pedidos, não um:**

> *"Vê se tem uma opção de colocar vertical ou horizontal pra pessoa escolher, porque do jeito que
> tá aí não tá legal."*
>
> *"O espaço entre as duas colunas, quando tá aí na horizontal, tá muito pequeno. Tem que aumentar
> um pouco essa distância das duas linhas, para ver melhor de onde as linhas estão saindo."*
>
> *"Se a finalidade daquilo for colocar numa apresentação, isso de linha aí não — nem tirando o
> zoom consegue ficar legal."*

O primeiro áudio é o **botão**. O segundo vale para as duas orientações e é o que faz o desenho
ficar legível em qualquer uma delas.

### 5.1 O vão entre as duas faixas — vale mesmo sem o botão

**A conta de hoje** (`EstruturaAtual.tsx:52`): `rowGap = 130` e `boxH = 58`, então entre a base das
caixas de produtor e o topo das de imóvel sobram **72 px**. As curvas (`:104`) são cúbicas com os
dois pontos de controle na metade dessa altura — e precisam vencer até 210 px na horizontal dentro
desses 72 px. Elas saem quase verticais, encostadas umas nas outras junto às caixas, e é exatamente
ali, no ponto de saída, que se leria "quem está em quem".

**Ajuste:** `rowGap` para **190** — o vão passa de 72 para 132 px, e a altura total de 228 para 288.
Na vertical, o equivalente é a distância entre as duas colunas, que tem de ser ao menos tão
generosa. É um número para conferir na tela com um cliente de verdade, não para fechar aqui.

### 5.2 O alternador vertical / horizontal

**Horizontal** é o que existe: duas faixas, produtores em cima, imóveis embaixo, nós espalhados no
eixo X. A largura cresce **210 px por imóvel** sobre um mínimo de 820 — com uma dúzia de imóveis o
SVG passa de 1.600 px, e é por isso que o modal tem zoom automático. É também a forma convencional
do organograma de estrutura.

**Vertical** é o bipartido girado: produtores na coluna da esquerda, imóveis na da direita, cada
lista descendo, e as ligações atravessando o vão na horizontal.

| | Horizontal (hoje) | Vertical |
|---|---|---|
| Largura | cresce com o nº de imóveis (≥ 820, +210 cada) | fixa, ~820 — cabe sem zoom |
| Altura | fixa (228 hoje, 288 com o §5.1) | cresce com `max(nº produtores, nº imóveis)` |
| Rótulos `PRODUTORES` / `IMÓVEIS` | à esquerda de cada faixa (`:98-99`) | cabeçalho de cada coluna |
| Ligações | curvas verticais, cruzando-se no vão | curvas horizontais, uma altura por linha |
| `padL = 118` | reserva para os rótulos laterais | some; a reserva vira o topo |
| Onde ganha | poucos imóveis; é a forma que se espera de um organograma | listas longas, e leitura de nome (o nome corre na direção do texto) |

**Padrão de abertura: horizontal**, que é o que existe hoje e o que Alexandre registrou como
convenção no canal. **A escolha fica lembrada por usuário em `localStorage`**, como os filtros por
página da casa — quem prefere vertical escolhe uma vez.

**Onde o botão fica:** um alternador de dois estados no canto superior direito da área do desenho,
**dentro do próprio relatório** e com `print:hidden`. Não no cabeçalho do `PreviaEmModal`, ao lado
do zoom: aquele cabeçalho é genérico e serve os dois relatórios, e o controle é de um só. Dentro do
relatório, ele aparece igual na tela e na prévia — onde o cabeçalho da peça está escondido
(`modoPrevia`), que é justamente onde ela viu o problema.

**O estado tem de morar acima do desenho.** A `Relatorios.tsx` monta **duas instâncias** do mesmo
relatório: a da prévia (`:153`) e a do bloco que só existe na impressão (`:144`). Com o estado
dentro da `EstruturaAtual`, a orientação escolhida na prévia não chegaria ao papel — imprimiria
sempre horizontal. Sobe para a página, ou para o `localStorage` lido pelas duas.

### 5.3 Duas coisas a acertar junto

1. **A impressão.** O SVG sai com `width="100%"` e `viewBox`; na vertical, proporção alta e estreita
   na largura da página estica para fora da folha. Limitar a altura em `@media print` — o bloco de
   impressão é opt-in por `data-area-de-impressao`, em `index.css` — ou paginar a lista.
2. **A legenda não cobre o que o código pinta.** `origemDe` (`:7-14`) devolve **cinco** categorias —
   Própria, Parceria, Arrendamento, **Posse** e o fallback **"a definir"** —, e a legenda mostra
   três (`:136-138`). Imóvel em composse sai cinza sem entrada na legenda. Acrescentar as duas.

**Como implementar:** `src/components/equipe/osg/relatorios/EstruturaAtual.tsx` — o `useMemo` do
layout passa a receber a orientação, e o `<svg>` desenha a partir dela; o alternador e o
`localStorage` em `EstruturaAtualDoCliente.tsx` ou em `Relatorios.tsx`. O componente é usado **num
lugar só**, e **não entra em deck nenhum**: a mudança não alcança .pptx.

**Uma premissa do áudio que o código não confirma:** *"se a finalidade daquilo for colocar numa
apresentação"*. Este desenho **não vira slide** — ele é relatório de tela, e vai para a área Fiscal
no pacote de abertura de demanda, impresso. O organograma que entra em apresentação é o da peça
**Quadro Societário e Organograma**, que é outro componente (`SocietarioReport`) e não muda aqui. Se
a intenção for levar a estrutura de produtores e imóveis também para o deck, **é frente nova** — e
vale decidir antes, porque muda onde o esforço de legibilidade rende.

---

## 6. O que a revisão pediu e o código contradiz

Cinco itens do documento não passam na conferência "o sistema faz isto?". Nenhum é erro de quem
escreveu — são telas parecidas, e quem revisa não lê o código. O erro seria aplicar.

### a. "Veja … se a posse é própria, parceria ou arrendamento" — **adaptar**

São **cinco** origens no código, não três (`EstruturaAtual.tsx:7-14`). Fechar a lista em três faz o
subtítulo mentir no primeiro cliente com composse. Fica **"…e qual é a origem da posse"**, e as
categorias aparecem na legenda — que é onde elas cabem, e onde faltam duas (§5).

### b. "Peça 3 é a única sem subtítulo descritivo" — **verdade, com outra causa**

Não é texto faltando: o texto **existe** no catálogo (`catalogoDaBiblioteca.ts:65`, "Premissas,
carga tributária e transferência da atividade rural, por revisão"). A linha da peça tributária
renderiza o **seletor de revisão no lugar dele** (`BibliotecaApresentacoes.tsx:158-162`): onde as
outras dizem de onde vêm os dados, esta diz qual revisão vai. **A correção é de layout** — as duas
linhas, subtítulo em cima e revisão embaixo —, não de redação.

### c. "Revisão 3 → Revisão 3 · Versão 5" — **devolver**

São **dois contadores diferentes**, e o segundo não é estável:

- `Revisão 3` = a 3ª importação do papel de trabalho (`wp_importacao.versao`);
- `v5` no nome do arquivo = a **5ª geração** feita a partir dessa revisão (`wp_apresentacao.versao`,
  `useDomainPapelDeTrabalho.ts:389`), e ela **sobe a cada clique no botão**.

Escrever "Versão 5" fixo na linha envelhece no primeiro uso: o próximo arquivo é o v6. Se a
rastreabilidade for o objetivo, o texto honesto é **"Revisão 3 · 09/09/2026 · última gerada: v5"**,
lido de `useApresentacoesDaRevisao`. **Recomendação: não pôr nenhum dos dois na linha.** O histórico
de arquivos gerados é do Gerador de Slides, no Digital Dev, e o rodapé já diz isso.

### d. "Validar se é 'Gerar' ou 'Baixar'" — **resolvido: gera**

As duas funções montam o arquivo na hora. A `gerar-apresentacao` devolve os bytes em base64 e o
navegador salva (`useGerarApresentacao.ts:23-35`); a `gerar-slides-tributarios` grava e devolve URL.
Não há arquivo pronto esperando download. **"Gerar apresentações" está correto** — a ressalva do
documento não se aplica.

### e. "O relatório 2 não tem texto de apoio, o 1 tem" — **adaptar**

O do relatório 1 é **condicional** (`TerrasExploradas.tsx:248-255`): só aparece quando não há
instrumento cadastrado, para explicar por que a tabela veio com menos colunas. Em cliente com
exploração cadastrada, **os dois modais estão igualmente sem apoio** — a assimetria que o documento
viu é um estado, não um padrão.

E o texto sugerido — "Relação atual entre produtores, imóveis e origem da posse" — repete o
subtítulo do cartão e a legenda; seriam três frases sobre origem da posse no mesmo modal. **A linha
que falta é a que responde a Patrícia:**

> Cada linha liga um produtor ao imóvel que ele explora hoje.

**Como implementar:** texto de apoio permanente no topo do modal do relatório 2, pelo §3 do padrão
`docs/geral/texto-explicativo-na-tela.md`.

---

## 7. O que é funcionalidade, e por que segura dois textos

### 7.1 O aviso de falha existe — e é engolido pelo toast seguinte

O documento registra *"ao selecionar peças que não geram arquivo, a interface não exibe aviso"*. A
interface **exibe**; ele some. Duas causas somadas:

1. **`TOAST_LIMIT = 1`** (`src/hooks/use-toast.ts:5`). O `disparar()` roda os decks da OSG primeiro e
   a peça tributária depois. O toast de falha dos decks aparece e, um instante depois, o toast
   "Planejamento Tributário: apresentação gerada" **toma o lugar dele**. Sobra na tela a única
   mensagem que diz que deu certo, enquanto dois dos três arquivos não vieram.
2. **O `catch` é cego** (`useGerarApresentacao.ts:63-69`). 404, timeout, erro de servidor e resposta
   vazia caem todos na mesma mensagem amigável, sem `variant: 'destructive'` — e a mensagem manda
   *"por ora, use 'Copiar tabela'"*, **botão que não existe mais em tela nenhuma** (única ocorrência
   da string no repositório é a própria mensagem).

**O que fazer:** acumular o resultado das duas gerações e dar **um** toast no fim, dizendo o que
veio e o que não veio; erro real com `variant: 'destructive'` e a instrução da casa ("Entre em
contato com o suporte da PSA Digital"); e tirar a referência ao "Copiar tabela". Para peça que
falhou repetidamente, marca permanente na linha vale mais que toast — toast passa.

### 7.2 A contagem "3 de 3 · 8 slides" — conteúdo e retorno precisam concordar

O documento diz que a tela *"soma slides de peças que hoje não geram arquivo"*. A conta já exclui
peça sem dado: `geraveis` filtra por `temConteudo`, e peça vazia nem marca
(`BibliotecaApresentacoes.tsx:62-65`). Os 8 são reais — 1 patrimonial + 2 societária + 5 tributário
—, e vêm de dado cadastrado de verdade.

**O que quebrou não foi a soma dos slides, foi a confirmação de entrega.** A tela continua contando
o conteúdo disponível, mas agora confirma cada apresentação selecionada pelo `tipo` devolvido pela
função. Retorno parcial, 404 e ausência de URL no tributário aparecem como falha da peça correta;
o toast nunca mais conta chamadas HTTP como se fossem apresentações.

### 7.3 A geração 404 das duas peças da OSG

`supabase/functions/gerar-apresentacao/` existe no repositório; o 404 do `functions.invoke` é
resposta de função não publicada no ambiente testado. **Fora do escopo desta lista** (é o "coisa do
slide que ainda não está pronta"), mas **é ela que segura dois textos**:

- o **rodapé** de Apresentações (§4) só entra depois que as três peças gerarem — antes disso a frase
  "cada peça selecionada gera um arquivo .pptx separado" é falsa;
- os **subtítulos das peças 1 e 2** (§4) descrevem arquivos que ninguém abriu ainda; confirmar
  contra o .pptx quando ele existir.

---

## 8. Ordem de execução

1. **§1 e §2** — nome das páginas e subtítulo de Relatórios. Independentes de tudo, e é o que a
   Patrícia decidiu hoje. Sai a linha da TIP-03 §2 no mesmo commit.
2. **§3** — Relatórios, texto a texto, mais os dois textos de carregamento e o cabeçalho duplicado
   no modal.
3. **§5.1** — abrir o vão entre as faixas, e a legenda de cinco categorias (§5.3.2). São duas
   constantes e três linhas de legenda; melhoram o desenho **antes** de existir alternador, e é o
   que responde ao segundo áudio.
4. **§4, exceto rodapé e subtítulos das peças 1 e 2** — títulos, botão, estado vazio, toast, e o
   subtítulo da peça tributária pelo §6.b.
5. **§5.2** — o alternador de orientação, com o estado acima das duas instâncias e a impressão
   seguindo a escolha. É o maior item da lista e o único que mexe em desenho, não em texto.
6. **§7.1** — o aviso de falha que some e a mensagem que cita botão inexistente.
7. **Depois que as peças 1 e 2 gerarem:** rodapé de Apresentações, subtítulos das peças 1 e 2
   conferidos contra o arquivo, e §6.c decidido com a rastreabilidade na mão.

---

## 9. Varredura e fechamento

Sete arquivos contêm as strings desta lista — nenhum outro:

| Arquivo | O que muda |
|---|---|
| `src/lib/navegacaoOsgWork.ts` | `:255` subtítulo, `:263` label, `:264` subtítulo, `:348` grupo |
| `src/config/protectedPages.ts` | `:790` descrição, `:797` nome. **`page_path` não muda** |
| `src/components/…/relatorios/catalogoDaBiblioteca.ts` | as 5 peças, nome e origem |
| `src/pages/equipe/osg/Relatorios.tsx` | `:69`, `:86`, `:116`, `:131-132`, e o estado da orientação acima das duas instâncias (`:144` e `:153`) |
| `src/pages/equipe/osg/BibliotecaApresentacoes.tsx` | `:90`, `:114`, `:158-162`, `:189`, `:194-197` |
| `src/components/…/relatorios/EstruturaAtual.tsx` | `:52` o vão, `:136-142` a legenda, e o layout pela orientação |
| `src/components/…/relatorios/TerrasExploradas.tsx` | `:186` carregando, `:241` cabeçalho no modal |

Mais `EstruturaAtualDoCliente.tsx:28`, `useGerarApresentacao.ts:63-69` e
`TerrasExploradas.test.tsx:108`.

**Antes de dar por pronto:**

- [ ] `bunx vitest run` nos testes dos arquivos tocados (`TerrasExploradas.test.tsx`,
      `PapeisDeTrabalhoReport.test.tsx`, `areaTheme.test.ts`, `areaCategories.test.ts`)
- [ ] `bunx eslint` nos arquivos alterados · `bun run typecheck`
- [ ] menu, cabeçalho, painel de entrada e Controle de Acessos dizendo **Apresentações**
- [ ] o diagrama conferido em cliente com ≥ 8 imóveis, **nas duas orientações**, na tela e na
      impressão — e a orientação escolhida na prévia chegando ao papel
- [ ] o vão novo olhado com a Patrícia antes de fechar o número
- [ ] marcar as três peças com a geração fora do ar e ver **um** aviso que diz o que não veio

---

## 10. O que fica de fora, e é decisão

- **Tudo que vive dentro do .pptx** — Patrícia, 18/09. Ver §0.
- **A rota, a chave do objeto, o nome do arquivo e o nome do componente** de Apresentações.
- **`PapeisDeTrabalhoReport`, `useDomainPapelDeTrabalho`, `wp_apresentacao`** — o renome do cartão
  não desce para nome interno.
- **A soma de slides por conteúdo** — §7.2: é a informação anterior ao clique; a confirmação de
  arquivos agora é feita separadamente, por apresentação.
- **"Versão 5" na linha da peça tributária** — §6.c: é um contador que sobe a cada clique.
- **Levar o desenho de produtores e imóveis para dentro de um deck** — §5.3. Hoje ele é relatório de
  tela e sai impresso; pôr no .pptx é frente nova, e vale decidir antes de investir na legibilidade
  de um formato que mudaria de destino.
- **Publicar a `gerar-apresentacao`** — é entrega de produto, não de texto, e é o que destrava o
  passo 7 do §8.
