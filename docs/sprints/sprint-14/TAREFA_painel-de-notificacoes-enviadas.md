# TAREFA 5 — O painel de notificações enviadas

> **Pergunta dela em 18/09/2026, no alinhamento com a Mariana (IAplicada), ao ver o
> acompanhamento de disparos do sistema dela: "Onde que eu vejo onde foi enviado o e-mail
> da solicitação do cliente? Quando? Quantos dias? Porque eu ainda não tenho um painel.
> Porque é enviado um monte de notificação, mas eu não tenho um painel central pra eu ver
> o que que tá rodando."**
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy. A leitura já está
> autorizada (T2) e a escrita não muda — continua exclusiva da chave de serviço.
>
> **A premissa da pergunta estava errada, e isso encurta a tarefa.** O painel existe; o que
> não existe é a visão de conjunto. `notificacao_envio` guarda 22 colunas por disparo desde
> a ALE-1, e há uma tela que as mostra — uma solicitação por vez.
>
> **Irmã da [TAREFA 1](TAREFA_lista-geral-de-solicitacoes.md).** Mesmo formato de problema
> (dado autorizado, leitura sempre recortada por uma entidade, nenhuma visão geral) e
> **mesmo risco de ambiente**. Se as duas forem em paralelo, o recorte de ambiente é a peça
> compartilhada — combinar quem escreve.

## O que foi medido, e como

Varredura em 22/09/2026 na `develop`. Quatro caminhos:

| onde procurei | o que achei |
|---|---|
| leituras de `notificacao_envio` em todo o `src/` | **duas**, e as duas recortadas por uma entidade: `useHistoricoNotificacoes.ts:76` (`.eq('entidade_id', solicitacaoId)`) e `useAvisoDeEnvioNaoSaiu.ts:74` |
| páginas que citam `notificacao_envio` | **nenhuma**. Os dois consumidores são componentes: `ModalAvisarCliente.tsx:120` e `AvisoClienteNaoNotificado.tsx:28` |
| quem escreve | só a borda, pela RPC `registrar_envio` (baseline, linha 3510). A tabela **não tem policy de escrita** — o front lê e nunca escreve |
| `notificacao_envio` no `ambienteScope.ts` | **não está** |

**A policy de leitura já cobre a tela nova**, e está documentada em
`useHistoricoNotificacoes.ts:13-18`:

```
equipe e destinatario can view notificacao_envio
  using: destinatario_id = auth.uid() OR has_role_or_higher(auth.uid(), 'team_member')
```

Não é recortada por cliente nem por entidade. Um `select` sem `.eq('entidade_id', …)`
devolve tudo para `team_member` e acima — que é exatamente o que esta tarefa quer, e é por
isso que não há policy nova.

## O achado que decide a tela

`useHistoricoNotificacoes.ts:37` filtra **no banco**, e de propósito:

```ts
const STATUS_QUE_CHEGARAM = ['enviado', 'entregue', 'lido'] as const;
```

O comentário diz por quê: *"Tentativa que falhou fica no banco para o Digital investigar e
não trafega para a tela do consultor."*

**O painel de hoje é do consultor. O que ela pediu é o do Digital.** "Ver o que tá rodando"
inclui — principalmente — o que **não** rodou: `sucesso = false`, `erro`, `erro_codigo`, e a
linha que ficou `pendente` porque o callback do n8n nunca voltou. Esse último caso está
medido no próprio hook (`useHistoricoNotificacoes.ts:45-49`): entre a reserva da linha e a
confirmação passam de **2,2 a 5,5 segundos** — então `pendente` é estado normal por
segundos, e patológico por horas. A tela nova precisa saber distinguir os dois, e a de hoje
nem mostra o estado.

**Reaproveitar `useHistoricoNotificacoes` seria o erro.** Ele é o hook certo para o modal e
carrega três decisões que não servem aqui: o filtro de status, o `refetchInterval` de 4s
(`aoVivo`) e o `limit(200)` por entidade.

## ⚠️ O risco é ambiente, e é o mesmo da TAREFA 1

`notificacao_envio` **não tem a coluna `ambiente`** (as 22 colunas estão em
`docs/rls/mapa-do-banco.md:613`) e **não está no `ambienteScope.ts`**. Nunca precisou: toda
leitura de hoje parte de uma solicitação, que já vem de um cliente já recortado.

Uma lista que atravessa entidades **mistura sandbox e produção** se o recorte não for feito
na mão. E aqui é pior que na TAREFA 1: `entidade_tipo` é `text` livre, então a mesma tabela
guarda disparo de `solicitacao`, de `ticket` e do que mais a borda gravar — o recorte tem
de passar pela entidade de origem de cada tipo, não por um join só.

## Subtarefas

### T0 — Medir em produção antes de desenhar

SELECT pelo MCP do Lovable (**só SELECT**, conforme o `AGENTS.md`):

1. Volume total de `notificacao_envio`, e a distribuição por `tipo`, `canal` e `status`.
2. **Quantas linhas têm `sucesso = false`**, e quais `erro_codigo` aparecem. Se for zero, a
   D1 fica muito mais barata.
3. **Quantas estão `pendente` há mais de uma hora** — essas são as que o callback do n8n
   nunca confirmou, e são o coração do "o que tá rodando".
4. A distribuição de `entidade_tipo`, que diz quantas famílias a tela precisa tratar.
5. **Os valores reais do enum `notificacao_envio_status`.** O `awk` no baseline não os
   devolveu, e a ALE-1 registra que 5 valores de `notificacao_tipo` foram **aplicados à mão
   em produção** (`docs/ALE-1-registro-notificacao-tipo-chamado.md`), fora do fluxo de
   migration. O `AGENTS.md` já avisa que `schema_migrations` de produção não é registro
   confiável: confirme no schema, não na tabela de migrations.

Os 12 valores de `notificacao_tipo` e os 3 de `notificacao_canal` (`sino`, `email`,
`whatsapp`) estão no baseline, linhas 122 e seguintes, e **não precisam ser medidos** — só
conferidos contra o que produção realmente usa.

### T1 — D1, e ela vem antes do código

**De quem é o painel?** As duas saídas são legítimas e dão telas diferentes:

- **Do Digital** — mostra todos os status, com a falha em destaque. É o que a fala de 18/09
  descreve ("o que tá rodando"), e é o que a tela de hoje deliberadamente não faz.
- **Do consultor** — só o que chegou, como o modal. Nesse caso a tarefa vira quase nada:
  uma lista geral com o mesmo filtro do hook existente.

**Recomendação: do Digital**, porque a do consultor já existe por solicitação e não foi o
que ela pediu. Mas é decisão dela, e o resultado da T0.3 muda o peso.

### T2 — O hook da lista geral

Novo, em `src/hooks/`, **sem** recorte por entidade. Não reusar
`useHistoricoNotificacoes` (ver acima). Regras da casa que se aplicam:

- Componente nunca conhece o Supabase (`AGENTS.md`, regra inegociável nº 1).
- `staleTime` de `STALE_TIMES.REALTIME`, como o irmão — notificação já está classificada
  assim em `queryClient.ts`.
- **Propagar o erro em vez de devolver lista vazia.** O hook existente já faz isso
  (`useHistoricoNotificacoes.ts:96-98`) com o motivo escrito: painel vazio e painel que não
  carregou são coisas diferentes. É a mesma fatia que a
  [TAREFA 4](TAREFA_consistencia-das-telas-de-estrutura-do-cliente.md) aplica nas cinco
  telas da Estrutura do Cliente.
- `select` em **uma linha só**. O comentário em `useHistoricoNotificacoes.ts:79-83` explica
  a armadilha: quebrado com `+`, o supabase-js perde a inferência e o retorno vira
  `GenericStringError[]`.

### T3 — O recorte de ambiente, na mão

Ver `src/lib/ambienteScope.ts` e o §"Separação de Ambientes" do `AGENTS.md`. Sem isto a
tela mostra disparo de `[TESTE]` junto com disparo real, e é o defeito que a TAREFA 1
também precisa evitar.

### T4 — A tela

Rota de equipe, registrada em `src/config/protectedPages.ts` (regra inegociável). Colunas
que o dado sustenta sem inventar nada: `tipo`, `canal`, `status`, `enviado_em`,
`entregue_em`, `destinatario_email` / `destinatario_telefone`, `erro_codigo`.

**"Quantos dias"** — a segunda metade da pergunta dela — é derivado de `enviado_em`, não é
coluna. E o destinatário aparece por e-mail/telefone, **não por nome**: o nome não é
gravado, conforme o comentário em `useHistoricoNotificacoes.ts:73-75` (pedido da Luana,
OSG, 09/09/2026).

### T5 — O que a falha faz na tela

Depende da D1. Se o painel for do Digital, a linha com `sucesso = false` precisa de um
estado visual próprio — e o selo sai do vocabulário que já existe, não de cor nova. Ver
`docs/geral/cor-o-que-falta.md` antes de escolher qualquer coisa: a frente de cor fechou
`red`/`emerald` em 11/09 justamente para que estado não nasça de cor crua.

## Aceite

- [ ] A T0 está respondida com números de produção, no corpo desta tarefa.
- [ ] A D1 está decidida por ela, por escrito.
- [ ] Uma tela responde "quais avisos saíram, para quem, por qual canal e quando" sem abrir
      cliente por cliente.
- [ ] Um disparo de `[TESTE]` não aparece junto com um real.
- [ ] Falha de consulta aparece como falha, não como lista vazia.
- [ ] Nenhuma migração, nenhuma policy nova, nenhuma escrita a partir do front.

## Referências de código

| arquivo | o que é |
|---|---|
| `src/hooks/useHistoricoNotificacoes.ts` | o painel por solicitação. Leia os comentários antes de desenhar — três decisões dele **não** servem à lista geral |
| `src/hooks/useAvisoDeEnvioNaoSaiu.ts` | cruza `solicitacao.enviada_em` com `notificacao_envio`; é o aviso de "enviou e o disparo não saiu" |
| `src/components/equipe/osg/checklists/ModalAvisarCliente.tsx:120` | onde o painel de hoje é montado |
| `src/lib/historicoNotificacoes.ts` | `montarHistorico` e os tipos `DisparoHistorico` / `EnvioParaHistorico` |
| `supabase/functions/_shared/jaEnviadoHoje.ts` | a guarda de dedup, e o índice `notificacao_envio_dedup_idx` |
| `docs/ALE-1-registro-notificacao-tipo-chamado.md` | a origem do log por destinatário, e o registro de que 5 valores foram aplicados à mão em produção |
| `docs/rls/mapa-do-banco.md:613` | as 22 colunas de `notificacao_envio` |
