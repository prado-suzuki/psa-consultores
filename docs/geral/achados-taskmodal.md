# Achados do TaskModal (registrados durante a decomposição)

Levantados ao escrever o teste de caracterização de
`src/components/equipe/fiscal/tasks/TaskModal.tsx` (AGENTS.md §Decomposição:
"não corrija bugs durante a divisão"). **Nada aqui foi corrigido na
refatoração** — todos estão travados como estão em `TaskModal.test.tsx`, com
comentário `QUIRK` no ponto correspondente. Cada item é candidato a uma tarefa
própria.

## 1. Aprovar uma revisão joga a tarefa para `em_ajuste`

`onSubmit` calcula o próximo status como:

```ts
const nextStatus = outcome === 'send' ? 'review' : outcome ? 'em_ajuste' : values.status;
```

Como `outcome === 'approved'` é *truthy* e diferente de `'send'`, aprovar cai no
mesmo ramo de "solicitar ajustes" e grava `status: 'em_ajuste'` — junto com o
comentário de sistema `Tarefa aprovada` e o feedback visual "Revisão aprovada!".
Ou seja: a UI diz aprovado, o banco recebe "em ajuste".

Impacto: tarefa aprovada volta para a fila do responsável.
Travado em: `TaskModal.test.tsx > revisor delegado > aprovar grava o comentário
"Tarefa aprovada"`.

## 2. `actual_hours: null` vira `0` no update

No `form.reset` de edição o campo recebe `''` (`task.actual_hours ?? ''`). O
schema usa `z.union([z.coerce.number(), z.literal('')])` e o `coerce` ganha do
`literal('')` — `Number('') === 0` —, então `values.actual_hours` chega ao
`onSubmit` como `0`. A guarda `values.actual_hours === '' || == null ? null`
nunca dispara e o payload leva `actual_hours: 0` em vez de `null`.

Impacto: toda edição de tarefa sem horas realizadas grava `0`, o que polui o
diff de auditoria e contradiz o comentário no próprio código, que fala em
preservar `actual_hours`. Também derruba o motivo original da guarda (RLS-06).
Travado em: `TaskModal.test.tsx > edição > preenche o formulário ... payload
exato`.

## 3. Campos de select/número mostram a mensagem padrão do zod

`assigned_to`, `client_id`, `contribuinte_id` e `estimated_hours` chegam ao
resolver como `undefined` (e não como string vazia), então as mensagens
customizadas (`'Responsável é obrigatório'` etc.) nunca aparecem: o usuário vê
`Required` e `Expected number, received nan`. Só `title`, `description`,
`project_id` e as datas exibem texto em português.

Travado em: `TaskModal.test.tsx > criação > bloqueia o envio e mostra as
mensagens de campo obrigatório`.

## 4. Guarda "revisor não pode concluir" é inalcançável pela UI

```ts
if (currentUserIsReviewer && nextStatus === 'done') { form.setError('status', ...) }
```

`currentUserIsReviewer` só é verdadeiro com `task.status === 'review'`, e nesse
caso o `<fieldset>` inteiro está desabilitado e o status `done` é filtrado do
select. Não há caminho de UI que produza `nextStatus === 'done'` para o revisor:
código defensivo morto (ou proteção que deveria estar no hook/RLS).

## 5. Cancelar em modo edição também limpa o rascunho de tarefa nova

`handleOpenChange(false)` chama `clearDraft()` sempre, inclusive quando o modal
foi aberto para editar (onde a persistência de rascunho está desabilitada).
Efeito colateral: abrir/fechar uma edição apaga o rascunho de uma tarefa nova em
andamento.
