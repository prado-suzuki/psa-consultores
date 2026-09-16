# Avisos de projeto e tarefa no Google Chat

**Pedido de 14/09/2026 (Patrícia):** ligar o site da PSA ao espaço do Google Chat, para a
equipe ser avisada de projetos e tarefas onde ela já conversa.

**Decisão de recorte, no mesmo dia:** um espaço **por área**, e o primeiro corte leva
`tarefa_prazo_proximo`, `tarefa_atrasada`, `tarefa_atribuida`, `tarefa_em_revisao` e
movimento de projeto.

---

## O que este plano NÃO faz, e por quê

**Não inventa aviso novo.** Quatro dos cinco eventos já existem em `public.notificacao` e
já foram decididos: quem recebe, quando, e com que texto. O trabalho aqui é **um canal a
mais**, não um sistema de notificação.

**Não usa o n8n.** E-mail e WhatsApp passam por lá porque o n8n é quem fala com o Gmail e
com a Meta. O webhook de espaço do Chat é um POST JSON e não precisa de intermediário: uma
peça a menos, o texto versionado neste repositório, e o segredo no mesmo lugar dos outros.

**Não manda DM.** Webhook de espaço posta no espaço, e só. Mensagem direta exigiria um app
do Chat com service account e delegação no Workspace, que é outra ordem de trabalho.

**Não menciona ninguém com `@`.** Menção que acende exige o Google user ID de cada pessoa,
que `profiles` não tem. O nome vai em texto. Se a menção virar requisito, é coluna nova em
`profiles` mais preenchimento manual — frente separada.

## Medição em produção, 14/09/2026

O que mudou o desenho depois de medir:

| achado | número | consequência |
|---|---|---|
| Áreas com projeto | **2**: Tax (115 projetos, 291 tarefas abertas) e OSG (31 / 181) | "um espaço por área" são **dois** espaços hoje, não sete |
| Áreas ativas sem nenhum projeto | 5 (Board, Digital, Marketing, Adm & Fin, PRADO ADV CIVIL, TAX LEGAL) | não criar webhook para elas agora |
| Tarefa aberta sem área | **0** | o mapa área→espaço cobre tudo; não precisa de espaço "órfão" |
| `alertar-tarefas-prazo-diario` | **ativo**, 11h UTC, rodando desde 03/09 | a fonte dos avisos de prazo já está no ar e não precisa ser ligada |
| Avisos de prazo | 108 `prazo_proximo` + 65 `atrasada` em 12 dias (~14/dia) | **todos nascem no mesmo minuto**, das 11h UTC: repassar um a um seria despejo |
| Avisos de trigger | 60 `tarefa_atribuida` + 28 `tarefa_em_revisao` em 35 dias (~3/dia) | mensagem avulsa serve |
| Mudança de status de projeto | **2 em 60 dias** (contra 105 projetos criados) | aviso de "status mudou" seria mudo. O evento útil é **projeto criado** |
| Tarefas já atrasadas | 217 | se algum dia alguém trocar o D+1 exato por um intervalo, o espaço recebe 217 mensagens de uma vez |

## Desenho: o Chat espelha o sino

Todo aviso já nasce em `public.notificacao`, gravado por trigger ou pelo cron. Em vez de
ensinar cada gatilho a falar com o Chat, **um despachante lê o que ainda não foi espelhado
e manda**.

    trigger / cron  ->  public.notificacao  ->  despachante  ->  borda  ->  espaço do Chat
                              (já existe)        (novo)        (nova)

Três coisas saem de graça desse formato:

1. Os quatro avisos existentes entram de uma vez, sem tocar em nenhum trigger que hoje
   funciona.
2. Nenhuma escrita de usuário ganha HTTP dentro da transação. Trigger que faz rede é
   trigger que trava commit quando a rede cai.
3. Aviso futuro no sino ganha o Chat sem código novo.

### A chave de idempotência do Chat NÃO é a do sino

Este é o ponto onde o plano erra se for feito no automático.

`notificacao_envio.chave_idempotencia` tem índice único **global**
(`notificacao_envio_idem_uidx`). A GES-01A precisou pôr o destinatário na chave
(`20260901120951_ges01a_chave_por_destinatario.sql`) porque cada tarefa avisa **duas**
pessoas — responsável e gestor — e sem isso metade nunca receberia.

No Chat a mensagem é do **espaço**, não da pessoa. Copiar a chave de lá produziria duas
mensagens idênticas no mesmo espaço, uma por destinatário. A chave aqui é:

    chat:<area>:<tipo>:<tarefa>:<dia>

Sem destinatário, de propósito. E `notificacao_envio.destinatario_id` fica nulo nas linhas
deste canal, porque não há um — é assim que se lê, no registro, que a mensagem foi para um
espaço.

**Uma chave por tarefa, mesmo quando a mensagem é uma só.** A reserva é por tarefa; o
agrupamento em resumo é formatação, não unidade de dedup. Assim uma tarefa nunca aparece
duas vezes, e se o envio falhar dá para marcar exatamente quais tarefas não saíram.

**Medido em 14/09, contra produção:** 250 linhas de sino para **150 tarefas distintas** em
30 dias. A dedup por tarefa corta 40% — e essas 100 linhas a mais seriam mensagem repetida
no mesmo espaço.

### Resumo diário para prazo, agrupado por PESSOA

Os avisos de prazo nascem todos às 11h UTC, do mesmo job. Viram **uma** mensagem por área,
com seções por responsável. Os de trigger saem avulsos, um por evento. Pelas 150 tarefas de
30 dias, o espaço fica em torno de **2 a 3 mensagens por dia por área**.

**Por pessoa, e não por marco** — decisão da Patrícia em 14/09, olhando as primeiras
mensagens no espaço. A pergunta que um grupo faz é "de quem é a bola", não "o que vence
hoje": o nome vira cabeçalho e o marco vai no fim da linha. Por isso vencida e a vencer
convivem na mesma mensagem, ao contrário do sino, onde cada aviso é uma linha na caixa de
UMA pessoa e o marco é o título.

**O marco sai da data, não do tipo.** `tarefa_prazo_proximo` cobre dois marcos (faltam 3
dias e vence hoje), então o tipo não basta para escrever a frase — e, vindo da data, ela
sai certa mesmo se o cron pular um dia e pegar a tarefa noutro ponto da régua.

**Cada linha carrega responsável, projeto, cliente e prazo.** O cliente entrou em 14/09
(migration `20260915000433`): das 446 tarefas abertas, as 446 têm cliente pelos dois
vínculos, o da tarefa e o do projeto.

### Thread por projeto

O envio usa `threadKey = project_id` com
`messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`. Cada projeto vira uma conversa
no espaço, em vez de uma parede plana.

### Sandbox não fala com o espaço de verdade

Segredo do Supabase é por projeto, então os dois bancos têm segredos de mesmo nome e valor
diferente: no sandbox, ambos apontam para o webhook **Teste**; em produção, cada um para o
espaço da sua área. Nenhum código precisa saber em que ambiente está.

---

## Fases (uma por commit)

**1 · O valor de enum.** `google_chat` em `notificacao_canal`. Arquivo sozinho porque
Postgres não deixa usar valor de enum na mesma transação que o cria — é o mesmo motivo
pelo qual a GES-01A foi partida em três. Reversível sem tocar em nada que roda.

**2 · `avisos_para_o_chat`, que só lê.** Molde do `tarefas_a_alertar` da GES-01A: a função
diz o que sairia, e quem envia é outra coisa. É ela que deduplica por tarefa, resolve a
área, monta a chave e aplica o recorte de `ambiente`. Roda a vontade antes de existir
borda, segredo ou espaço: `select * from avisos_para_o_chat(interval '30 days')` é a
passada seca. **A ordem em produção importa:** esta migration referencia o valor
`google_chat`, então a fase 1 tem de ser aplicada antes — os timestamps garantem, desde que
apliquem na ordem.

**3 · A borda `notificar-equipe`, e o mapa área→espaço dentro dela.** Um segredo por área
(`GCHAT_WEBHOOK_TAX`, `GCHAT_WEBHOOK_OSG`) e, no código, só a correspondência
nome-da-área→nome-do-segredo. A URL do webhook **é credencial**: não entra em tabela, não
entra em arquivo versionado. Área sem segredo não envia e não é erro — é como as cinco
áreas ativas sem projeto ficam de fora sem código extra.

Padrão **reservar → enviar → confirmar** da
`supabase/functions/notificar/`, pelo motivo que aquele arquivo já escreve: se a função
morre entre enviar e gravar, sobra evidência da tentativa. Função **nova**, não extensão da
`notificar`: aquela é moldada em aviso ao cliente, com `solicitacao` como entidade e canais
que falam com o n8n. É a mesma razão pela qual ela própria não estendeu a `notify-ticket`.

**4 · O despachante.** Cron a cada 15 minutos que chama a borda, que por sua vez lê a
`avisos_para_o_chat` e agrupa prazo em resumo. Quinze minutos, e não uma vez por dia, porque as duas origens têm ritmos diferentes: prazo nasce em lote às 11h UTC, atribuição e revisão nascem de trigger ao longo do dia, e aviso de atribuição que chega no dia seguinte já não é aviso. Molde do `net.http_post` + vault da GES-04
(`20260825140358`), que já está no repositório. **Nasce desativado**, como os dois crons que
escrevem sozinhos — ligar é um UPDATE em `cron.job`, por banco, quando for a hora.

**5 · Projeto criado.** Único item que é gatilho novo, não canal novo: valor novo em
`notificacao_tipo` e trigger em `org_projects`. Depois que o resto estiver provado — e
sabendo que são ~2 por dia, contra as 2 mudanças de status em 60 dias que **não** justificam
aviso.

## O que só existe no deploy, e não no repositório

Três coisas que nenhum commit entrega, e sem as quais a borda responde mas não publica:

1. **`[functions.notificar-equipe] verify_jwt = false` no `supabase/config.toml`.** Sem
   isso o cron, que chama com `x-api-key` e sem `Authorization` (molde da GES-04), leva 401
   antes de entrar na função. O arquivo é autogerado e o AGENTS.md proíbe editá-lo à mão,
   então **quem grava a entrada é o Lovable, ao publicar a função** — vale conferir que
   ela ficou lá, do lado das outras.
2. **Os segredos `GCHAT_WEBHOOK_TAX` e `GCHAT_WEBHOOK_OSG`**, um por área, em cada banco.
   No sandbox, ambos apontando para o webhook de teste.
3. **O segredo `CRON_CHAT_TOKEN`** na edge function, e o mesmo valor no vault do banco como
   `cron_chat_token`, mais o `notificar_url` (que a GES-04 já usa, e é a mesma URL base —
   não crie um segundo com outro nome). É por aí que o cron se identifica na borda.
4. **Ligar o job**, que nasce desativado nos dois bancos — e **não é por `UPDATE`**:

   ```sql
   select cron.alter_job(
     job_id := (select jobid from cron.job where jobname = 'despachar-avisos-do-chat'),
     active := true)
   ```

   O `UPDATE cron.job SET active = true` é o que a documentação do pg_cron mostra, e foi o
   que o cabeçalho da migration `20260914235057` escreveu — mas no sandbox ele volta
   `42501: permission denied for table job`, porque o papel do CLI lê `cron.job` e não
   escreve nela. O `alter_job` roda como dono do job e passa. Medido em 14/09/2026.

   **Não corrija aquele cabeçalho editando o arquivo da migration:** ela já está no ledger,
   e reaplicá-la faz `unschedule` + `schedule`, o que devolveria o job ao estado desativado
   — desligando justamente o que se acabou de ligar.

## Ordem que não pode inverter

Migration aplicada no sandbox vem **junto** do commit que a usa, nunca depois. Produção é
passo humano pelo chat do Lovable, antes de `develop → main`.
