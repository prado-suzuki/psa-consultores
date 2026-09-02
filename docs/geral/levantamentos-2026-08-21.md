# Levantamentos — 21/08/2026

Os três itens que estavam marcados como "falta levantar antes de decidir" na fila do
documento de estado de 20/08 (arquivado pelo próprio autor em 21/08 e apagado em 01/09;
está no histórico do git). Nenhuma decisão tomada aqui, nenhum código alterado — só
medição, com o endereço de cada número.

> ## ⚠️ O que eu meço e o que eu não meço
>
> **Minha conexão alcança só o banco de desenvolvimento.** A produção é outro banco, e eu não
> tenho acesso a ele.
>
> Isso importa porque **os três itens são sobre produção**. Onde a estrutura é a mesma nos dois
> bancos (política de RLS, definição de função, texto de migration), medir no dev responde — e eu
> digo quando é o caso. Onde o número depende de **dado**, o número abaixo é do dev e **não** vale
> como resposta sobre produção; está marcado assim.
>
> Uma medição no lugar errado convence mais que nenhuma, porque vem com números. Foi o que
> aconteceu em 20/08 com as migrações de `color_index`: medi o dev, encontrei tudo aplicado, e
> concluí que o item de produção não existia.

---

## 1. A troca de `rls_org_tasks_insert` — o item mais delicado

**Pergunta registrada:** *existe algum INSERT que a nova política permite e a antiga não, além de
subtarefa de tarefa já visível?*

**Resposta: não. E o ramo novo é mais estreito que um que já vigorava.**

### As duas políticas, lado a lado

A antiga está em `supabase/migrations/00000000000000_baseline.sql`; a nova em
`supabase/migrations/20260818103000_org_tasks_insert_criador_subtarefa.sql`, e está viva no dev
com o mesmo texto (conferido em `pg_policy`).

```
ANTIGA   admin  OR  sublider+  OR  assigned_to = auth.uid()

NOVA     admin  OR  sublider+  OR  assigned_to = auth.uid()
         OR ( created_by = auth.uid()
              AND parent_task_id IS NOT NULL
              AND org_task_visivel(parent_task_id) )
```

**A mudança é puramente aditiva.** Os três ramos antigos estão idênticos, caractere por
caractere. Nada foi removido nem afrouxado. O delta é exatamente um ramo, e ele exige as **três**
condições ao mesmo tempo.

### O guardrail é o mais estreito possível

`org_task_visivel(uuid)` é **literalmente o `USING` de `rls_org_tasks_select`**, verbatim — mesma
lista de ramos, mesma ordem. Ou seja: "tarefa que eu vejo" significa exatamente "tarefa que o
`SELECT` me deixa ler". O guardrail não pode ser mais largo do que a pessoa já lê, por
construção.

### O delta por papel — e ele atinge menos gente do que a própria migration supôs

| papel | pessoas | efeito do ramo novo |
|---|---|---|
| admin · lider · sublider | 5 · 8 · 6 | **nenhum** — já cobertos pelos ramos antigos |
| `team_member` | **15** | **é o único papel atingido** |
| `client` | 33 | **inalcançável** — ver abaixo |
| `marketing` | 1 | **inalcançável** |

Para quem não é admin/lider/sublider, `org_task_visivel(pai)` só é verdade se a pessoa for
`assigned_to`, `created_by` ou `reviewer_id` **do pai**. Medido no dev:

| papel | tarefas atribuídas | criadas | em revisão |
|---|---|---|---|
| `team_member` | 290 | 233 | 0 |
| `client` | **0** | **0** | **0** |
| `marketing` | **0** | **0** | **0** |

**Os 34 usuários de `client` e `marketing` não têm nenhuma `org_task` em nenhum dos três papéis**,
então o ramo novo é inalcançável para eles — não por permissão, por ausência de vínculo. Se um dia
um `client` receber uma `org_task`, isso muda, e é a única condição que reabriria a pergunta.

### Por que o ramo novo concede MENOS que o antigo

O ramo `assigned_to = auth.uid()`, que já vigorava antes de 18/08, permite a um `team_member`
criar **qualquer** tarefa — inclusive **de topo** — desde que atribua a si mesmo.

O ramo novo permite só **subtarefa**, só de **pai visível**, e o que ele adiciona de fato é
poder deixar `assigned_to` **nulo**.

> **O delta inteiro, em uma frase:** um `team_member` passa a poder criar uma subtarefa **sem
> responsável** sob uma tarefa que ele já vê. Antes conseguia o mesmo ato atribuindo a si mesmo — e
> conseguia mais que isso, porque podia criar tarefa de topo.

### Um número da migration que hoje lê diferente

A migration afirma *"as 11 subtarefas criadas no sistema são todas de líder ou sublíder: nenhuma
de team_member"*. Medido no dev hoje, sem filtro de data:

| papel do criador | subtarefas | sem responsável |
|---|---|---|
| lider | 57 | 0 |
| sublider | 50 | 3 |
| **team_member** | **23** | 1 |
| admin | 5 | 2 |

**Não é contradição — é escopo.** A frase da migration é sobre *"desde 30/07/2026, quando a seção
de subtarefas entrou"*. As 23 de `team_member` vão de 25/02 a 23/07, todas **anteriores** àquela
seção, criadas por outro caminho. E isso *reforça* o caso: `team_member` já criava subtarefa antes,
necessariamente atribuindo a si mesmo.

### O que falta para decidir reverter — nada, do lado da medição

O levantamento pedido está completo. **Sobra uma decisão, não uma medição:** aceitar o corte da
visibilidade, ou apertar para "mãe criada por mim". A própria migration já escreveu a alternativa:

```sql
AND EXISTS (SELECT 1 FROM public.org_tasks m
             WHERE m.id = parent_task_id AND m.created_by = auth.uid())
```

Isso fecharia o caso de quem **recebeu** a tarefa delegada. Só que esse caso **já podia** criar
subtarefa antes de 18/08, pelo ramo `assigned_to` — então apertar não recupera nada que a mudança
tenha aberto. Apertaria abaixo do que já existia.

---

## 2. Gatilho chamado → tarefa: quantos clientes têm projeto de Canal de Chamados

**Pergunta registrada:** *se for raro, é linha de fila; se for comum, é o problema principal.*

**Resposta: estruturalmente é comum — a maioria. Em incidência observada, é um caso.**

### O mecanismo, lido da função

`delegar_chamado_gera_tarefa()` (SECURITY DEFINER, `AFTER INSERT OR UPDATE OF assigned_to`) acha o
projeto por:

```
org_projects.external_client_id = NEW.cliente_id
  AND produto_segmento.is_canal_chamados
```

Se não acha, `raise warning` e `return null`. **Falha silenciosa:** o chamado é delegado, nenhuma
tarefa nasce, ninguém é avisado na tela.

E há um segundo aviso, que a fila não mencionava: se o cliente tiver **mais de um** projeto de
canal, a função usa o mais antigo e grava `raise warning`. Também invisível.

### Os números — **dev, e o que importa é produção**

| | |
|---|---|
| produtos marcados `is_canal_chamados` | **1** |
| clientes com projeto de canal | 10 |
| clientes com chamado | 11 |
| **clientes com chamado e SEM canal** | **6 de 11 (55%)** |
| chamados delegados cujo cliente não tem canal (todo o histórico) | 65 |

Mas o gatilho só existe desde 17/08/2026, então o histórico não passou por ele. Recortando no
período em que ele esteve vivo:

| | |
|---|---|
| chamados com responsável tocados desde 17/08 | 4 |
| **dos quais sem canal → falharam em silêncio** | **1** |
| tarefas efetivamente geradas por chamado | 3 |

`3 + 1 = 4`, fecha.

### A leitura, e ela é de dois lados

**A exposição é majoritária:** 6 dos 11 clientes com chamado não têm canal. Qualquer delegação
para eles falha em silêncio.

**A incidência é mínima:** 1 caso, porque delegar chamado é raro — 4 vezes em quatro dias.

Pelo critério registrado na fila, é **o problema principal** e não linha de fila: não é raro, é a
maioria dos clientes. Mas o volume dá tempo — não é um incêndio, é uma armadilha aberta.

**E existe um conserto barato que não é a tela:** o `raise warning` poderia ser um erro visível na
delegação, ou a tela de delegação poderia checar o canal antes. Nenhum dos dois foi decidido.

---

## 3. Comparar esquema dev × produção — **não consigo, e por que isso não é desistência**

Este item **não foi levantado**, e não por falta de tentativa: **eu não tenho acesso ao banco de
produção**. Comparar esquemas exige ler os dois.

O que eu consigo dizer sem acesso:

| evidência | de onde vem |
|---|---|
| prod tem 11 áreas, dev tem 10 | ela mediu e registrou em 20/08 |
| "Adm & Fin" está ativa só em prod | idem |
| as 3 migrações de `color_index` estão em prod | ela aplicou e confirmou |
| as 3 migrações de tarefas/RLS estão em prod | aplicadas pela mensagem que trocou de assunto |
| as migrações de `color_index` **não existem como arquivo** | conferido no repositório |

**A consequência prática:** `supabase/migrations/` não descreve produção. Há mudança em produção
sem arquivo, e há arquivo que ninguém confirmou em produção. Enquanto isso valer, *nenhuma*
comparação de esquema pode ser feita pelo repositório — ela precisa de leitura direta dos dois
bancos.

**Quem tem acesso consegue em uma consulta.** Rodar em cada banco e comparar a saída:

```sql
-- colunas
select table_name, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' order by 1, 2;

-- políticas de RLS
select tablename, policyname, cmd, qual, with_check
  from pg_policies where schemaname = 'public' order by 1, 2;

-- funções e gatilhos
select p.proname, md5(pg_get_functiondef(p.oid)) as assinatura
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' order by 1;

select c.relname as tabela, t.tgname, md5(pg_get_triggerdef(t.oid)) as assinatura
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal order by 1, 2;
```

O `md5` existe para a comparação ser por igualdade em vez de leitura linha a linha — o que
diverge aparece como hash diferente.

---

## O que este levantamento fechou e o que não

| item | estado |
|---|---|
| RLS `rls_org_tasks_insert` | **levantado, completo.** Sobra decisão, não medição. |
| gatilho chamado → tarefa | **levantado.** A resposta é "comum, mas de baixo volume". |
| esquema dev × produção | **não levantado** — precisa de acesso aos dois bancos. As consultas estão acima. |
