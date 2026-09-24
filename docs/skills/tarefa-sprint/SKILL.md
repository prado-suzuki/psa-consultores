---
name: tarefa-sprint
description: Cria uma tarefa na sprint vigente do app da PSA (tabela sprint_deliverables em produção, pelo MCP do Lovable), atribuída a uma pessoa da equipe. Use quando pedirem "cria uma tarefa pra fazer X, passando pra fulano", "põe isso na sprint pro Eduardo", "bleza, cria uma tarefa disso pra mim" (derivada da conversa em curso), ou qualquer variação de adicionar/lançar tarefa, entregável ou subtarefa na sprint. Também cria item no backlog (sprint_backlog_items), mas só quando disserem "backlog" explicitamente.
---

# Tarefa na sprint vigente

As tarefas da equipe vivem em `sprint_deliverables`, no banco de **produção** (Lovable Cloud).
Escreve-se pelo MCP do Lovable, `query_database`, projeto
`4cb1f76a-b443-437e-a047-67a69019a54a`. É escrita em produção autorizada **só para isto**: um
`INSERT` em `sprint_deliverables` por tarefa confirmada, ou o CTE do adendo por item de
backlog. Nada de `UPDATE` ou `DELETE` em outras linhas; corrigir a linha recém-criada, só se
pedirem.

## 1. Qual tipo de pedido é

Decida antes de escrever qualquer coisa:

- **Generalizada** ("cria uma tarefa pra revisar os filtros do DP, passando pro Eduardo"):
  o texto é curto e claro, diz **o que** e **por que**, e deixa o **como** para a pessoa
  descobrir. Não pesquise o código, não invente passos, não chute arquivos. Duas a quatro
  frases bastam.
- **Definida** (o pedido já aponta comportamento, tela, regra ou bug concreto): pesquise o
  código antes (arquivos, hooks, tabelas pelo mapa em `docs/rls/mapa-do-banco.md`). Depois
  **devolva o seu entendimento em uma ou duas frases** e o que achou que pode mudar o pedido
  ("a tela já filtra por X; a tarefa é só Y?"). Só redija depois do ok.
- **Derivada da conversa** ("bleza, cria uma tarefa disso"): o conteúdo é o que foi
  combinado na conversa, inclusive decisões tomadas e descartadas. Não repesquise o que já
  foi estabelecido; condense. Se a conversa deixou decisão em aberto, ela vira o primeiro
  ponto da tarefa ("decidir X antes de começar"), não uma escolha sua.

Se o responsável não foi dito, pergunte. Não atribua a quem pediu por padrão.

## 2. Levantar o contexto no banco (só SELECT)

Sprint vigente:

```sql
select id, name, start_date, end_date from sprints where status = 'active' order by start_date desc;
```

Se voltar zero ou mais de uma, pare e pergunte.

Responsável, por primeiro nome (o `first_name` pode ter espaço sobrando, como "Patricia "):

```sql
select id, trim(first_name) as nome, last_name, email from profiles
where trim(first_name) ilike '<nome>%' or email ilike '<nome>%';
```

Mais de um resultado: pergunte qual. Nenhum: pergunte, não crie sem responsável.

Tarefas-mãe da sprint (os agrupadores) e o último código de cada uma:

```sql
select d.id, d.title, d.project_id, d.process_id,
       (select max(nullif(x.task_code, '')::int) from sprint_deliverables x
        where x.parent_id = d.id and x.task_code ~ '^\d+$') as ultimo_codigo
from sprint_deliverables d
where d.sprint_id = '<sprint_id>' and d.parent_id is null
order by d.created_at;
```

## 3. Onde a tarefa entra

Quase tudo na sprint é **subtarefa** de uma mãe ("Ajustes da plataforma", "Hotfixes",
"Tarefas extras", "Revisão geral da área OSG" etc.). Escolha a mãe que casa com o assunto e
proponha. Sem mãe óbvia, proponha "Tarefas extras". Tarefa solta no topo, só se pedirem.

Subtarefa: `task_code` = `ultimo_codigo + 1` (texto, ex. `'4'`); `project_id` e
`process_id` herdados da mãe. Tarefa no topo: `task_code` nulo.

## 4. Redigir

Título: verbo no infinitivo, curto, sem jargão de código ("Filtrar sócios por cargo no
Quadro Societário"). Siga a skill `escrita-humana` e **nunca use travessão longo**.

Descrição da **definida** ou **derivada** segue o molde que a equipe já usa, com as seções
em negrito, cada uma um parágrafo curto (omita a que não tiver conteúdo):

- **O que / por que**
- **Como** (caminho sugerido, com arquivos citados como `src/...`; não é roteiro fechado)
- **Pontos de atenção** (migração, produção pelo Lovable, RLS, o que não fazer de carona)
- **Depende de**
- **Pronto quando** (critério verificável)

Descrição da **generalizada**: texto plano, sem seções.

Datas: `start_date` = hoje, ou o início da sprint se ela ainda não começou; `due_date` =
fim da sprint, salvo prazo dito. Horas: a que disserem; se não disseram, na definida
proponha uma estimativa na prévia, na generalizada deixe nulo.

### Quando a tarefa vira arquivo no repositório

Se o texto tem subtarefas numeradas, medição ou decisão em aberto, ele não cabe num campo de
descrição: escreva `docs/tarefas-a-executar/<yyyy_mm_dd>_<slug>.md`, com a data de
**criação** no nome, e **registre a linha na tabela de `docs/tarefas-a-executar/README.md`,
no mesmo commit**. A descrição no app vira um resumo curto com o **caminho do arquivo na
primeira linha**.

Não use `docs/sprints/` para isso. Essa pasta guarda o registro da sprint, não tarefa
(`AGENTS.md`, §"ORGANIZAÇÃO DE DOCUMENTAÇÃO").

### Anexo, e por que a skill não anexa

Entregável e item de backlog aceitam anexo: `deliverable_attachments` tem `deliverable_id` e
`backlog_item_id`, e o app transfere os anexos do item para o entregável quando ele vai para
a sprint (`useTransferBacklogAttachments`).

**Nunca insira em `deliverable_attachments` por SQL.** A linha guarda só o `file_path`; os
bytes vivem no bucket `deliverable-attachments` do Storage, e o `query_database` não sobe
arquivo. Gravar a linha sozinha produz anexo que não abre.

O padrão é o `.md` no repositório com o caminho na descrição, que para texto é melhor que
anexo: fica versionado e diffável. Arquivo que não é texto (planilha, print, PDF do cliente)
se anexa à mão pela tela depois de criado o item, e a prévia avisa que esse passo ficou
pendente.

## 5. Confirmar e gravar

Mostre a prévia **compacta** e espere o ok (é escrita em produção):

```
Sprint 14 · Ajustes da plataforma › 5
Filtrar sócios por cargo no Quadro Societário
Eduardo · 21/09 a 02/10 · 4h
<descrição como vai ficar>
```

Com o ok, grave. Texto plano vai direto em dollar-quote; rich text vai como marcador + JSON
TipTap, e o cast `::jsonb` valida o JSON antes de gravar:

```sql
insert into sprint_deliverables
  (sprint_id, parent_id, task_code, title, description, assigned_to,
   start_date, due_date, estimated_hours, status, project_id, process_id)
values
  ('<sprint_id>', '<mae_id>', '5', $t$<título>$t$,
   '[[tarefa-rich-text:v1]]' || ($j${"type":"doc","content":[
     {"type":"paragraph","content":[{"type":"text","text":"O que / por que","marks":[{"type":"bold"}]}]},
     {"type":"paragraph","content":[{"type":"text","text":"..."}]}
   ]}$j$)::jsonb::text,
   '<profile_id>', '2026-09-23', '2026-10-02', 4, 'pending', null, null)
returning id, task_code, title;
```

Para texto plano: `description = $d$<texto>$d$`. Parágrafo vazio no JSON é
`{"type":"paragraph"}`; nó de texto nunca pode ter `"text":""`.

O app não grava auditoria na criação de entregável (conferido em `audit_logs`), então não
invente linha lá.

Depois, responda em uma frase: onde entrou, para quem, e o código (ex. "Entrou como 5 em
Ajustes da plataforma, com o Eduardo."). Várias tarefas no mesmo pedido: uma prévia com
todas, um ok, um insert por linha com os códigos em sequência.

## Adendo: item no backlog

Só quando disserem **backlog** ("joga no backlog", "põe no backlog pra depois"). Sem essa
palavra, o destino é sempre a sprint vigente.

A tabela é `sprint_backlog_items` (tela `/equipe/backlog`, que lista `sprint_id is null` e
`status <> 'moved_to_sprint'`). Os passos 1 (tipo de pedido), 4 (redação) e 5 (prévia, ok,
gravação) valem iguais. O que muda:

- **Não há responsável, datas, mãe nem código.** Pessoa, datas e processo só se escolhem ao
  mover o item para uma sprint. Se disserem "passando pra fulano", ponha `Para: <Nome>.` na
  primeira linha da descrição e avise na prévia que o app não guarda o responsável no backlog.
- **`priority`**: `high`, `medium` ou `low` (padrão `medium`). Proponha na prévia.
- **`suggested_by`**: de quem é a ideia, ou seja **quem pediu** — Patricia
  `fb81a718-124e-45e2-bab5-b0241738c7b7`, Bernardo `99c58979-1368-444f-a09d-7c1776257c99`.
  Não é campo fixo.
- **`project_id` / `cluster_id`**: só se citarem o projeto ou a área; resolva por
  `select id, name from projects` / `estrutura_clusters where is_active` e confirme na
  prévia. Na dúvida, nulo.
- **`sprint_id` nulo e `status = 'pending'`**, sempre.

### O card mostra duas linhas

`EquipeBacklog.tsx` corta a descrição em `line-clamp-2` na lista; o texto inteiro só aparece
ao abrir o item. Então o que importa vai nas duas primeiras linhas, e **a prévia tem de
mostrar onde o corte cai**. Item com arquivo no repositório leva o caminho do `.md` no
começo, nunca no fim.

### Gravar item e auditoria num statement só

O `AGENTS.md` exige log de auditoria em toda criação, e `useCriarDemandasBacklog.ts:73-84`
define o formato. Item criado por fora do app usa o mesmo, num CTE: o item não pode existir
sem a trilha. O `performed_by` é o perfil de serviço **Automação PSA**
(`3f4870f5-cd37-4892-bcc9-c2bbfeb005a2`), porque a escrita não foi uma pessoa clicando; o
`suggested_by` continua sendo quem pediu.

```sql
with novo as (
  insert into sprint_backlog_items
    (title, description, priority, estimated_hours, sprint_id, project_id, cluster_id,
     suggested_by, status)
  values
    ($t$<título>$t$, $d$<descrição>$d$, 'medium', null, null, null, null,
     '<id de quem pediu>', 'pending')
  returning id, title, priority, estimated_hours, project_id
)
insert into audit_logs
  (action, area, entity_type, entity_id, entity_name, performed_by, changed_fields, details)
select
  'created', 'dev', 'backlog_item', novo.id, novo.title,
  '3f4870f5-cd37-4892-bcc9-c2bbfeb005a2',
  jsonb_build_object(
    'title',           jsonb_build_object('old', null, 'new', novo.title),
    'priority',        jsonb_build_object('old', null, 'new', novo.priority),
    'estimated_hours', jsonb_build_object('old', null, 'new', novo.estimated_hours),
    'project_id',      jsonb_build_object('old', null, 'new', novo.project_id)
  ),
  'Criado por SQL, fora do app, a pedido de <Nome>.'
from novo
returning entity_id, entity_name;
```

Havendo arquivo no repositório, o `details` termina com o caminho do `.md`.

### Em lote, não é por aqui

Muitos itens de uma vez entram pelo botão **Importar tarefas** de `/equipe/backlog`, que lê
`.md` no formato de `docs/tarefas-a-executar/PARA-O-BACKLOG.md`, mostra revisão antes de
gravar e desmarca título já presente. O CTE acima é para o item avulso que nasce no meio de
uma conversa.

### Mover copia, não referencia

Mover para a sprint **copia** o item para `sprint_deliverables`: corrigir o texto no
backlog depois não chega à sprint. O texto tem de nascer certo, e é por isso que a prévia
existe.
