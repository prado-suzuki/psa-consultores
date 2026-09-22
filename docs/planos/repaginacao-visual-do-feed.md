# Repaginação visual do feed

**Status:** fatias 1 a 3 entregues em 22/09/2026 na branch `feat/feed-repaginado`; fatia 4 parcial (ver §16)
**Data da leitura:** 22/09/2026
**Branch observada:** `feat/feed-fala-nova`
**Escopo:** somente apresentação e interação visual da coluna principal do feed compartilhado entre Tax e OSG
**Sem migration:** esta entrega não altera banco, RPC, RLS, hooks de dados, filtros, auditoria nem regras de leitura

## 1. Objetivo

Reduzir o ruído visual da tela de Feed e fazer a conversa voltar a ser o ponto de entrada. A implementação atual já resolve os problemas de produto mais difíceis: stream único, agrupamento por dia e origem, threads, busca, filtros na URL, não lidos por cliente, barra lateral de atividade e publicação sem sair da página.

A repaginação deve preservar essa estrutura. O trabalho está na hierarquia: hoje barra lateral, filtros, cabeçalhos, comentários, eventos de sistema e compositor usam borda, fundo tonal, ícone e sombra ao mesmo tempo. Quase tudo pede atenção com intensidade semelhante.

A direção escolhida é um **feed operacional editorial**. Ele deve ter a leitura contínua de uma conversa e a objetividade de uma timeline B2B. Conteúdo humano domina; cliente, projeto e tarefa orientam; eventos automáticos recuam.

## 2. Resultado esperado

Ao abrir a tela, a pessoa deve perceber nesta ordem:

1. O que foi dito ou decidido.
2. Quem participou e quando.
3. Em qual cliente, projeto ou tarefa aquilo aconteceu.
4. Quais itens ainda não foram lidos.
5. Contagens e ações auxiliares.

O feed não deve parecer uma coleção de cartões de dashboard nem uma tabela de auditoria. Também não deve imitar uma rede social.

## 3. O que já existe e não pode regredir

Estas decisões estão registradas em [`docs/checklist_melhorias_feed.md`](../checklist_melhorias_feed.md) e prevalecem sobre sugestões genéricas de UI:

- O stream é único e cronológico, agrupado primeiro por dia e depois por origem.
- A mesma origem pode reaparecer em blocos diferentes do mesmo dia.
- A barra lateral de atividade permanece fixa à esquerda no desktop e oculta abaixo de `lg`.
- A leitura é carimbada por visibilidade com permanência. Hover não marca nada como visto.
- O contador da lateral zera durante a leitura, mas a posição da linha fica congelada na sessão.
- A etiqueta de não lidos no bloco continua visível como referência de onde a leitura parou.
- Busca, período, cliente, projeto, autor e menções continuam na URL.
- Busca ou período ligados impedem o carimbo de leitura.
- O compositor continua visível e fixo no rodapé. Não voltar ao desenho fechado em uma linha, já rejeitado por esconder o lugar de escrever.
- O destino continua sendo escolhido no envio. Não recolocar campos permanentes de cliente, projeto ou tarefa sobre o editor.
- Enter continua enviando e `Shift+Enter` continua quebrando linha.
- Os estados de carregamento, erro, vazio e vazio por filtro continuam diferentes.
- O link do cabeçalho continua levando à origem da conversa.
- Resposta inline, anexos, menções, realce pós-publicação e marca de não lido continuam funcionando.

## 4. Referências e critérios extraídos

### Linear

Referência: [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh).

Aplicar dois princípios:

- Elementos de apoio não devem competir com o trabalho principal.
- A estrutura deve ser percebida pelo espaçamento e pela hierarquia, sem depender de muitas bordas e separadores.

Na prática, a barra lateral e os metadados precisam recuar. Cor forte fica reservada para seleção, não lido, foco e ações confirmadas.

### GitLab

Referências: [exploração do feed](https://gitlab.com/gitlab-org/gitlab-ce/issues/48321) e [redesign do dashboard](https://gitlab.com/gitlab-org/gitlab-ce/issues/49403).

O diagnóstico do GitLab também foi excesso de texto e dificuldade de varredura. A resposta proposta organiza cada item por autor, tempo, ação, objeto e prévia. A lição aplicável aqui é manter uma largura de leitura controlada e repetir uma anatomia previsível, sem transformar cada registro em um card autônomo.

### Guias de activity feed

Referências: [UX Patterns](https://uxpatterns.dev/patterns/social/activity-feed), [GetStream](https://getstream.io/blog/activity-feed-design/) e [Aubergine](https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds).

Os componentes recorrentes são ator, ação, objeto, destino, horário e prévia. Nem todos precisam do mesmo peso. Nome e mensagem ajudam a varrer a conversa; data, caminho e contagens dão contexto.

### Feed B2B

Referência: [Wolf Tech](https://wolf-tech.io/blog/designing-an-activity-feed-for-b2b-saas-events-aggregation-and-privacy-safe-logging).

Comentário humano e evento de sistema têm papéis diferentes. O feed deve deixar essa diferença visível. Eventos automáticos entram como histórico compacto; falas humanas recebem espaço de leitura.

### Galerias

[Mobbin](https://mobbin.com/explore/web/app-categories/saas-ui) e [SaaSUI](https://www.saasui.design/best-saas-dashboard-ui-inspiration) servem como referência de produtos publicados. Dribbble serve apenas para acabamento visual, pois seus conceitos raramente mostram densidade real, loading, erro, textos longos e responsividade.

## 5. Diagnóstico da tela observada

A tela foi aberta em `http://localhost:8080/equipe/tax/projetos/feed`, com viewport de `1440 x 1000`, dados reais do ambiente da branch.

### Pontos que funcionam

- A divisão entre atividade por cliente e conversa principal é compreensível.
- A busca tem espaço suficiente e está no lugar certo.
- O agrupamento por origem evita repetir cliente e projeto em cada comentário.
- O editor fixo mantém a ação de escrever disponível depois de uma leitura longa.
- Não lidos usam mais de um sinal: contador, fundo e traço lateral.
- A largura da coluna principal, cerca de 777 px nessa viewport, é adequada para leitura.

### Ruído encontrado

- Barra lateral, filtros e blocos de conversa usam moldura de card com força parecida.
- O cabeçalho de cada origem usa faixa tonal alta, ícone em caixa, breadcrumb em caixa alta, título, pilha de autores, contagem e seta. Há informação demais na mesma linha visual.
- Eventos de sistema usam avatar e corpo em caixa, ficando próximos demais de comentários humanos.
- O rótulo do dia parece uma pílula interativa, embora seja apenas orientação temporal.
- Fundos internos sucessivos criam o efeito de card dentro de card.
- O compositor aberto é correto como decisão de produto, mas sua moldura pesada disputa atenção com a conversa.

## 6. Direção visual

### 6.1 Superfícies

Usar três níveis, no máximo:

1. Canvas da página: `bg-background`.
2. Superfície da conversa: `bg-card` ou `bg-superficie-cartao`, com borda baixa.
3. Realces locais: não lido, evento com corpo, foco e publicação recente.

Evitar sombra permanente em filtros e conversas. Se houver sombra, limitar ao hover da conversa e ao compositor fixo, onde ajuda a mostrar sobreposição durante a rolagem.

Evitar uma faixa colorida ocupando toda a largura do cabeçalho. O acento da área pode aparecer no ícone, numa barra curta ou no rótulo do tipo.

### 6.2 Tipografia

- Mensagem humana: `text-sm`, contraste principal, line-height confortável.
- Nome do autor: `text-sm font-semibold`.
- Horário e estado de edição: `text-[11px] text-muted-foreground`.
- Tipo da origem: `text-[10px]` ou `text-[11px]`, sem depender de caixa alta pesada.
- Título da tarefa ou projeto: `text-sm font-semibold`, uma linha quando possível.
- Caminho de cliente e projeto: secundário, truncável e com tooltip quando necessário.

Não aumentar o número de tamanhos tipográficos. A melhora deve vir da ordem e do contraste.

### 6.3 Cor

Cor primária fica reservada para:

- Filtro ou cliente selecionado.
- Marca de não lido.
- Foco de teclado.
- Realce da fala recém-publicada.
- Ação principal do compositor.

Eventos de sistema não precisam de fundo primário. Um ícone tonal e uma linha lateral curta já diferenciam o tipo.

### 6.4 Espaçamento

- Preservar largura de leitura entre 680 e 800 px na coluna principal quando houver espaço.
- Reduzir a altura dos cabeçalhos das conversas.
- Manter pelo menos 12 px entre blocos de origem.
- Usar separação interna por ritmo vertical, não por uma borda a cada fala.
- Não comprimir alvos de toque. Botões relevantes continuam com pelo menos 36 px em interfaces de toque.

## 7. Especificação por componente

### 7.1 `FeedComentarios.tsx`

Responsabilidade nesta entrega:

- Ajustar espaçamentos gerais entre lateral, toolbar, dias, blocos e compositor.
- Simplificar o rótulo de dia.
- Atualizar o esqueleto para refletir a nova anatomia.
- Atualizar estados vazio e erro para a mesma linguagem visual, sem cartões pesados.

#### Rótulo do dia

O dia deve parecer orientação, não botão:

- Texto simples, pequeno e sem borda em forma de pílula.
- Linha horizontal tênue ocupando o restante da largura.
- Contagem permanece à direita.
- Sticky e cálculo dinâmico de `top` permanecem intactos.
- Fundo da faixa sticky continua compatível com `bg-background` para mascarar o conteúdo durante a rolagem.

#### Estados

- Loading deve manter a geometria final para evitar salto.
- Erro mantém `Tentar de novo` e o detalhe técnico.
- Vazio mantém explicação do que aparece no feed.
- Vazio por filtro mantém termo de busca e ação para limpar filtros.
- Não unificar vazio normal e vazio por filtro.

O arquivo tem 477 linhas na leitura atual. Não deve ultrapassar 600. Se a repaginação pedir novos blocos grandes, extrair apenas componentes com responsabilidade visual real, sem wrapper passa-tudo.

### 7.2 `FeedGrupoOrigem.tsx`

Este é o principal ponto da repaginação.

#### Moldura

- Manter cada origem como um bloco distinguível.
- Trocar a combinação atual de borda forte, faixa tonal e sombra por uma superfície neutra de baixo contraste.
- Hover pode reforçar levemente borda ou fundo, sem deslocamento e sem sombra grande.
- O bloco inteiro não vira link. O cabeçalho continua sendo a área navegável para evitar conflito com links e botões internos.

#### Cabeçalho

Organizar em dois níveis:

1. Contexto: tipo, cliente e projeto, com contraste secundário.
2. Título: tarefa ou projeto, com maior peso.

Regras:

- Reduzir a caixa do ícone ou trocar por ícone solto em fundo tonal pequeno.
- Cliente permanece o primeiro elo de varredura quando existir.
- Projeto pode truncar antes do cliente.
- Manter tooltip ou `title` para caminhos truncados.
- Pilha de autores, contagem e link externo continuam à direita no desktop.
- Em largura estreita, ocultar primeiro a pilha de autores, depois reduzir os metadados. O título não deve desaparecer.
- A etiqueta `N nova(s)` continua contornada e visível enquanto o bloco é lido.
- Não usar badges coloridos para projeto, tarefa, cliente e contagem ao mesmo tempo.

#### Corpo

- Aumentar a sensação de continuidade entre falas.
- Manter threads e conectores atuais.
- Evitar uma caixa independente para cada comentário humano.
- Resposta inline continua dentro da thread correspondente.

O arquivo tem 330 linhas na leitura atual. A implementação pode extrair `FeedCabecalhoOrigem` se o cabeçalho crescer em responsabilidade. Não extrair apenas para reduzir contagem de linhas.

### 7.3 `FeedItemComentario.tsx`

Separar visualmente comentário humano e evento de sistema.

#### Comentário humano

- Avatar, nome, tempo e corpo continuam na mesma anatomia.
- Corpo é a informação de maior contraste depois do nome.
- Ação de responder continua no canto e aparece no hover para mouse, sempre disponível no toque e no foco.
- Comentário não lido mantém traço lateral e fundo muito leve.
- Realce pós-publicação continua mais forte que o não lido.
- Falas consecutivas da mesma pessoa continuam sem repetir avatar e nome.
- Horário da continuação continua aparecendo no hover.

#### Evento de sistema

Transformar em linha compacta de timeline:

- Ícone pequeno de estado no lugar do avatar circular de mesma presença visual que uma pessoa.
- Rótulo da ação, pessoas envolvidas e horário em uma linha que possa quebrar com naturalidade.
- Corpo adicional aparece abaixo apenas quando não for vazio.
- Corpo adicional pode manter barra lateral curta, mas sem uma caixa cinza larga ocupando a linha inteira.
- Não oferecer ação de responder.
- Manter os textos e a interpretação de `kind` em `@/lib/orgCommentEventos`. Esta entrega não reescreve a semântica dos eventos.

O arquivo tem 264 linhas na leitura atual.

### 7.4 `FeedFiltros.tsx`

Manter o comportamento e reduzir o peso de card.

- Remover sombra permanente.
- Usar borda ou fundo baixo apenas para delimitar a toolbar sticky.
- Busca permanece flexível e recebe o espaço restante.
- Alternância Tudo/Menções continua à esquerda.
- Período e botão Filtros continuam à direita no desktop.
- Etiquetas de filtros ativos permanecem visíveis na segunda linha.
- Não esconder busca dentro do popover.
- Não alterar debounce de 350 ms, sincronização com URL nem opções oferecidas.
- Em tela estreita, busca continua ocupando linha inteira e os controles podem quebrar.

O arquivo tem 433 linhas. A repaginação não deve empurrá-lo além de 600.

### 7.5 `FeedNovoComentario.tsx` e `CommentComposer`

O compositor continua aberto. A tentativa anterior de fechá-lo em “Escrever no feed...” foi rejeitada porque o lugar de escrever desapareceu visualmente.

Ajustes permitidos:

- Suavizar borda externa e fundo da toolbar.
- Reduzir contraste de ícones inativos.
- Reforçar o botão Publicar como única ação primária.
- Usar sombra superior leve somente para separar o compositor sticky do conteúdo que passa atrás.
- Ajustar padding sem reduzir a área útil do editor nem os alvos de toque.

Não fazer:

- Colapsar automaticamente.
- Pedir destino antes de escrever.
- Exibir campos permanentes de destino.
- Mudar atalhos, fluxo do modal ou lógica de publicação.
- Alterar mutation, invalidações, menções ou auditoria.

### 7.6 `FeedBarraDeAtividade.tsx`

A barra já foi adicionada e não é o foco desta entrega. Ela pode receber somente ajustes necessários para harmonizar com a coluna principal:

- Reduzir sombra e contraste da moldura se a conversa principal ficar mais calma.
- Preservar largura, sticky, altura, agrupamento, expansão e rodapé.
- Preservar a diferença entre contador cheio da lateral e etiqueta contornada do bloco.
- Não mostrar a barra abaixo de `lg`.
- Não criar drawer, sheet ou botão móvel nesta entrega.

## 8. Responsividade

### Desktop, `lg` ou maior

- Sidebar global da área, barra de atividade e coluna principal continuam coexistindo.
- A coluna principal mantém largura de leitura controlada e cresce no espaço disponível.
- Barra de atividade continua entre 256 e 320 px conforme os breakpoints atuais.
- Não esticar o texto dos comentários até a largura total de monitores grandes.

### Tablet e janelas estreitas

- Barra de atividade continua oculta.
- Coluna principal ocupa o espaço disponível.
- Filtros quebram em duas linhas sem overflow horizontal.
- Metadados secundários do cabeçalho cedem antes do título.

### Celular

- Nenhuma informação necessária pode depender de hover.
- Responder continua com alvo de toque visível.
- Breadcrumb pode quebrar ou ocultar o projeto secundário, mas cliente e título continuam legíveis.
- Editor sticky não pode cobrir a última fala. Preservar padding e máscara inferior.
- Testar com teclado virtual não faz parte da automação atual, mas deve ser conferido manualmente em viewport móvel.

## 9. Acessibilidade

- Preservar elementos semânticos atuais: `article`, `section`, headings, `time`, links e botões.
- Não transmitir não lido, seleção ou tipo apenas por cor.
- Manter foco visível em cabeçalhos navegáveis, filtros, responder e publicar.
- O contraste do texto principal deve atender WCAG AA.
- Metadados podem ter contraste menor, mas ainda precisam ser legíveis sobre todos os fundos usados por Tax e OSG.
- Respeitar `prefers-reduced-motion`. A repaginação não precisa adicionar animações.
- Não tornar o bloco inteiro clicável se isso criar links aninhados ou alvos concorrentes.

## 10. Fora do escopo

- Migration, RLS, RPC ou nova tabela.
- Agregação de eventos no banco.
- Alteração da ordem cronológica.
- Novo filtro, busca ou personalização.
- Reações, edição, link permanente ou preview de imagens. Esses itens continuam no checklist próprio.
- Drawer da barra de atividade em telas menores.
- Alteração da taxonomia ou dos textos dos eventos.
- Mudança no comportamento do compositor.
- Redesign da sidebar global de Tax ou OSG.
- Novos tokens globais de tema sem necessidade comprovada. Preferir tokens existentes.

## 11. Sequência de implementação

### Fatia 1: caracterização

1. Registrar screenshots antes da mudança em Tax e OSG, desktop e mobile.
2. Criar testes de caracterização dos componentes do feed antes de alterar sua anatomia.
3. Cobrir pelo menos comentário humano, evento de sistema, resposta, continuação de autor, não lido, realce, caminho truncável e filtros ativos.
4. Não corrigir bugs encontrados durante a caracterização na mesma mudança visual.

Hoje não há testes de componente específicos para `FeedComentarios`, `FeedGrupoOrigem`, `FeedItemComentario` ou `FeedFiltros`. Os testes existentes cobrem hooks e funções puras, não a apresentação desta tela.

### Fatia 2: hierarquia da conversa

1. Repaginar `FeedGrupoOrigem`.
2. Repaginar comentário humano em `FeedItemComentario`.
3. Criar a variação compacta para evento de sistema.
4. Conferir threads, respostas órfãs e continuação de autor.

### Fatia 3: moldura da página

1. Simplificar rótulo de dia.
2. Atualizar filtros.
3. Harmonizar compositor e barra lateral sem mudar comportamento.
4. Atualizar loading, vazio e erro.

### Fatia 4: validação visual

1. Comparar Tax e OSG.
2. Conferir viewports de 1440, 1024, 768 e 390 px.
3. Conferir estado com filtros ativos em duas linhas.
4. Conferir comentário longo, título longo, muitos autores, anexos e thread aberta.
5. Conferir sticky de filtros, dia, lateral e compositor durante rolagem longa.

## 12. Critérios de aceite

- A mensagem humana é o elemento de maior destaque dentro de cada conversa.
- Cliente, projeto e tarefa continuam identificáveis sem repetir contexto em cada fala.
- Eventos de sistema são reconhecíveis e ocupam menos peso visual que comentários humanos.
- A tela usa menos fundos tonais, bordas e sombras simultâneos que a versão anterior.
- Não há card dentro de card para comentários humanos comuns.
- O rótulo do dia parece orientação, não controle clicável.
- Busca e filtros continuam utilizáveis com mouse, teclado e toque.
- Barra lateral continua oculta abaixo de `lg`.
- Compositor continua aberto e visível.
- Todos os comportamentos listados na seção 3 permanecem iguais.
- Não há overflow horizontal em 390, 768, 1024 e 1440 px.
- Tax e OSG mantêm seus acentos de área sem criar duas implementações.
- Loading, erro, vazio e vazio por filtro continuam presentes e coerentes com o novo desenho.
- Typecheck, testes e build passam.
- Não é feita chamada direta ao Supabase em componente React.

## 13. Verificação

Executar:

```bash
bun run test
bun run typecheck
bun run build
```

Verificação manual no navegador:

- `/equipe/tax/projetos/feed`
- `/equipe/osg/projetos/feed`
- Rolagem do começo até páginas mais antigas.
- Filtro por cliente e por projeto pela barra lateral.
- Tudo/Menções, busca, período e popover de filtros.
- Publicação de fala nova e resposta inline.
- Realce da publicação e toast de item fora do recorte.
- Carimbo de leitura por permanência.
- Navegação pelo cabeçalho até a origem.

## 14. Arquivos principais

| Arquivo | Papel na implementação |
|---|---|
| `src/components/comentarios/feed/FeedComentarios.tsx` | Layout geral, dias, estados e sticky |
| `src/components/comentarios/feed/FeedGrupoOrigem.tsx` | Superfície e cabeçalho da conversa |
| `src/components/comentarios/feed/FeedItemComentario.tsx` | Comentário humano e evento de sistema |
| `src/components/comentarios/feed/FeedFiltros.tsx` | Toolbar e filtros ativos |
| `src/components/comentarios/feed/FeedNovoComentario.tsx` | Integração do compositor fixo |
| `src/components/comentarios/CommentComposer.tsx` | Aparência da caixa de escrita |
| `src/components/comentarios/feed/FeedBarraDeAtividade.tsx` | Harmonização lateral, sem mudança de produto |
| `src/lib/orgCommentEventos.ts` | Fonte dos textos e interpretação de eventos, sem alterar semântica |
| `src/lib/feedComentarios.ts` | Agrupamento e threads, sem alterar comportamento |

## 15. Nota para a próxima sessão

Começar lendo este arquivo e [`docs/checklist_melhorias_feed.md`](../checklist_melhorias_feed.md). Abrir a tela rodando antes de editar. A especificação pede uma mudança visual grande com mudança funcional mínima.

Se uma escolha de UI exigir alterar query key, filtro, paginação, mutation, marca de leitura, destino da fala ou estrutura persistida, ela saiu do escopo. Pare e trate como tarefa separada.

## 16. Execução (22/09/2026, branch `feat/feed-repaginado`)

Três commits, um por fatia: caracterização, hierarquia da conversa, moldura da página.

### Onde a execução divergiu da especificação

- **Tooltip, não `title`.** O §7.2 permite `title` no caminho truncado, mas a catraca
  `textoDeAjuda.test.ts` proíbe `title=` em tag nativa. O cabeçalho usa um `ElementTooltip`
  com o caminho inteiro (`cliente › projeto › título`).
- **Responder some por capacidade do ponteiro, não por largura.** O desenho anterior o
  escondia a partir de `sm`, e tablet largo não tem hover. Agora ele só some com
  `(hover: hover) and (pointer: fine)`, e tem 36px em ponteiro grosso.
- **Faixa de formatação do compositor sem fundo.** O `bg-muted/40` saiu e ficou só o fio
  inferior. A faixa é exclusiva do modo `caixa`, então o compositor da resposta inline e o
  do painel da tarefa não mudaram.
- **Coluna sem teto de largura.** Houve um teto de `50rem` para atender o §8, e ele saiu
  em 22/09/2026: a coluna estreita desfazia as proporções da `feat/feed-fala-nova`, que
  era o que se queria manter. A coluna segue a largura da tela a partir de `lg`.

### Conferido no app rodando (sandbox, Tax e OSG)

- 1440, 1024, 768 e 390 px, sem overflow horizontal em nenhuma.
- Rolagem longa com filtros, dia e compositor grudados.
- Resposta inline aberta, hover de fala, filtros ligados, vazio por filtro e esqueleto
  (RPC segurado por 4 s).

### Não conferido

- Publicar uma fala nova e o realce com o toast "Ver no topo".
- Carimbo de leitura por permanência, com a etiqueta de novas descendo.
- Teclado virtual no celular, como o §8 já previa.

### Suíte

`bun run test` tem 16 arquivos falhando **já na `feat/feed-fala-nova`**, antes desta
frente (59 testes). Depois dela, 58: a dívida de `title=` que a `ContagemDoDia` escondia foi
paga. O placeholder da `textoDeAjuda` (217 contra 215) também vem da branch de origem.
