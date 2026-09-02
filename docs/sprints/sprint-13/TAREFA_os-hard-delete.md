# TAREFA 5 — Ordem de serviço passa a excluir de vez

> **Decisão da Patricia, 02/09/2026:** só `cliente` e `contribuinte` guardam linha excluída.
> Todo o resto apaga de verdade.
>
> **É a conversão com mais travas — e todas decididas em 02/09.** As outras duas estão em
> [representante e rateio](TAREFA_representante-e-rateio-hard-delete.md).

## A regra, decidida em 02/09/2026

> **Com projeto vinculado, não apaga** — a tela diz *"esta OS tem projeto vinculado, desvincule
> antes"*. **Sem projeto, apaga tudo em cascata.**

E a boa notícia: **o banco já se comporta exatamente assim.** Conferido em produção, tudo que
aponta para `ordem_servico`:

| O que aponta | Coluna | Ao apagar a OS | Precisa mudar? |
|---|---|---|---|
| `distribuicao_receita` (rateio) | `id_ordem_servico` | **CASCADE** — vai junto | não |
| `os_produtos_contratados` | `ordem_servico_id` | **CASCADE** — vai junto | não |
| `org_projects` (projeto) | `ordem_servico_id` | **NO ACTION** — bloqueia | não |
| `solicitacao` | `ordem_servico_id` | **SET NULL** — sobrevive, perde o vínculo | **sim, passa a bloquear** → T1b |

**Do projeto, nenhuma migração é necessária.** `NO ACTION` e `RESTRICT` bloqueiam igual — esta
constraint não é adiável, então a diferença entre as duas não existe na prática. O bloqueio dos
70 casos já funciona hoje; o que falta é **a frase**, porque hoje ele estoura um erro técnico em
vez de dizer o que fazer. **Da solicitação, sim** — ver T1b.

Descartada de saída a hipótese de o projeto ir junto em cascata: `org_tasks.project_id` é
`NOT NULL` com chave `ON DELETE SET NULL` — contradição já documentada em
[`.lovable/plan/corrigir-exclusão-de-projeto…`](../../../.lovable/plan/), que torna a exclusão
de projeto com tarefas impossível. Cascata para o projeto falharia ou corromperia.

**Segunda trava, decidida em 02/09/2026:** *"se tiver solicitação de documentos, não deixar
apagar a OS"* — **qualquer** solicitação, aberta ou encerrada.

A regra não olhar situação é o que a torna simples: cabe direto na chave estrangeira, que hoje
está como `SET NULL` e passa a bloquear. **Sem gatilho, sem função** — uma linha de migração.

Medido em produção: **4 OS ficariam bloqueadas**, todas ativas. E **nenhuma** das 33 OS já
marcadas como excluídas tem solicitação, então a limpeza de T3 não trava por causa disto.

(Para registro, as 11 solicitações existentes: 1 rascunho, 2 enviadas, 1 em checklist e 7
encerradas. As 4 ligadas a OS se concentram nas mesmas 4 ordens.)

## O princípio por trás das duas travas

Repare no que projeto vinculado e solicitação de documentos têm em comum: são as marcas de que
**o trabalho aconteceu**. Enquanto elas existirem, a OS não é apagável.

Isso muda o que "apagar OS" significa. Não é encerrar um serviço — é **desfazer um cadastro
errado**: uma OS que nasceu por engano e não tem nada pendurada nela. Nas palavras da Patricia
em 02/09: *"não faz sentido apagar porque foi um projeto finalizado."*

A prática confirma. Das 33 OS que alguém já marcou como excluída:

| | |
|---|---|
| com projeto vinculado | **0** |
| com solicitação de documentos | **0** |
| com rateio (sai junto na cascata) | 27 |
| com valor de projeto lançado | 6 |

Nenhuma tinha trabalho pendurado. Quem excluiu, excluiu cadastro — nunca serviço prestado. As
travas não vão barrar o uso real; vão barrar o engano.

## O que se perde, e é o preço da decisão

`ordem_servico` guarda **33 linhas com `excluido = true`** hoje. Ela é o registro contratual:
valor do projeto, parcelas, entrada, reembolsos, datas. Apagando de verdade, o que resta é a
linha do `audit_logs`, que registra o ato de excluir e não os valores.

E apagar uma OS **leva junto**, por cascata já configurada no banco:

```
distribuicao_receita.id_ordem_servico    -> ON DELETE CASCADE  (vai junto)
os_produtos_contratados.ordem_servico_id -> ON DELETE CASCADE  (vai junto)
```

Isso é o que você pediu quando disse *"se está dentro da OS tem que excluir junto com ela"*. A
diferença é que agora sai de graça, pela chave estrangeira, em vez de por trigger — **e é por
isso que esta decisão aposenta a tarefa da cascata**, que existia só para fazer à mão o que a
exclusão física faz sozinha.

## O rastro que já vazou, e que esta tarefa limpa

Enquanto a exclusão foi lógica, a cascata não disparava, e o remendo do front só valia quando a
exclusão passava por aquela tela. Sobrou:

| | |
|---|---|
| Linhas de rateio **ativas** apontando para OS excluída | **26** |
| Percentual de rateio fantasma que somam | **1800%** |
| Produtos contratados presos em OS excluída | **40** |

Esses números entram em qualquer relatório que some rateio sem cruzar com `ordem_servico`.

---

## T1 — A frase para quem tenta apagar OS com projeto

Sem migração: o bloqueio já existe. O que muda é o que a pessoa lê quando ele dispara.

A recusa chega como violação de chave estrangeira — código `23503`, citando
`org_projects_ordem_servico_id_fkey`. O catálogo de mensagens em `src/lib/rlsMessages.ts` já
tem o lugar exato disso: a lista `REGRAS_DE_NEGOCIO`, que casa pelo **nome da constraint** e é
o casamento firme. Acrescentar uma entrada:

```
constraints: ['org_projects_ordem_servico_id_fkey']
titulo:  'Esta OS tem projeto vinculado.'
detalhe: 'Desvincule o projeto antes de excluir a ordem de serviço.'
```

E incluir `23503` na lista `CODIGOS_DE_REGRA`, que hoje cobre só `23514`, `23505` e `P0001`.

Vale conferir o nome real da constraint no banco antes — a lista casa por nome, e nome errado
faz a recusa cair no genérico em vez de mentir, mas também não ajuda ninguém.

## T1b — ⚠️ MIGRAÇÃO · Solicitação de documentos passa a bloquear

Como a regra vale para **qualquer** solicitação, sem olhar situação, ela cabe na própria chave
estrangeira. Hoje ela está como `SET NULL` — a solicitação sobrevivia e ficava sem vínculo.

```sql
ALTER TABLE public.solicitacao
  DROP CONSTRAINT IF EXISTS solicitacao_ordem_servico_id_fkey;

ALTER TABLE public.solicitacao
  ADD CONSTRAINT solicitacao_ordem_servico_id_fkey
  FOREIGN KEY (ordem_servico_id) REFERENCES public.ordem_servico(id)
  ON DELETE RESTRICT;
```

Conferir o nome real da constraint antes de rodar — o `DROP` acima usa o nome que está em
produção hoje, mas vale reler.

**A frase** entra no mesmo catálogo de T1, casando pelo nome da constraint:

```
constraints: ['solicitacao_ordem_servico_id_fkey']
titulo:  'Esta OS tem solicitação de documentos vinculada.'
detalhe: 'Desvincule a solicitação antes de excluir a ordem de serviço.'
```

> **Por que não virou gatilho:** a primeira versão desta regra valia só para solicitação em
> aberto, e situação é coisa que chave estrangeira não sabe ler — exigiria um gatilho
> `SECURITY DEFINER`, porque `solicitacao` tem RLS e uma contagem feita sem isso devolveria zero
> para quem não enxerga a linha, deixando a trava passar batido. A decisão de bloquear sempre
> eliminou o gatilho, a função e esse risco. Fica registrado caso a regra volte a distinguir.

## T2 — ⚠️ MIGRAÇÃO · Permissão de apagar

Tirar o guarda `excluido = false` do `USING`, que impede apagar linha já marcada:

```sql
DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

## T3 — ⚠️ MIGRAÇÃO · Limpar o que vazou

Antes de converter, os órfãos precisam sair — senão viram lixo permanente sem OS viva que os
alcance.

```sql
DELETE FROM public.os_produtos_contratados p
 WHERE EXISTS (SELECT 1 FROM public.ordem_servico os
                WHERE os.id = p.ordem_servico_id AND os.excluido = true);

DELETE FROM public.distribuicao_receita dr
 WHERE EXISTS (SELECT 1 FROM public.ordem_servico os
                WHERE os.id = dr.id_ordem_servico AND os.excluido = true);

DELETE FROM public.ordem_servico WHERE excluido = true;
```

> **Irreversível, e apaga 33 OS.** Refazer as contagens antes: hoje são 26 rateios órfãos, 40
> produtos presos e 33 OS marcadas. Se vierem bem diferentes, parar e entender.
>
> Se a Patricia preferir **guardar** as 33 antes de apagar, exportar por SELECT primeiro.

## T4 — Front apaga em vez de marcar

Em `src/hooks/useSaveClientTransaction.ts`:

1. O passo `ordem_servico/soft-delete` deixa de chamar `soft_delete_ordem_servico` e passa a
   `.delete().in("id", removedOsIds)`, conferindo quantas linhas saíram.
2. **Remover o bloco `distribuicao_receita/soft-delete-orfas`** logo abaixo: ele existia para
   levar o rateio junto à mão, e a cascata agora faz isso. Uma regra em dois lugares foi o que
   produziu as 26 linhas fantasma.
3. Tratar o erro de chave estrangeira (`23503`) com a frase da opção A. O catálogo de mensagens
   em `src/lib/rlsMessages.ts` já tem o lugar disso — a lista `REGRAS_DE_NEGOCIO` — e é onde a
   frase deve entrar, não solta no ponto de chamada.
4. Os 2 filtros `.eq('excluido', false)` sobre `ordem_servico` saem.

## T5 — ⚠️ MIGRAÇÃO · Derrubar o que sobrou

Só depois de T1–T4 rodando:

```sql
DROP FUNCTION IF EXISTS public.soft_delete_ordem_servico(uuid[]);
DROP FUNCTION IF EXISTS public.soft_delete_distribuicao_receita(uuid[]);
ALTER TABLE public.ordem_servico DROP COLUMN excluido;
```

Reemitir depois as permissões de `SELECT` e `UPDATE` de `ordem_servico`, que citam `excluido` e
quebram sem a coluna. E conferir as views `cliente_setor_regiao_atual` e `org_comments_feed`.

A função do rateio só cai aqui porque a
[tarefa do representante e rateio](TAREFA_representante-e-rateio-hard-delete.md) a deixa sem
chamador mas não a remove — as duas precisam ter saído do front antes.

## T6 — Conferência

| | Esperado |
|---|---|
| Excluir uma OS **sem** projeto | some do banco, junto com rateio e produtos dela |
| Excluir uma OS **com** projeto | recusa com frase clara sobre o projeto vinculado, e nada é apagado |
| Excluir uma OS com **solicitação de documentos** — aberta ou encerrada | recusa com frase clara sobre a solicitação, e nada é apagado |
| Relatório de rateio | sem percentual fantasma |

```sql
SELECT
  (SELECT count(*) FROM public.distribuicao_receita dr
     JOIN public.ordem_servico os ON os.id = dr.id_ordem_servico) AS rateios_com_os_viva,
  (SELECT count(*) FROM public.os_produtos_contratados p
     LEFT JOIN public.ordem_servico os ON os.id = p.ordem_servico_id
    WHERE os.id IS NULL) AS produtos_orfaos;
```

`produtos_orfaos` tem que ser zero, e permanecer zero depois de excluir uma OS pela tela.
