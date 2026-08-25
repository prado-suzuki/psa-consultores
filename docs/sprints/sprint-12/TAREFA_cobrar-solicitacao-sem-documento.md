# TAREFA — Cobrar solicitação sem nenhum documento (GES-04)

> **Origem:** card GES-04 da sprint 12 (P3 · 20h) mais a correção do tech lead em
> 2026-08-24: a descrição do card mistura duas coisas, e o escopo real é mais estreito.
> **Confirma o aviso 8** do catálogo de 15 avisos em
> [`../sprint-11/TAREFA_notificacoes-coleta-documentos.md`](../sprint-11/TAREFA_notificacoes-coleta-documentos.md)
> (linha 18: *"Cobrança do que falta · Cliente · e-mail · X dias sem resposta"*).
> **Textos em vigor:** [`avisos-cliente.md`](../../geral/avisos-cliente.md) ·
> [`whatsapp-templates.md`](../../geral/whatsapp-templates.md)

## O que deve passar a acontecer

Um aviso **próprio**, disparado por job, para o cliente que **não enviou nenhum
documento** desde que a solicitação saiu. Repete a cada período enquanto nada chegar.

O que ele **não** é, e por isso não reusa nada do que existe:

| | |
|---|---|
| Aviso 2 (`situacao_documentos`) | é manual, sai do clique do analista **depois** da conferência, e fala de pendente + reenvio |
| Órfão `cobranca_pendencia` | fala de "faltam 6 dos 52", ou seja, pressupõe que algo chegou |
| Régua D+3/D+7/D+14 | proposta na sprint 11 e **descartada** por esta decisão: um marco só, repetido |

O aviso 8 original era e-mail; aqui vale **e-mail e WhatsApp quando houver telefone**.

## A condição de elegibilidade

Nenhuma coluna nova. Cada guarda existe por um motivo, e nenhum é decorativo:

```sql
select s.id, s.cliente_id, s.enviada_em
  from public.solicitacao s
 where s.enviada_em   is not null                 -- rascunho nunca chegou ao cliente
   and s.encerrada_em is null                     -- encerrada não se cobra
   and exists (                                   -- sem pendência não se cobra
         select 1 from public.solicitacao_item i
          where i.solicitacao_id = s.id and i.status = 'ativo')
   and not exists (
         select 1 from public.documento_arquivo da
          where da.cliente_id = s.cliente_id
            and da.fonte      = 'cliente'         -- ver "independe da rota", abaixo
            and coalesce(da.excluido, false) = false
            and da.documento_gerado_id is null    -- blindagem contra a fatia 2
            and da.created_at >= s.enviada_em);   -- upload antigo não cala pedido novo
```

**Independe da rota, e isso é o ponto.** O núcleo do upload declara `fonte = 'cliente'`
como padrão (`src/hooks/useDocumentoArquivo.ts:245`) e **nenhuma tela passa `fonte`**.
Então o analista anexando um documento que o cliente mandou por e-mail grava igual ao
cliente subindo no portal. Não use `documento_arquivo.solicitacao_id`: ele é preenchido
por **um único** ponto do front (`ColetaDocumentosCliente.tsx:145`), então documento que
chegou por qualquer outra via leria como "não enviou nada".

**Por que `documento_gerado_id is null`.** A
[fatia 2](../../planos/plano-osg-documentos-recebidos.md) — congelar o `.docx` gerado no
"registrar" — vai fazer arquivo **produzido pela casa** cair nesta mesma tabela, e a
coluna já está reservada para isso. Se essas linhas pegarem o padrão `fonte = 'cliente'`,
o cliente inerte para de ser cobrado **em silêncio**. Este predicado fecha o buraco sem
depender de quem fizer a fatia 2 lembrar de gravar `fonte = 'psa'`.

## Subtarefas

- **T1** — A consulta acima, com teste dos quatro casos: nada enviado · enviado pelo
  portal · anexado pelo analista · arquivo excluído.
- **T2** — O texto do aviso, nos dois canais: proposta escrita em
  [`VALIDACAO_aviso-sem-documento.md`](VALIDACAO_aviso-sem-documento.md), aguardando a
  coordenação. **⚠️ Modelo novo na Meta** (`solicitacao_sem_documento_v1`): fila própria e
  o classificador de categoria, que já reprovou um modelo por cortesia. Submeter com
  **validade de 30 dias** — é o único momento em que isso não custa edição.
- **T3** — Reserva idempotente por período, via `reservar_envio`. A chave é **parâmetro**
  da função, então o período entra nela sem migração.
- **T4** — O job. Molde pronto no banco: `check-ticket-deadlines-daily` chama edge
  function por `pg_net`; `fechar-chamados-resolvidos-diario` chama função plpgsql.
  **O período é configuração, não constante** — ele vai mudar depois do primeiro mês real.
- **T5** — **Primeira passada seca:** monta a lista de quem receberia, grava, e não
  envia. É o que responde quantos são elegíveis, quantos têm telefone e quantos caem em
  falso positivo — sem gastar mensagem paga nem arriscar a nota de qualidade do número
  num disparo de estreia.

## Decisão tomada — o valor do enum (⚠️ MIGRAÇÃO escrita, não aplicada)

`notificacao_tipo` ganha **`solicitacao_sem_documento`**. Migração escrita em
`supabase/migrations/20260824143238_notificacao_tipo_solicitacao_sem_documento.sql`,
com o motivo inteiro no cabeçalho: reusar `cobranca_pendencia` faria a varredura
automática e o clique manual do aviso 2, no mesmo cliente e no mesmo dia, produzirem
chave de idempotência **idêntica** — e o segundo não sai, sem erro e sem log.

Depois de aplicar no sandbox e regerar o `types.ts`, dois `Record` exaustivos passam a
exigir entrada (`notificacoesInternas.ts:83` e `NotificationPopover.tsx:89`). O aviso é
externo e nunca cai no sino, então a entrada segue o molde dos cinco `chamado_*`.

## Decisão pendente

**O período.** 30 dias bate de frente com o prazo de envio, que é `enviada_em + 30 dias`
por regra (decidido em 11/08, sem coluna): o **primeiro** disparo cairia no dia em que o
prazo vence. Ou o primeiro sai antes e a repetição é de 30 em 30, ou o texto assume que
fala de prazo vencido — e aí vale copiar o que o órfão fazia, com o aviso de vencimento
**dentro** do valor do marcador, que muda sem passar pela Meta.

## Fora de escopo

- Cobrar item pendente **depois** da conferência: isso é o aviso 2, e é manual por decisão.
- Régua de marcos e consolidação item a item — não há lista nesta mensagem.
- Cobrança financeira.
- Preencher `representante.telefone`: 8 de 38 hoje (medido na ALE-11). Sem telefone o
  aviso sai só por e-mail, e nenhuma tarefa desta sprint muda esse cadastro.

## Achados no caminho

- **B1** — `documento_tipo.solicitacao_item_id` está preenchido em **1 de 68 linhas**.
  Quem tentar provar "documento recebido" por esse caminho recebe zero para todo mundo.
- **B2** — Todo o uso de solicitação em produção até 2026-08-24 é teste. Não há linha de
  base de comportamento de cliente: o período é palpite informado até o primeiro real,
  e é por isso que T4 pede configuração e T5 pede passada seca.
