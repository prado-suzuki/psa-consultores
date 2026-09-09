# A Lista de tarefas: o texto que não aparece e o prazo que não é cobrado

**Aberto em 09/09/2026**, a partir do feedback do Welber sobre `/equipe/tax/projetos/cadastro`
(três prints: a árvore de tarefas, o tooltip do projeto e o detalhe da tarefa). Ele levantou
três coisas: o texto que corta, o tooltip que só funciona numa linha, e o prazo da subtarefa
que passa do prazo da tarefa-mãe sem ninguém reclamar.

As três são da **visão "Lista"** (`src/components/equipe/tarefas/ProjetosTarefasList.tsx`),
que as quatro rotas de Tax e OSG montam pelo `PainelTarefas` — consertar aqui conserta as
quatro.

## O que foi medido, e onde

Os números de produção saíram por SELECT pelo MCP do Lovable em **09/09/2026**. Eles
envelhecem: remedir antes de citar.

### 1. Só a Lista corta o texto

O título da tarefa é uma linha com reticências (`truncate`, linha 360). A grade tem seis
colunas fixas somando 804px e a de Nome é `minmax(320px,1fr)` dentro de um
`min-w-[1200px]`. No piso de 1.200px sobram 396px para a coluna; tirando o recuo da
hierarquia (60px na tarefa, +24px por nível) e os slots de seta, caixa de seleção e bolinha
de status, o texto fica com **~240px na tarefa, ~216px na subtarefa e ~192px na neta** — 33,
30 e 26 caracteres. É o que os prints mostram: a tela do Welber, com escala do Windows, está
nesse piso.

Nas 863 tarefas de produção: mediana de **37 caracteres**, p90 de **66**, maior de **112**, e
**560 (65%) passam de 30**. No piso da tabela, a tarefa *mediana* já não cabe.

A Lista é a única assim. A "Tabela" (`TaskTable.tsx:152`) e a "Hoje"
(`TaskTodayView.tsx:118`) mostram o título inteiro, quebrando linha — na "Hoje" só a prévia
da descrição corta, de propósito. No detalhe da tarefa o título é um `Input` de uma linha
(`task-modal/TaskEditHeader.tsx:63`), então o título de 112 caracteres também não se lê
inteiro lá; isso é da Fase 4 do plano do celular, não desta frente.

### 2. O tooltip existe em uma linha e falta em quatro

A linha de projeto tem `title={project.name}` (linha 545) — é o que o Welber viu funcionando,
e ali o tooltip tem função extra: o texto exibido é o nome **encurtado**
(`shortProjectName`), então o tooltip é o único lugar onde o nome completo aparece.

Sem `title` nenhum: o título da tarefa e da subtarefa (360), o número/produtos da OS (513), o
cliente da OS (513) e a célula de responsável (377 e 384). Não é regra ausente — é uma linha
que ganhou e as outras que não.

### 3. Prazo da filha depois da mãe: não há validação em lugar nenhum

Nem no front, nem no banco. Não existe trigger nem constraint sobre datas em `org_tasks`, e o
`taskSchema` (`src/lib/orgTaskForm.ts`) só cobra obrigatoriedade — a única regra de negócio
dele é concluir sem horas apontadas.

Os caminhos de escrita do prazo são dois, e nenhum olha a mãe:

- o calendário da própria linha (`ProjetosTarefasList.tsx:330`);
- o `DateChip` do modal (`task-modal/TaskPropertyBar.tsx:205`).

Subtarefa criada dentro do modal nasce **sem** prazo (`buildSubtaskInput`), então o prazo dela
sempre passa por um desses dois.

Em produção, de **204** pares mãe/filha com as duas datas preenchidas, **35 estão fora da
regra** (17%), em **16 mães**, com estouro máximo de **1.346 dias**. Um nível acima, **119 de
738** tarefas vencem depois do fim do próprio projeto.

**Esses 35 mudam o desenho do conserto.** Bloqueio no salvamento prenderia quem for editar
qualquer campo dessas linhas. A forma certa já tem precedente no repo: o guard de horas em
`useUpdateOrgTask` barra só a **transição** para concluído e deixa editar outro campo de
tarefa antiga sem apontamento (`src/hooks/useOrgTasks.ts:374`). A regra de prazo copia isso:
recusa só quando **o prazo é o campo que está mudando**.

## Decisões da Patrícia, 09/09/2026

1. **Texto**: título em até **2 linhas**, e o que passar disso fica no tooltip. Não é quebra
   ilimitada — 112 caracteres viram quatro linhas e desmontam a leitura da árvore.
2. **Prazo da mãe movido para trás de uma filha que já existe**: **bloqueia**, dizendo quantas
   filhas estouram e qual a última data. Quem mandou é quem decide o que fazer com as filhas;
   o sistema não mexe em tarefa que ninguém abriu (nada de puxar as filhas junto).
3. **As 35 linhas de hoje ficam como estão.** Não há migração de dado. Elas passam a ser
   cobradas quando alguém mexer no prazo delas.
4. **A regra "tarefa ≤ fim do projeto" fica fora.** São outras 119 linhas e é outra conversa —
   provavelmente de limpeza de dado, não de trava.

## Fases

Uma fase = um commit = um pedido de validação. O agente para ao fim de cada uma.

| # | Fase | O que entra | Banco | Tamanho |
|---|---|---|---|---|
| 1 | ✅ O texto aparece inteiro | `title` nos cinco pontos sem ele; título em 2 linhas | — | P |
| 2 | ✅ O calendário não oferece data inválida | `disabled` no calendário da linha e do modal; guard no hook | — | P |
| 3 | 🟡 A regra vale por qualquer caminho | trigger em `org_tasks` | **no sandbox**, falta produção | M |

**Estado em 09/09/2026, fim do dia.** A Fase 1 saiu no commit `4fb990e3` e foi validada pela
Patrícia na tela. A Fase 2 saiu em dois commits, e o motivo fica registrado porque
vai se repetir: o `ProjetosTarefasList.tsx` estava sendo reescrito pela Fase 5 do plano do
celular na mesma hora, então o grosso saiu primeiro (`63178eb9`) e o calendário da linha
entrou depois que aquela fase commitou. Cinco linhas por cima de uma reescrita é conflito de
graça, e a recusa do hook já cobria o caminho no intervalo.

O calendário da linha respeita a mãe **imediata**, não a raiz da árvore: `renderTask` passa o
`due_date` da tarefa na recursão dos filhos. É a mesma regra do banco, e vale para a neta
(`1.4.1`) contra a mãe dela.

### Fase 1 — o texto aparece inteiro na Lista

`title` nativo (o mesmo mecanismo que já funciona na linha de projeto) no título da tarefa, no
título da OS, no cliente da OS e nas duas células de responsável. O título da tarefa e do
projeto passam de `truncate` para duas linhas.

A divisão é por largura de coluna, não por gosto: **a coluna de Nome quebra**, porque é onde o
texto vive; **as colunas estreitas ganham tooltip**, porque quebrar 180px de responsável
custaria altura de linha para quase nada.

**Não mexer na grade de larguras aqui** — ver o conflito abaixo.

**Validar:** abrir a Lista, expandir uma OS com nome comprido e ver o nome inteiro da tarefa
sem passar o mouse; e passar o mouse numa tarefa, numa OS e num responsável e ver o texto.

### Fase 2 — o calendário não oferece data inválida

Prevenção antes de mensagem: o `Calendar` deste repo aceita `disabled` por função
(`src/components/ui/calendar.tsx:21`), então na subtarefa os dias depois do prazo da mãe ficam
apagados — no calendário da linha e no do modal.

Atrás disso, a rede: guard em `useUpdateOrgTask` e `useCreateOrgTask`, lendo a mãe **do banco**
e não da lista carregada. A lista está filtrada por mês e a mãe pode não estar em memória — o
próprio hook já faz isso para descendentes (`useOrgTasks.ts:470`, "buscados no banco — e não
na lista já carregada na tela, que pode estar filtrada"). O guard dispara só quando `due_date`
muda, nos dois sentidos: filha depois da mãe, e mãe antes de uma filha.

**A redação das duas mensagens é da Patrícia**, fechada em 09/09/2026. É regra de negócio, e
regra de negócio tem texto curado (`geral/avisos-prazo-tarefa.md` é o precedente):

> Esta subtarefa não pode vencer depois de 30/09/2026, que é o prazo da tarefa-principal.

> 3 subtarefas vencem depois desta data (a última em 12/10/2026). Ajuste o prazo delas antes.

Elas moram em `src/lib/orgTaskPrazo.ts`, num lugar só, com teste que trava o texto.

**Uma colisão de palavra, registrada e não resolvida.** "Tarefa principal" já significa outra
coisa na tela: é a tarefa **sem mãe**. O `MoveTaskModal` diz que a subtarefa movida "passará a
ser uma tarefa principal do projeto de destino", e o seletor de mãe oferece "Nenhuma (tarefa
principal)". Nos dois níveis de hoje isso não incomoda — a mãe de uma subtarefa é, de fato,
uma tarefa principal. Incomoda na neta (a árvore chega a `1.4.1`): ali a mãe é ela própria uma
subtarefa, e a mensagem vai chamá-la de "tarefa-principal". Se um dia isso morder, a saída
menor é trocar o fecho por "o prazo da tarefa acima" — decisão dela, não do agente.

**Validar:** numa subtarefa, tentar marcar data depois do prazo da mãe pelo calendário da
linha e pelo modal.

### Fase 3 — a regra vale por qualquer caminho

`supabase/migrations/20260909173700_org_tasks_prazo_dentro_da_mae.sql`: a mesma regra dos dois
lados, agora no banco. Sem ela, importação, SQL direto e qualquer escrita fora da tela
continuam furando — o front cobre os dois calendários e só eles.

O gatilho é **por coluna** (`before insert or update of due_date, parent_task_id`) e ainda
confere `is distinct from` por dentro. Os dois filtros dizem a mesma coisa que o guard do
hook: linha que já estava torta continua editável em tudo o mais, e só para de piorar. As
mensagens são idênticas às do front, de propósito — quem furar por fora lê o mesmo texto que
leria na tela.

Não atrapalha o que já existia no banco: `gerar_tarefas_projeto` e a geração de tarefa por
chamado inserem **só tarefa-pai** (`parent_task_id` nulo), então nem entram no ramo. E
`sprint_deliverables` é outra tabela — lá a data da mãe é derivada como o **máximo** das
filhas, convenção oposta a esta e fora do alcance deste gatilho.

**Aplicado no sandbox em 09/09/2026** (`bun run db:sync --apply`, lote de 4 — as outras três
eram pendências de outras frentes, entre elas a `ambiente_por_cliente`, cuja ausência já havia
deixado a lista de Projetos e tarefas em branco).

**E foi provado no banco, não só instalado.** Como o front passou a impedir antes de a
gravação sair, a tela não serve mais de prova do gatilho: só uma escrita direta o exercita.
Duas transações revertidas no sandbox, sobre um par real:

| tentativa | o banco respondeu |
|---|---|
| filha de 30/06 empurrada para 20/08, com a mãe em 08/07 | `Esta subtarefa não pode vencer depois de 08/07/2026, que é o prazo da tarefa-principal.` |
| mãe puxada para 01/06, com 11 filhas depois disso | `11 subtarefas vencem depois desta data (a última em 09/07/2026). Ajuste o prazo delas antes.` |

Nada foi gravado — as duas abortaram, e a linha conferida por SELECT depois seguia em 30/06.
O texto que sai do banco é, caractere a caractere, o mesmo de `src/lib/orgTaskPrazo.ts`.

**Comando, para quando for preciso de novo:**

```
! bun run db:sync --apply
```

Depois, conferir por SELECT que o gatilho existe:

```sql
select tgname from pg_trigger where tgname = 'trg_org_tasks_prazo_dentro_da_mae'
```

Produção é o passo do Bernardo, pelo **chat** do Lovable — nunca pelo editor SQL, que corta o
statement em `;` e `--` (ver `sql-editor-lovable-quebra-statement` na memória do projeto e o
`CLAUDE.md`). A migration é aditiva e não toca em dado: coluna nenhuma muda, linha nenhuma é
reescrita, e as 35 linhas fora da regra continuam onde estão.

## Conflito registrado

A **Fase 5** do [`projetos-tarefas-no-celular.md`](projetos-tarefas-no-celular.md) (aberta)
reescreve esta mesma grade da Lista para virar cartão no celular. As fases 1 e 2 daqui são
pequenas e ficam de pé, mas quando a Fase 5 rodar ela tem de **preservar** o tooltip e as duas
linhas do título. Anotado nos dois documentos.
