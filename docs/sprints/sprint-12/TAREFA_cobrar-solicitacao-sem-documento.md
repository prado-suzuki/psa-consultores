# TAREFA — Cobrar solicitação sem nenhum documento (GES-04)

> **Origem:** card GES-04 da sprint 12 (P3 · 20h) mais a correção do tech lead em
> 2026-08-24: a descrição do card mistura duas coisas, e o escopo real é mais estreito.
> **Confirma o aviso 8** do catálogo de 15 avisos em
> [`../sprint-11/TAREFA_notificacoes-coleta-documentos.md`](../sprint-11/TAREFA_notificacoes-coleta-documentos.md)
> (linha 18: *"Cobrança do que falta · Cliente · e-mail · X dias sem resposta"*).
> **Textos em vigor:** [`avisos-cliente.md`](../../geral/avisos-cliente.md) ·
> [`whatsapp-templates.md`](../../geral/whatsapp-templates.md)

> **Estado em 25/08/2026 — T1 a T5 concluídas, no ar só no sandbox.** As cinco subtarefas
> fecharam, os dois canais foram testados ponta a ponta e o modelo está aprovado na Meta.
> Commit `47c02dca`. **Produção não recebeu nada:** nem o valor de enum, nem a função da
> lista, nem o cron, nem a borda nova. O que falta está em "Falta para produção", abaixo.

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

- **T1** ✅ **CONCLUÍDO (24/08/2026)** — A consulta acima virou a função
  `solicitacoes_a_cobrar(_intervalo_dias)`, migração `20260824213938`. As quatro guardas
  também vivem na borda `notificar`, e a divisão é deliberada: **a borda guarda a VERDADE,
  o agendador guarda a FREQUÊNCIA.** Chamada solta na borda não pode confiar em quem
  chamou.
- **T2** ✅ **CONCLUÍDO (25/08/2026)** — Texto dos dois canais em
  [`VALIDACAO_aviso-sem-documento.md`](VALIDACAO_aviso-sem-documento.md), validado pela
  coordenação em 24/08 e **aprovado pela Meta em 25/08** como `solicitacao_vencida_v1`
  (id `1388762306030268`, categoria Utilidade). Passou pelo classificador de categoria de
  primeira — nenhuma cortesia, nenhuma projeção de etapa futura.
  ⚠️ **A validade ficou em 12h (43200s), não 30 dias.** A subida por API saiu do escopo
  desta sprint; o custo aceito está registrado no anexo técnico da validação.
- **T3** ✅ **CONCLUÍDO (24/08/2026)** — Reserva idempotente por `reservar_envio`, **sem
  tocar na chave**: ela continua por DIA, e o que segura o período é o filtro de
  `notificacao_envio.created_at` dentro do ciclo. A coluna `created_at` nasceu para isso
  (migração `20260824205811`) — `enviado_em` só é preenchido na confirmação, então linha
  reservada e nunca confirmada não contava como cobrança.
- **T4** ✅ **CONCLUÍDO (25/08/2026)** — Cron `cobrar-solicitacoes-vencidas-diario`,
  migração `20260825132757`, no molde do `check-ticket-deadlines-daily`: um
  `net.http_post` por linha da lista, com URL e token vindos do `vault`. **Nasce
  desativado** — armar é ato consciente em cada ambiente. O período é configuração, como
  a tarefa pedia: parâmetro da função, não constante.
  ⚠️ **Tudo pelas funções do `pg_cron`, nunca por DML em `cron.job`:** como `postgres`,
  SELECT passa mas UPDATE e INSERT são negados — a tabela é do `supabase_admin`.
- **T5** ✅ **CONCLUÍDO (25/08/2026)** — A passada seca é `select * from
  solicitacoes_a_cobrar()`, e a função não envia nada. Medido em produção nesta data:
  **zero** solicitações elegíveis (3 abertas, nenhuma vencida). E o teto do canal WhatsApp
  por ciclo é **8 mensagens**, porque 8 dos 39 destinatários com acesso ao portal têm
  telefone — R$ 0,28 por ciclo à tarifa de Utilidade.

## Decisão tomada — o valor do enum (⚠️ MIGRAÇÃO aplicada só no sandbox)

`notificacao_tipo` ganha **`solicitacao_vencida`**. Migração em
`supabase/migrations/20260824143238_notificacao_tipo_solicitacao_vencida.sql`, com o
motivo inteiro no cabeçalho: reusar `cobranca_pendencia` faria este aviso e o clique
manual do aviso 2, no mesmo cliente e no mesmo dia, produzirem chave de idempotência
**idêntica** — e o segundo não sai, sem erro e sem log.

**O nome mudou em 24/08**, de `solicitacao_sem_documento` para `solicitacao_vencida`: o
gatilho é o **vencimento** da solicitação, e "sem documento" descrevia a condição, não o
evento. Nos outros avisos o cliente já enviou algo e falta o resto — ali é cobrança de
pendência. Aqui os três nomes coincidem de propósito: valor de enum, `event_type` da API
e modelo na Meta (`solicitacao_vencida_v1`).

**Aplicada no sandbox em 24/08/2026. Produção não recebeu.** Depois de produção aplicar e
o `types.ts` ser regerado, dois `Record` exaustivos passam a exigir entrada
(`notificacoesInternas.ts:83` e `NotificationPopover.tsx:89`) e o typecheck quebra de
propósito. O aviso é externo e nunca cai no sino, então a entrada segue o molde dos cinco
`chamado_*`: `rotulo: 'Aviso'`, `tom: PRIMARIO`.

## Decisão tomada — o período: 30 dias, checado todo dia

Era a decisão pendente, e a pergunta de 17/08 (*"de quantos em quantos dias cobramos?"*)
seguia sem resposta da coordenação. Fechada em 25/08/2026, com o tech lead:

**30 dias, ancorados em `enviada_em`** e não na data da última cobrança. Âncora fixa não
escorrega: um ciclo perdido não empurra todos os seguintes. O intervalo é **parâmetro** da
`solicitacoes_a_cobrar(_intervalo_dias)`, então mudar para 15 ou 45 não pede migração.

**O primeiro disparo cai no dia em que o prazo vence, e isso deixou de ser problema:** o
texto assume prazo vencido, com a marca de vencimento **dentro do valor do marcador** —
`03/09/2026 (vencido)` —, que muda sem passar pela Meta. É exatamente o que o órfão fazia.

**O cron checa todo dia, não de 30 em 30.** O tech lead sugeriu 30; quem devolve vazio
fora do ciclo é a lista, e checar diariamente uma lista quase sempre vazia é barato. Um
cron de 30 dias atrasaria cada cobrança em até 29 dias e perderia o dia da virada.

⚠️ **O prazo de 30 dias do texto NÃO é este parâmetro.** Ele é regra fixa (11/08) e está
impresso na mensagem; o intervalo entre cobranças é configuração. Mudar um não muda o
outro.

## Falta para produção

Nenhum item é da engenharia do aviso: todos são de entrega ou de conta.

| O que | Por que ainda não | Dono |
|---|---|---|
| Aplicar as quatro migrações em produção | Passo **humano** pelo chat do Lovable, por regra da casa. Ordem: enum → `created_at` → `solicitacoes_a_cobrar` → cron | Alexandre |
| Duas linhas nos `Record` exaustivos | Só quebram depois de o `types.ts` ser regerado, o que acontece na aplicação acima | junto da migração |
| Publicar a borda `notificar` em produção | O ramo `solicitacao_vencida` e o `ambiente_ref` estão só no sandbox | Alexandre |
| Armar o cron | Nasce desativado: `vault.create_secret` para `notificar_url` e `n8n_callback_token`, depois `cron.alter_job(job_id, active := true)` | ato consciente |

**O canal alcança cliente — não há item da Meta pendente.** `health_status` da WABA
responde `can_send_message: AVAILABLE` para WABA, Business e App (medido em 25/08/2026), o
número está `CONNECTED` e `VERIFIED`, e o negócio tem verificação e meio de pagamento. O
`dev_mode` do app governa outros produtos da Meta, não a entrega do Cloud API — não deduza
alcance dele.

**A única assimetria entre os canais é o cadastro:** telefone em 8 de 39 destinatários
contra e-mail em 39 de 39. Quem não tem telefone recebe só por e-mail.

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
