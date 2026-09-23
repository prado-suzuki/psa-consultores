# Levar ao Google Chat os avisos de coleta de documentos e as menções em comentário

**Pedido da Patrícia em 14/09/2026**, depois de conferir o que do sino chega ao Chat.

O canal do Chat já está de pé para **tarefa** (prazo, atrasada, atribuída, em revisão) —
ver [`planos/avisos-de-tarefa-no-google-chat.md`](../planos/avisos-de-tarefa-no-google-chat.md).
Esta tarefa cobre as duas frentes que ficaram de fora **e que já têm evento gravado**.

**Chamado fica de fora por decisão da Patrícia, em 14/09:** já existe o espaço "PSA
Chamados", com canal próprio, e duplicar o aviso num segundo espaço só espalharia a mesma
cobrança por dois lugares.

**Revisão-pendente fica de fora por outro motivo, técnico:** ela não tem evento em lugar
nenhum. O sino a calcula na hora, a partir do estado (`org_tasks.status = 'review'`), e o
aviso some sozinho quando o revisor despacha. Para ir ao Chat seria preciso primeiro
**criar** o evento — trigger ou varredura —, que é outra tarefa, maior que esta inteira. O
que já vai ao Chat é o **evento** de entrada em revisão (`tarefa_em_revisao`), que existe
gravado; o que não vai é o lembrete de que ela continua parada lá.

---

## O que está medido (produção, 14/09/2026)

| aviso | onde está gravado | volume | área resolve? |
|---|---|---|---|
| `solicitacao_enviada` | `notificacao`, entidade `org_project` | 14 linhas, 3 projetos, último 11/09 | ✅ `org_projects.estrutura_area_id` |
| `documento_recebido` | `notificacao`, entidade `cliente` | 2 linhas, 2 clientes, último 04/09 | ❌ **não há projeto** (ver D1) |
| menção em comentário | `org_comment_mentions` (com `lido_em`) | 9 desde 03/08, 4 pessoas | ✅ `org_comments.project_id` → área, **9 de 9** |

**O volume somado é de cerca de uma mensagem por semana.** Não é frente de alto impacto por
quantidade; vale pelo que hoje se perde — menção é o único aviso do sino que cobra uma
resposta de alguém em particular.

`documento_aprovado` e `cobranca_pendencia` existem no enum e **não têm nenhuma linha em
produção**: ficam fora até passarem a acontecer.

---

## Frente A · Avisos de coleta de documentos

A diferença de fundo para o caminho de tarefa: **aqui o texto já existe e é seu.** Título e
corpo estão gravados em `notificacao.titulo` / `corpo`, escritos na migration
`20260827181846_notificacoes_osg_textos_da_patricia.sql` — por exemplo, "Documentos
solicitados ao cliente" / "A lista de documentos foi enviada ao cliente e o acesso ao portal
foi liberado.". Conferido em 14/09: **um título por tipo**, sem variação por destinatário,
ao contrário dos avisos de prazo.

Então a mensagem **reusa o texto gravado** em vez de montar outro. Menos código, e a frase
que a pessoa lê no Chat é a mesma que ela lê no sino.

- **T1 · A leitura ganha os avisos de projeto.** ⚠️ MIGRAÇÃO — `avisos_para_o_chat` passa a
  devolver também `entidade_tipo = 'org_project'`, com `titulo`/`corpo` da própria
  `notificacao`. A dedup por entidade, a chave sem destinatário e o recorte de `ambiente`
  seguem iguais. A chave muda de forma (hoje embute `org_task` implicitamente) e precisa
  incluir o `entidade_tipo`, senão projeto e tarefa de mesmo id colidiriam.
- **T2 · O texto da mensagem de projeto.** Em `_shared/mensagemDoChat.ts`: título em negrito,
  corpo abaixo, link do projeto. Sai **avulsa**, não entra no resumo de prazo — é evento
  pontual, como atribuição.
- **T3 · O link.** Reusar `hrefDeOrigem({ entity_type: 'org_project' }, area)`, que é o que
  `destinoDoAviso` já faz no sino (`src/lib/notificacoesInternas.ts`). **Não** montar um
  segundo formato de URL: o primeiro renome de rota separaria os dois.
- **T4 · Teste do formato**, no molde dos 25 que já existem, incluindo o caso de corpo nulo.

## Frente B · Menções em comentário

Aqui **não há linha em `notificacao`** — o que existe é `org_comment_mentions`, com
`created_at` e `lido_em` próprios. Duas saídas:

1. trigger que grava em `notificacao` a cada menção, e o Chat espelha de graça;
2. a borda lê uma **segunda** fonte, direto de `org_comment_mentions`.

**Recomendada: a 2.** A 1 manteria o lema "o Chat espelha o sino", mas criaria aviso
duplicado *dentro do sino* — a pessoa veria a mesma menção duas vezes, uma pela caixa de
menções e outra pela genérica. Trocar um canal novo por um defeito visível na tela que já
funciona é caro demais.

- **T5 · `mencoes_para_o_chat`.** ⚠️ MIGRAÇÃO — função irmã da `avisos_para_o_chat`, só
  leitura, mesma forma: janela, `_ambiente`, dedup, chave própria
  (`chat:<area>:mencao:<mention_id>:<dia>`) e a área saindo de
  `org_comments.project_id` → `org_projects.estrutura_area_id`. Só menção **não lida**:
  quem já leu no sino não precisa ser chamado no Chat.
- **T6 · Canal e tipo.** ⚠️ MIGRAÇÃO — `notificacao_envio.tipo` é o enum
  `notificacao_tipo`, que **não tem valor para menção**. Ou entra um valor novo
  (`mencao_em_comentario`), ou a linha de envio não pode ser gravada. Sem a linha não há
  dedup nem rastro, então **esta é bloqueante para a frente B**.
- **T7 · O texto.** "Fulano mencionou Beltrano" mais o link da tarefa ou do projeto. Ver
  **D2** antes de escrever: o corpo do comentário entra ou não.
- **T8 · Marcar como visto?** Decidir se publicar no Chat mexe em `lido_em` — a recomendação
  é **não mexer**: quem leu no Chat não leu no sino, e apagar o aviso da caixa da pessoa por
  causa de uma mensagem num espaço coletivo esconde trabalho de quem não estava olhando.

---

## Decisões pendentes

- **D1 · Aviso de `documento_recebido` (entidade `cliente`): vai ou não?** Ele não tem
  projeto, então **não há área para escolher o espaço**, e no sino ele nem é clicável —
  `destinoDoAviso` devolve `null` de propósito, porque não existe tela de destino. As saídas
  são fixá-lo na OSG (o módulo de coleta é de lá) ou deixá-lo fora. São 2 linhas em toda a
  história do banco: **recomendo deixar fora** e reavaliar se o volume crescer.
- **D2 · O corpo do comentário vai na mensagem?** Com o texto, a pessoa resolve sem sair do
  Chat; sem ele, a mensagem só chama. O espaço é coletivo e comentário de projeto pode ter
  valor, nome de cliente e conversa interna. **Recomendo sem o corpo**, com link.
- **D3 · Menção em espaço coletivo faz sentido?** Menção é o único aviso desta tarefa
  endereçado a **uma** pessoa. Publicá-la num espaço avisa quem talvez não veja o sino, ao
  custo de todo mundo ver que fulano foi cobrado. Se incomodar, a alternativa é esperar o
  app do Chat com mensagem direta — que é bem mais trabalho (service account e delegação no
  Workspace).

## Achados (não corrigir nesta tarefa)

- **B1 · Aviso órfão no sino.** 3 avisos de `org_task` em produção apontam para tarefa que
  não existe mais; no sino eles aparecem e não abrem nada. Nenhum dos 3 está por ler, então
  hoje não incomoda ninguém. No sandbox são 5.
- **B2 · A tabela `notificacao` não tem FK para a entidade** — é `entidade_tipo` mais
  `entidade_id` solto, o que é o que permite o B1. Mudar isso é decisão de schema, não de
  aviso.

## Aceite

1. Um aviso de solicitação enviada aparece no espaço da área do projeto, com o **mesmo texto**
   que aparece no sino, e o link abre o projeto.
2. Uma menção nova aparece no espaço da área, e **não** aparece duas vezes no sino.
3. Rodar a borda duas vezes seguidas não repete nenhuma das duas (dedup pela chave).
4. Falha de envio libera a reserva, como já vale para tarefa (`liberar_reserva_falha`).
5. A conferência de cobertura volta a fechar: os tipos gravados que deveriam ir têm linha em
   `notificacao_envio` com canal `google_chat`.
