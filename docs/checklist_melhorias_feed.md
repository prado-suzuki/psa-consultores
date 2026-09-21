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

### 1. Escrever comentário direto do feed ✅ ENTREGUE (21/09/2026)

Hoje o feed só **responde**: o `FeedRespostaInline` nasce preso a um comentário existente e
reaproveita a thread dele. Falta abrir fala nova de dentro do feed, escolhendo cliente, projeto e
tarefa no próprio compositor. Enquanto isso não existir, começar um assunto obriga a sair do feed,
achar a tarefa e abrir o painel, que é exatamente o passo que o Slack não cobra.
Onde mexe: `FeedComentarios.tsx`, `CommentComposer`, `useDomainOrgComments.createComment`
(a mutation já cuida de anexo, menção e auditoria, não precisa reimplementar).

**Como ficou:** `FeedNovoComentario.tsx` na faixa grudada, fechado em uma linha ("Escrever no
feed…") e aberto com os três campos de destino. Sem tarefa, a fala vai para o projeto. A gravação
é a mutation de sempre; as regras do destino são puras, em `src/lib/feedDestino.ts` (com testes).
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
  entidade nem assina o realtime dela.

### 2. Busca textual no feed

Os filtros são cliente, projeto, autor, só menções e período. Não há campo de texto. Sem busca o
feed responde "o que aconteceu hoje" e não responde "onde ficou aquilo", que é o caso da consultora
que assumiu um projeto de 2022 e reconstruiu o histórico por uma pasta de arquivos, e o do balancete
reenviado como `(3).pdf` porque ninguém achou o primeiro.
Onde mexe: novo parâmetro de texto na RPC `feed_org_comments` (filtrar no `WHERE`, antes do
`LIMIT`, como os outros), campo na `FeedFiltros` e na URL. A fase 3 do
`planos/plano-comentarios-mencoes-feed.md` já previa "busca textual no corpo".

### 3. @todos: menção ao grupo do projeto

Mencionar hoje é pessoa a pessoa. O `useDomainMentionCandidates` já monta a roda de gente do
projeto (membros, responsável, líder e, na tarefa, executor e revisor), então `@todos` é um
candidato sintético que expande para essa lista na hora de gravar as menções. Cuidar de dois
pontos: a regra de segurança do hook (a lista vem do projeto da thread, nunca do quadro da empresa)
e o volume no sino de quem não tem nada com aquilo.

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
- **Marca de "até onde eu li".** Já desenhada como `org_feed_visto` no §3.7 do plano de
  comentários, e nunca entrou.
- **Seguir projeto ou cliente sem ser mencionado** (e silenciar). Fase 3 do mesmo plano.
- **Comentário vira tarefa em um clique**, e pergunta que fica em aberto até ser respondida.
- **Colaborador externo** (advogado, contador) comentando em tarefa específica.
- **Post sem vínculo a tarefa**, para aviso geral do tipo "o sistema mudou".
- **Mover a conversa para a tarefa certa**, quando a fala nasceu no lugar errado.
