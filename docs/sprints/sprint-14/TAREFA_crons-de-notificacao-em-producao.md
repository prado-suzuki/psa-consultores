# TAREFA 6 — As notificações que "não estão rodando"

> **Origem: o levantamento apresentado por ele em 18/09/2026**, feito por Eduardo e
> Alexandre a pedido dele e conferido no Claude. A conclusão registrada foi: *"o código
> existe, mas não há agendamento ativo"*, e a lista das que não funcionam ficou em **novo
> cliente criado, solicitação vencida sem documento recebido, chamado vencido, aviso de
> tarefa no Google Chat e avisos automáticos do agente PSA**.
>
> **A varredura no repositório contradiz metade dessa conclusão, e é por isso que esta
> tarefa existe.** O cron não está faltando: ele **nasce desativado de propósito**, e o
> motivo está escrito no próprio arquivo.
>
> ⚠️ **Esta é a única tarefa da sprint 14 que toca produção.** Ligar um job de cron em
> produção é **passo humano pelo chat do Lovable** (`AGENTS.md`, "Dois bancos"). Agente
> não executa, nem por MCP.

## O que foi medido, e como

Varredura em 22/09/2026 na `develop`.

| onde procurei | o que achei |
|---|---|
| crons de notificação nas migrations | existem. `20260825132757_cron_cobrar_solicitacoes_vencidas.sql` é o mais recente |
| o motivo de o job estar inativo | está escrito no cabeçalho do arquivo, numa seção própria |
| funções de borda que fazem varredura | `check-ticket-deadlines`, `notificacao-status`, `notificar`, `notificar-equipe` |

O cabeçalho do `20260825132757` tem uma seção intitulada, literalmente:

```
-- NASCE DESATIVADO, E ISSO NAO E CAUTELA EXCESSIVA
--
--    Migracao roda nos DOIS bancos. Ativo, o job comecaria a cobrar em dev no dia
--    seguinte -- e o cenario 4 de teste aponta para o e-mail real do Alexandre.
```

E registra outra coisa que a tarefa precisa respeitar:

```
--    Os dois crons que ja existem rodam 11h e 11h15 UTC, ou seja 07h e 07h15 locais.
--    Aqueles sao rotina INTERNA; este manda mensagem para CLIENTE, e as 07h e cedo
--    para WhatsApp de cobranca. 09h cai em horario comercial e nao disputa janela com
--    os outros dois.
```

**Consequência:** "não há agendamento ativo" é verdade e **não é defeito**. O defeito
possível é outro, e ninguém mediu ainda: *o job foi ligado em produção depois que a
migration chegou lá?* O `AGENTS.md` já avisa que
`supabase_migrations.schema_migrations` de produção **não é registro confiável** — então a
resposta não está na tabela de migrations, está em `cron.job`.

## Por que isso não é a TAREFA 5

A [TAREFA 5](TAREFA_painel-de-notificacoes-enviadas.md) pergunta **o que saiu**. Esta
pergunta **o que deveria ter saído e não saiu por nunca ter sido ligado**. São
complementares: sem a 6, a tela da 5 mostraria silêncio e ninguém saberia se é porque não
há o que enviar ou porque o job está dormindo.

**Ordem sugerida: a 6 antes da 5**, porque o resultado da T0 daqui muda o que a tela da 5
precisa mostrar.

## Subtarefas

### T0 — Medir em produção, e a medição é o coração da tarefa

SELECT pelo MCP do Lovable (**só SELECT**, `AGENTS.md`):

1. `select jobname, schedule, active, command from cron.job` — **quais jobs existem em
   produção e quais estão `active`**. Esta única consulta decide o tamanho de tudo o que
   vem depois.
2. `select * from cron.job_run_details order by start_time desc limit 50` — dos que estão
   ativos, **quais rodaram e quais falharam**. O cabeçalho do `20260825132757` avisa que,
   faltando segredo no Vault, a URL sai como `SEGREDO_AUSENTE_...` e a falha aparece
   legível aqui. Falha silenciosa em cobrança automática significa cliente nunca cobrado
   sem ninguém saber — é exatamente o que procurar.
3. Cruzar com a lista do levantamento de 18/09: das cinco apontadas, quantas têm job em
   produção, quantas têm job inativo e quantas não têm job nenhum. **São três situações
   diferentes e cada uma tem um desfecho diferente.**

**A T0 pode encerrar a frente.** Se os jobs estiverem todos ativos e rodando, o que existe
é problema de conteúdo ou de destinatário, não de agendamento — e aí a tarefa vira outra.

### T1 — Separar o que é decisão do que é esquecimento

Para cada notificação sem job ativo, dizer qual dos dois casos é:

- **Desativado de propósito**, como o `20260825132757`. Aqui não há bug; há uma decisão de
  ligar, e ela é dela.
- **Nunca foi agendado**, e deveria. Aqui há trabalho.

O levantamento de 18/09 juntou os dois num grupo só, e é essa mistura que esta subtarefa
desfaz. **Nada se implementa antes da T1.**

### T2 — Os segredos do Vault

Antes de ligar qualquer job, conferir que os segredos existem em produção. O
`20260825132757` usa Vault em vez de valor no texto de propósito — porque a migration tem
de ser o **mesmo arquivo** nos dois bancos. O arquivo registra que *"o cron de producao que
ja existe carrega a chave anon em texto puro no proprio comando"*, e que aqui não se repete
isso. Ligar um job com segredo ausente produz falha legível, não silenciosa — mas produz
falha.

### T3 — Ligar em produção ⚠️ **PASSO HUMANO**

Pelo chat do Lovable. **Agente não executa**, por nenhum caminho, nem MCP
(`AGENTS.md`, regra inegociável). Um job por vez, conferindo `cron.job_run_details` entre
um e outro.

**Respeitar a janela:** os dois crons internos rodam 11h e 11h15 UTC; o de cobrança ao
cliente foi desenhado para 13h UTC (09h em Cuiabá) justamente para não disputar janela nem
mandar WhatsApp de cobrança às 07h.

### T4 — Confirmar pela tela da TAREFA 5

Depois de ligado, o disparo aparece em `notificacao_envio` e, portanto, no painel da
TAREFA 5. É a prova de ponta a ponta, e é o motivo de as duas serem irmãs.

## Aceite

- [ ] A T0 está respondida com o conteúdo real de `cron.job` de produção, no corpo desta
      tarefa.
- [ ] Cada uma das cinco notificações apontadas em 18/09 está classificada: job ativo, job
      inativo por decisão, ou sem job.
- [ ] Nenhum job foi ligado por agente.
- [ ] Nenhum job ligado sem o segredo correspondente conferido.
- [ ] O que foi ligado aparece em `notificacao_envio`.

## Referências

| arquivo | o que é |
|---|---|
| `supabase/migrations/20260825132757_cron_cobrar_solicitacoes_vencidas.sql` | o cron mais recente, e o cabeçalho que explica por que nasce desativado |
| `supabase/migrations/20260824143238_notificacao_tipo_solicitacao_vencida.sql` | registra que "o job do pg_cron e a rota na borda seguem na GES-04" |
| `supabase/functions/check-ticket-deadlines/` | a varredura de chamado vencido |
| `supabase/functions/notificar/` | a borda que **envia**; o cron só liga uma ponta na outra |
| [`TAREFA 5`](TAREFA_painel-de-notificacoes-enviadas.md) | a tela que prova que o disparo saiu |
