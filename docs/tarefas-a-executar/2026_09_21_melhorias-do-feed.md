# Checklist de melhorias do Feed

**Lista fechada em 21/09/2026.** Saiu da comparação entre o Slack da OSG (9 canais, leitura de
campo feita no navegador) e a tela de Feed rodando. O que o Slack resolve e o feed não tem onde
resolver virou item; o que aparece no Slack mas pertence a outro lugar do sistema (documento,
prazo de tarefa, agenda, RH) ficou de fora de propósito, porque o risco da frente é o feed virar
clone de Slack.

**O que o feed é hoje**, para não redesenhar o que já existe: stream único e cronológico de
`org_comments`, agrupado por dia e, dentro do dia, pela origem da fala (tarefa ou projeto).
Filtros de cliente, projeto, autor, só menções e período vivem na URL (`src/lib/feedFiltros.ts`),
a página vem da RPC `feed_org_comments` por cursor e o recorte de quem vê o quê é RLS. Menção e
resposta já geram notificação no sino (`org_comment_mentions`). Anexo já existe (até 5 arquivos,
10 MB cada). Thread e exclusão de comentário existem; edição, não.

A ordem abaixo é por dor observada dividida por custo aparente, não por facilidade.

---

## P1 · Destrava a substituição do Slack

### 0. Barra de clientes com novidade, e a marca de "até onde eu li" ✅ ENTREGUE (22/09/2026)

Não estava nesta lista: nasceu de um desenho do Bernardo em 22/09/2026, e é o item que
tirou a **marca de não lido** da seção "fora desta lista, e é decisão" logo abaixo. O feed
responde "o que aconteceu" e nunca respondeu "o que aconteceu DESDE QUE EU SAÍ": quem abre
a tela três vezes por dia relê o mesmo topo três vezes e caça o que mudou no olho.

**Como ficou:** barra lateral à esquerda da conversa (`FeedBarraDeAtividade.tsx`), com os
clientes que têm fala nova em cima, os que só têm movimento recolhidos em "Sem novidade", e
os projetos de cada um na expansão. Cada linha é também o filtro para ir até lá, reusando o
`?cliente=` / `?projeto=` que já existiam. No stream, o bloco ganha etiqueta "N novas" e
cada fala não lida ganha um traço na margem.

**O carimbo é POR CLIENTE, e isso derruba o §3.7 do
[`planos/plano-comentarios-mencoes-feed.md`](../planos/plano-comentarios-mencoes-feed.md)**, que
desenhou `org_feed_visto` como uma linha por usuário. Aquele desenho é de um feed que se lê
inteiro: no instante em que alguém lê o Cliente A e não o Cliente B, um carimbo único ou
marca os dois como vistos (e o B some sem ter sido lido) ou não marca nenhum (e o A fica
"novidade" para sempre). É o mesmo motivo por que o Slack carimba por canal, e não por
workspace. A tabela nasceu com chave composta na migration
`20260922145129_feed_carimbo_de_leitura_por_cliente.sql`, **aplicada no sandbox e PENDENTE em
produção**, junto de `feed_atividade_por_cliente`, `marcar_feed_visto` e
`marcar_feed_visto_tudo`.

**Ler é clicar na barra, não passar o mouse nem rolar.** Hover foi descartado primeiro: o
cursor ATRAVESSA a tela a caminho da caixa de escrever, não existe no celular, e é sobre uma
fala enquanto o carimbo é do cliente. Visibilidade com permanência (60% do bloco à vista por
1 segundo) chegou a ser entregue e também saiu: carimbava o que só passou pela tela. Hoje o
carimbo vem só de gesto explícito: clicar no cliente ou no projeto da barra lateral (carimba
até a fala mais nova do retrato congelado) e o "Marcar tudo como visto".

Cinco decisões que valem registro, porque a maioria só apareceu na tela:

- **Congela a LINHA, não o número.** Primeira tentativa congelou os dois, e a tela mostrou
  na hora que estava errado: com o projeto aberto na frente, a lateral insistia que ele
  tinha duas novidades ("ta vendo que eu cliquei ali em consultoria tributária da
  bandeirante, e o numero ainda ta aparecendo?"). São duas perguntas diferentes. Onde a
  linha FICA vem do retrato congelado, senão o cliente sai da lista no instante em que é
  lido e a barra se desmancha embaixo do olho. O que a linha MOSTRA responde "o que ainda
  me espera", e zera na hora, virando um visto no lugar do número. É o Slack: o canal perde
  o contador ao ser aberto, e é a linha de não lidas DENTRO dele que fica de pé.
- **A etiqueta "N novas" no bloco é a exceção, e por isso mudou de desenho.** Ela é a
  referência de onde a leitura tinha parado e não some enquanto se lê, ao contrário do
  contador da lateral. Virou contornada (a da lateral é cheia): desenho diferente para
  papel diferente, senão os dois números lado a lado pareceriam um deles quebrado.
- **O "Há movimento novo" exigiu um `refetchInterval`.** O `queryClient` da casa tem
  `refetchOnWindowFocus: false`, então, com a lista congelada, nada revalidaria e o aviso
  seria botão morto. A atividade é reconferida a cada minuto, só com a aba à frente.
- **Piso de 7 dias para quem nunca foi carimbado.** Sem carimbo, "tudo é novidade" faria a
  primeira abertura acusar três anos de conversa: a barra nasceria com todos os clientes
  dentro, que é a tela que ela existe para substituir.
- **A própria fala não é novidade para quem escreveu**, e busca ou período ligados
  DESLIGAM o carimbo: quem procura coisa velha não está lendo o dia, e apagaria da barra a
  novidade que nem viu.
- **Duas armadilhas de código**, ambas mudas: `const chamar = supabase.rpc` perde o `this`
  e a função estoura por dentro (o sintoma é a barra presa no esqueleto, com o React Query
  tentando de novo); e o retorno do `rpc` é PREGUIÇOSO, então um `void chamar(...)` sem
  `.then()` nunca chega ao banco, e o carimbo sumiria sem erro nenhum.

Fica de fora, de propósito: a barra não aparece abaixo de `lg`. Numa coluna ela empurraria
a conversa para fora da primeira tela para dizer o que a própria conversa já diz, e no toque
a leitura carimba do mesmo jeito.

### 1. Escrever comentário direto do feed ✅ ENTREGUE (21/09/2026)

Hoje o feed só **responde**: o `FeedRespostaInline` nasce preso a um comentário existente e
reaproveita a thread dele. Falta abrir fala nova de dentro do feed, escolhendo cliente, projeto e
tarefa no próprio compositor. Enquanto isso não existir, começar um assunto obriga a sair do feed,
achar a tarefa e abrir o painel, que é exatamente o passo que o Slack não cobra.
Onde mexe: `FeedComentarios.tsx`, `CommentComposer`, `useDomainOrgComments.createComment`
(a mutation já cuida de anexo, menção e auditoria, não precisa reimplementar).

**Como ficou:** `FeedNovoComentario.tsx` grudado no RODAPÉ, como a caixa de mensagem do Slack. O
rodapé pediu os layouts: sob `rolagemNoConteudo`, `OsgLayout` e `FiscalLayout` passaram a esticar o
invólucro da página, senão a barra boiava logo abaixo do último comentário quando o recorte tinha
pouca conversa. Sem tarefa, a fala vai para o projeto. A gravação é a mutation de sempre; as regras
do destino são puras, em `src/lib/feedDestino.ts` (com testes).

**O desenho foi refeito em 21 e 22/09/2026, e as duas formas anteriores ficam registradas porque a
segunda parecia a boa:** a caixa nasceu FECHADA numa linha ("Escrever no feed…") para poupar altura
da barra grudada, e assim ela deixou de existir para quem olha a tela — o lugar de escrever tinha de
ser descoberto por um clique ("pq ta só esse chatzinho choncho"). Aberta o tempo todo, sobraram os
três campos de destino parados acima dela, cobrando uma decisão administrativa (de quem é, em que
projeto) antes da frase que a pessoa veio escrever. Hoje **o destino é perguntado no ENVIO**: Enter
envia (Shift+Enter quebra linha), e um modal de busca pergunta cliente e depois projeto, no teclado,
com o que a tela já sabe em destaque — três Enters para a fala seguinte na mesma conversa. Tarefa
não virou um terceiro Enter obrigatório: é `Tab` no projeto em destaque
(`EscolherDestinoDaFala.tsx`). Quatro armadilhas medidas na tela, que valem para os outros itens:

- As props diretas da view correm ANTES das dos plugins no ProseMirror, então o Enter de enviar
  atropelava a escolha da menção. Ele sai fora enquanto a lista de menção tem gente; com a lista
  vazia (o "@" fica ativo mesmo sem casar nada), envia.
- O editor não carrega extensão de quebra rígida: sem `splitBlock` explícito, Shift+Enter não fazia
  NADA, e o texto saía todo numa linha só.
- O cmdk põe o primeiro item em destaque ao montar a lista e avisa pelo `onValueChange`, atropelando
  qualquer escolha feita antes de os itens existirem: o Enter caía sempre na primeira linha. O
  destaque desejado é aplicado num efeito, depois da montagem, e só quando a linha existe naquele
  passo.
- A lista de quem dá para mencionar vem do PROJETO, então perguntar o destino só no envio deixava o
  "@" sem ninguém para oferecer em quem chega para escrever a primeira fala. O próprio "@" passou a
  abrir o modal quando não há candidatos, e o Suggestion só recalcula os itens quando o gatilho
  muda, então o "@" digitado é apagado e digitado de novo depois que a gente chega.
Quatro coisas que só apareceram no caminho, e ficam registradas porque valem para os itens
seguintes:

- A lista de projetos repete nome entre clientes (cinco "Canal de Chamados"). No filtro isso só
  devolve feed vazio; no destino publica no cliente errado, então a opção passou a carregar o
  cliente no `hint` e na busca. Escolher o projeto também **preenche** o campo de cliente.
- O destino abre no recorte da tela (filtro de cliente/projeto vira destino), e a fala publicada
  fora do recorte ganha toast próprio, com "Limpar filtros" em vez de "Ver no topo" — o link para
  o topo levaria a lugar nenhum.
- O rascunho sobrevive à troca de projeto, então menção a quem só estava na roda do projeto
  anterior é peneirada antes de gravar (`mencoesPermitidas`): o chip fica no texto, a notificação
  não sai.
- `useDomainOrgComments` ganhou a opção `somenteEscrita`: quem só publica não lê a thread da
  entidade nem assina o realtime dela. Com o destino escolhido só no envio, o `alvo` da chamada
  passou a carregar também o `projectId` — é ele que carimba o caminho do anexo.

### 2. Busca textual no feed ✅ ENTREGUE (22/09/2026)

Os filtros são cliente, projeto, autor, só menções e período. Não há campo de texto. Sem busca o
feed responde "o que aconteceu hoje" e não responde "onde ficou aquilo", que é o caso da consultora
que assumiu um projeto de 2022 e reconstruiu o histórico por uma pasta de arquivos, e o do balancete
reenviado como `(3).pdf` porque ninguém achou o primeiro.
Onde mexe: novo parâmetro de texto na RPC `feed_org_comments` (filtrar no `WHERE`, antes do
`LIMIT`, como os outros), campo na `FeedFiltros` e na URL. A fase 3 do
`planos/plano-comentarios-mencoes-feed.md` já previa "busca textual no corpo".

**Como ficou:** `_busca` na RPC (migration `20260922133138_feed_org_comments_busca.sql`, aplicada no
sandbox, **pendente em produção**), campo na primeira linha da barra de filtros e `?busca=` na URL,
como os outros. O campo tem estado próprio e espera 350 ms antes de virar recorte: cada termo é uma
lista paginada nova no React Query, e tecla a tecla seriam oito consultas para escrever "balancete".

**A armadilha era o formato do corpo.** `org_comments.body` guarda JSON do TipTap, e um
`body ILIKE '%termo%'` casaria "doc", "text" e "paragraph" com TODO comentário rico do sistema: a
busca devolveria o feed inteiro dizendo que achou. A comparação passou a ser feita sobre o texto
EXTRAÍDO (`org_comment_texto_pesquisavel`, por `jsonb`, que ainda desfaz as escapes do JSON, coisa
que regex não faria). Medido no sandbox: buscar "paragraph" casava 31 linhas antes, zero depois.

Três coisas que só apareceram no caminho:

- O evento de revisão grava um PREFIXO em texto antes do marcador ("Devolvido para ajustes:
  `[[review-rich-text:v1]]{...}`"), então procurar o marcador só no começo da string (como
  `lerCorpo` faz na tela) deixava essas 31 linhas com o JSON inteiro como texto pesquisável. O
  marcador é procurado em qualquer posição, e o prefixo entra na busca: é frase de gente.
- A assinatura da função MUDA ao ganhar `_busca`, e `CREATE OR REPLACE` deixaria as duas de pé como
  sobrecargas, tornando a chamada do PostgREST ambígua. A migration dropa a de oito parâmetros
  antes, e o gate confere que sobrou uma só.
- A URL guarda o termo aparado, e devolvê-lo ao campo apagava o espaço recém-digitado (escrever
  "balancete " virava "balancete", e a palavra seguinte colava na anterior). A sincronia de volta
  compara o termo já aparado dos dois lados.

Os termos são E, não OU, em qualquer ordem, e `%` digitado é caractere, não curinga. O toast de
"publicado" também aprendeu a busca: escrever com um termo ligado avisa que a fala ficou fora do
recorte em vez de prometer "ver no topo" e levar a um feed onde ela não está.

### 3. @todos: menção ao grupo do projeto ✅ ENTREGUE (22/09/2026)

Mencionar hoje é pessoa a pessoa. O `useDomainMentionCandidates` já monta a roda de gente do
projeto (membros, responsável, líder e, na tarefa, executor e revisor), então `@todos` é um
candidato sintético que expande para essa lista na hora de gravar as menções. Cuidar de dois
pontos: a regra de segurança do hook (a lista vem do projeto da thread, nunca do quadro da empresa)
e o volume no sino de quem não tem nada com aquilo.

**Como ficou:** sem migration e sem tocar na RPC. `MENCAO_TODOS` é candidato sintético em
`src/lib/orgCommentMentions.ts`, e `expandirMencaoTodos` troca o sentinel pela roda de gente no
instante de gravar. Os dois pontos que o item pedia:

- **Segurança:** a expansão usa exatamente a lista do `useDomainMentionCandidates`, que vem do
  projeto da thread. Nenhum caminho novo lê o quadro da empresa.
- **Volume:** quem escreveu fica de fora. A notificação de menção não filtra o próprio autor
  (`useNotificacoesMencao` lê `org_comment_mentions` por `mentioned_user_id`), então sem isso todo
  `@todos` tocaria o sino de quem acabou de escrever a frase.

Três decisões que valem registro:

- **O id do sentinel não é uuid**, e isso é a trava: `criar_org_comment` recebe `_mentions uuid[]`,
  então um "todos" que escapasse morreria no cast, na fronteira, em vez de virar linha de menção
  apontando para gente nenhuma. Há teste dizendo que ele nunca sobra, nem quando não há ninguém
  para expandir.
- **A expansão mora em quem publica, não no compositor.** Na caixa do feed o destino é escolhido no
  ENVIO, e a roda carregada enquanto se escrevia pode ser a de outro projeto: expandir cedo gravaria
  menção a quem não está na conversa. São quatro chamadas (feed, resposta no feed e os dois
  compositores do painel), e no feed a expansão vem antes da peneira de `mencoesPermitidas`.
- **O `@todos` é o ÚLTIMO da lista**, nunca o primeiro. A lista de menção abre com o primeiro item
  em destaque, e pôr o grupo na frente faria de "@" + Enter o gesto de avisar o projeto inteiro
  bem onde a mão espera escolher alguém. Ele continua a um `↓` ou a duas letras de distância, tem
  ícone de grupo em vez de avatar e a legenda "avisa o projeto" na linha. Só aparece com duas
  pessoas ou mais: com uma, é um apelido mais longo para o nome dela.

---

## P2 · Atrito diário, custo baixo

### 4. Editar comentário e link permanente para uma fala

Dois consertos pequenos no mesmo item.
**Editar:** existe `deleteComment`, não existe editar. Errar uma palavra obriga a apagar e
reescrever, e a fala reaparece no topo do feed com outro horário. Precisa de marca de editado e de
registro em auditoria, porque comentário de projeto é rastro.
**Link permanente:** o feed já sabe rolar até um comentário pelo id e realçá-lo (`data-comentario`,
usado hoje só depois de responder). Falta o "copiar link" que gera esse endereço para colar no
WhatsApp ou no e-mail e levar a pessoa direto na fala.

### 5. Pré-visualização de imagens

Hoje toda imagem é um cartão de arquivo com ícone e botão de baixar (`AttachmentButton`): o nome
diz `ImageIcon`, mas ninguém vê a imagem sem sair da tela. Falta miniatura no próprio comentário e
abertura em lightbox, com navegação entre os anexos daquele comentário. Vale junto: colar print do
clipboard direto no compositor (o plano de comentários já previu a ordem de gravação para isso, o
cliente gera o UUID do comentário antes de subir o arquivo).

### 6. Dois consertos nos filtros

**Multi-seleção:** a RPC já aceita `_client_ids`, `_project_ids` e `_author_ids` como array e a
tela manda um só. É quase de graça, e é o que permite acompanhar três clientes ao mesmo tempo.
**Intervalo de datas:** hoje só há Hoje, 7 dias, 30 dias e Qualquer data. Falta período
customizado. O piso já é calculado em `desdeDoPeriodo` e ancorado na meia-noite local; o teto é
novo, o feed sempre terminou no agora.

---

## P3 · Conforto, e cada um custa mais

### 7. Reações de emoji

Confirmar recebimento sem escrever nada é o que o ✅ faz no Slack hoje. **Já está desenhado** no
`planos/plano-comentarios-mencoes-feed.md` §3.6: tabela `org_comment_reactions` com PK composta
(`comment_id`, `user_id`, `emoji`), e o documento explica por que é tabela e não `jsonb` na linha
do comentário. Nada depende dela, então entra sem retrabalho. Falta a migration, a UI no
`FeedItemComentario` e a mesma peça no `OrgCommentsPanel`, que precisam ler igual.

### 8. Anexar áudio

O botão de microfone **já está na barra de ações da caixa**, desde 21/09/2026, desabilitado e com o
balão "ainda não disponível": ele é desenho, e diz isso. Falta a função inteira.

Parte do repasse de contexto nasce em áudio de WhatsApp, que hoje chega ao Slack como `.ogg` solto.
Gravar ou anexar áudio curto no comentário, com player embutido. **Transcrever automático no ato**,
senão ninguém ouve três minutos de gravação e o áudio deixa de ser pesquisável, o que anularia o
item 2 desta lista.

---

## Fora desta lista, e é decisão, não esquecimento

Levantadas na mesma análise e deixadas de fora por ora. Ficam registradas para não serem
redescobertas do zero:

- **Notificação fora do app para a equipe.** Menção e resposta só aparecem no sino, que exige o app
  aberto; e-mail e WhatsApp via n8n hoje só saem para o cliente. É o motivo mais provável de alguém
  continuar no Slack.
- **Seguir projeto ou cliente sem ser mencionado** (e silenciar). Fase 3 do mesmo plano. A
  barra de clientes do item 0 é o vizinho mais próximo disso, e não o substitui: ela mostra o
  que você já pode ver, e seguir é mudar o que se pode ver.
- **Comentário vira tarefa em um clique**, e pergunta que fica em aberto até ser respondida.
- **Colaborador externo** (advogado, contador) comentando em tarefa específica.
- **Post sem vínculo a tarefa**, para aviso geral do tipo "o sistema mudou".
- **Mover a conversa para a tarefa certa**, quando a fala nasceu no lugar errado.
