# TAREFA 8 — Criar item de backlog por fora do app

> **Decisão dela em 22/09/2026**, depois da varredura das seis reuniões de 18 a 22/09: as
> tarefas que nascem dessa leitura terminam em `docs/sprints/`, e **só entram no backlog da
> ferramenta se alguém digitar à mão**. A porta para `sprint_backlog_items` existe apenas
> de dentro do app.
>
> **Banco: não.** A tabela existe, as colunas existem, nenhuma migração é necessária.
>
> ⚠️ **Duas coisas não são de agente**, e estão nas subtarefas: a entrada em
> `supabase/config.toml` (arquivo que o `AGENTS.md` proíbe editar) e a publicação da função
> em produção (Lovable).
>
> **Metade da ponte já está construída.** Esta tarefa não inventa fluxo: ela expõe por HTTP
> o que `useCriarDemandasBacklog` já faz por dentro.

## O que foi medido, e como

Varredura em 22/09/2026 na `develop`.

| onde procurei | o que achei |
|---|---|
| a tabela do backlog | `sprint_backlog_items`, 13 colunas, **Acesso: sprint** |
| quem já insere | `useCriarDemandasBacklog.ts:49`, em lote, com `sprint_id: null` (backlog global) e `status: 'pending'` |
| a tela que lista | `/equipe/backlog` (`App.tsx:280`), filtrando `sprint_id is null` e `status != 'moved_to_sprint'`, ordenado por prioridade |
| quem gera sugestão hoje | `gerar-demandas-sprint` — **só sugere, não grava** |
| edge function que grava auditoria | **nenhuma** |

**O payload já está definido** por `useCriarDemandasBacklog.ts:35-43`, e a função nova tem
de produzir exatamente o mesmo:

```
title, description, priority, estimated_hours,
sprint_id: null, project_id, suggested_by, status: 'pending'
```

**O padrão de autenticação também já existe.** `gerar-demandas-sprint/index.ts:36-57` faz
`Bearer` → `supabase.auth.getClaims(token)` → cliente `admin` com `SERVICE_ROLE_KEY`. É
esse o molde, e não se inventa outro: o `AGENTS.md` lembra que as funções rodam com
`verify_jwt = false`, então a validação do token é **manual, no código Deno**.

## O problema de desenho, e ele não é a inserção

**A auditoria.** O `AGENTS.md` é inegociável: toda operação de Create/Update/Delete usa
`useAuditLog` com o diff campo a campo. E `useCriarDemandasBacklog.ts:58-72` cumpre isso —
grava **um log por item**, com `area: 'dev'`, `entity_type: 'backlog_item'`,
`action: 'created'` e os quatro campos no `changed_fields`.

Só que `useAuditLog` **é um hook React**. Uma edge function não pode chamá-lo. E a medição
mostrou que **nenhuma função de borda grava auditoria hoje** — essa função seria a
primeira.

O caminho é inserir direto em `audit_logs`, cujas colunas são
`action, area, changed_fields, details, entity_id, entity_name, entity_type, performed_by, performed_at`
(`docs/rls/mapa-do-banco.md:281`). Tecnicamente trivial. **O que não é trivial é o
`performed_by`.**

### D1 — De quem é a linha quando quem cria não é pessoa? ⚠️ **decide antes do código**

`audit_logs.performed_by` e `sprint_backlog_items.suggested_by` são ambos FK para
`profiles.id`. Quando o item nasce de um script, de um agente ou do n8n, **não há pessoa**.
Três saídas, e nenhuma é obviamente certa:

- **Exigir o token de uma pessoa real.** Quem chama manda o Bearer dela, e o log fica no
  nome dela. Honesto e rastreável; obriga alguém a estar logado, o que mata a automação
  agendada.
- **Um perfil de serviço** (ex.: "Agente"). A automação roda sozinha e a auditoria aponta
  para uma entidade que existe. Custa criar o perfil e aceitar que "quem criou" é um robô.
- **`performed_by` nulo, com `details` dizendo a origem.** Mais simples; enfraquece a
  trilha, que é justamente o que o `AGENTS.md` protege.

**Recomendação: perfil de serviço.** Preserva a trilha sem exigir sessão humana, e deixa
óbvio na tela que o item veio de fora. Mas a escolha é dela, e muda a T2 e a T3.

### D2 — Quem pode chamar

A função escreve com `SERVICE_ROLE_KEY`, que **atravessa a RLS**. Então o controle tem de
ser explícito no código: validar o papel de quem chama com `has_role_or_higher`, como o
resto da casa faz, e recusar o que não for equipe. Sem isso, a função vira um buraco na
RLS de `sprint_backlog_items`.

## O que o ensaio de 22/09 já provou — leia antes de começar

Antes de escrever a função, os quatro itens foram criados **à mão** no sandbox por SQL via
MCP, e movidos na interface por ela. O ensaio respondeu coisas que a tarefa teria de
descobrir sozinha, e **muda três subtarefas**.

**O payload está validado.** `sprint_backlog_items` aceitou o formato de
`useCriarDemandasBacklog` sem ajuste. Os valores em uso no banco são `status` = `pending` e
`priority` = `high` / `medium` / `low`.

**O formato da auditoria está validado.** Quatro linhas em `audit_logs` com `area: 'dev'`,
`entity_type: 'backlog_item'`, `action: 'created'` e o `changed_fields` no formato
`{ old: null, new: … }` — mais quatro de `action: 'updated'` na correção seguinte. É o que
a T3 tem de reproduzir.

**O caminho do `.md` vai no COMEÇO da descrição.** O card do backlog trunca o texto, e na
primeira versão o ponteiro ficou no fim — invisível sem abrir o item. Só deu para saber
olhando a tela.

### O achado que muda o desenho: mover COPIA, não referencia

Ela moveu um item para a sprint e ele virou linha em `sprint_deliverables`. Uma correção de
texto feita **depois** no item de origem **não alcançou o entregável**: o backlog ficou com
"notificação" e o entregável com "notificacao".

**Consequência para esta tarefa:** depois que o item sai do backlog, corrigir a origem não
chega mais na sprint. O texto que a função gera precisa nascer certo — não existe "ajusto
depois". Isso pesa na revisão humana antes de mover, não na função.

### O que NÃO se conserta aqui

Mover um item faz um `insert` em `sprint_deliverables` e um `update` em
`sprint_backlog_items`, e **nenhum dos dois grava auditoria** — `useMoveDomainBacklogItem`
(linha 277) e `useCreateDomainBacklogDeliverable` (261) não chamam `logAction`.

**É gap conhecido e deixado aberto de propósito**, inventariado em
[`geral/auditoria-gaps-cud.md`](../../geral/auditoria-gaps-cud.md), linhas 80-81, cujo
cabeçalho diz que fechá-los é tarefa futura revisada à parte, porque muda comportamento.
**Não feche de carona nesta tarefa.**

## Subtarefas

### T0 — Conferir o alvo no sandbox

Pelo MCP do Supabase (projeto `vgzomuwnsdgrxbkyoavq`, que é o **sandbox** — produção é
Lovable Cloud e lá só cabe SELECT): quantos itens já existem em `sprint_backlog_items`,
quais `status` e `priority` aparecem de fato, e se `project_id` costuma vir preenchido.
Serve para a função nascer com os valores certos, não com os que o tipo permite.

### T1 — Decidir D1 e D2

Nada se escreve antes. A D1 muda o corpo da função; a D2 muda a porta.

### T2 — A função `criar-item-backlog`

- Molde de auth: `gerar-demandas-sprint/index.ts:36-57`.
- Aceita **lote**, como o hook — um array de itens, não um por chamada.
- Devolve o `id` de cada item criado, para quem chamou poder referenciar.
- Recusa com 401/403 legível; nunca falha em silêncio.

### T3 — A auditoria, e é ela que faz a tarefa valer

Um `audit_logs` por item, espelhando `useCriarDemandasBacklog.ts:58-72`:
`area: 'dev'`, `entity_type: 'backlog_item'`, `action: 'created'`, `entity_name` = título, e
`changed_fields` com `title`, `priority`, `estimated_hours`, `project_id` no formato
`{ old: null, new: <valor> }`.

**Se a T3 for cortada por tempo, a tarefa inteira deve ser cortada junto.** Uma porta de
escrita sem trilha é pior que não ter porta.

### T4 — A entrada no `config.toml` ⚠️ **não é de agente**

`verify_jwt = false` para a função nova, no padrão das outras 7+ entradas já lá. Mas
`supabase/config.toml` está na lista de **arquivos autogerados que nunca se edita**
(`AGENTS.md`, regra inegociável). Então esta subtarefa é **humana, pelo Lovable** — ou o
`AGENTS.md` precisa dizer qual é a exceção para função nova, o que é achado próprio e vale
registrar.

### T5 — Publicar ⚠️ **produção é passo humano**

No sandbox, publicação normal. **Em produção, pelo Lovable** — mesma regra dos crons da
[TAREFA 6](TAREFA_crons-de-notificacao-em-producao.md).

### T6 — Provar com as tarefas desta sprint

O teste de aceitação não é sintético: criar como itens de backlog as
[TAREFA 5](TAREFA_painel-de-notificacoes-enviadas.md),
[6](TAREFA_crons-de-notificacao-em-producao.md) e
[7](TAREFA_prefixo-teste-nos-cadastros-de-dev.md), cada uma com o caminho do `.md` no
`description`, e conferir que aparecem em `/equipe/backlog` ordenadas por prioridade — e
que há três linhas novas em `audit_logs`.

## O que esta tarefa não entrega

Registrado para não criar expectativa errada:

- **Não decide nada.** Item entra como `pending`; a triagem continua dela. Nesta mesma
  varredura, dois candidatos morreram por já estarem escritos — nenhuma automação teria
  percebido.
- **Não substitui o `.md`.** `description` é texto; o raciocínio continua no repositório e
  o item carrega o ponteiro.
- **Não lê reunião sozinha.** É a porta de entrada, não o leitor. Quem lê transcrição e
  cruza com o código continua sendo uma sessão de trabalho.

## Aceite

- [ ] D1 e D2 decididas por ela, por escrito.
- [ ] A função recusa quem não é equipe, com código legível.
- [ ] Cada item criado tem **um** `audit_logs` correspondente.
- [ ] O payload é idêntico ao de `useCriarDemandasBacklog` — mesma tabela, mesmos campos.
- [ ] As TAREFAS 5, 6 e 7 aparecem em `/equipe/backlog`, criadas pela função.
- [ ] Nada foi publicado em produção por agente.

## Referências

| arquivo | o que é |
|---|---|
| `src/hooks/useCriarDemandasBacklog.ts:35-72` | o payload e a auditoria que a função tem de reproduzir |
| `supabase/functions/gerar-demandas-sprint/index.ts:36-57` | o molde de autenticação manual |
| `src/hooks/useDomainBacklog.ts:132-135` | o que a tela lista: `sprint_id is null`, `status != 'moved_to_sprint'` |
| `src/hooks/useAuditLog.ts:108-140` | o formato do log, e o motivo de o `insert` ser checado |
| `docs/rls/mapa-do-banco.md:281` | colunas de `audit_logs` |
| `docs/rls/mapa-do-banco.md:829` | colunas de `sprint_backlog_items` |
| `supabase/config.toml` | as entradas `verify_jwt = false` — arquivo que não se edita à mão |
