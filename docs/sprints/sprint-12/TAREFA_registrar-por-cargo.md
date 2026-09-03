# TAREFA 1 de 4 — Registrar no cadastro de cliente passa a ser por cargo

> **Uma das quatro tarefas** que aplicam a regra decidida em 02/09/2026 no módulo de cadastro
> de cliente. As outras: [alterar](TAREFA_alterar-por-cargo.md) ·
> [excluir](TAREFA_excluir-por-cargo.md) · [mensagens](TAREFA_mensagens-de-recusa.md).
>
> **É esta que fecha o erro relatado.** Independente das outras três — pode ir sozinha.

> ## ✅ CONCLUÍDO (02/09/2026)
>
> **T1 e T2 aplicadas em produção.** Conferido por fora, no banco e no código:
>
> - As três policies `rls_*_insert` de `contribuinte`, `representante` e `ordem_servico` estão
>   como `has_role_or_higher(auth.uid(), 'sublider')`, **sem** `cliente_visivel_para` nem
>   `resolve_user_cluster_ids`. Migração `20260902192547_b88c3438-c3f6-4a09-a61c-3bac67f25745.sql`.
> - Os dois inserts geram o id antes de gravar (`crypto.randomUUID()`) e não pedem mais a linha
>   de volta — `useSaveClientTransaction.ts:508` e `:734`. Commit `3d4c03d5`.
> - `admin_full_*_insert` intocadas; SELECT, UPDATE e DELETE das três tabelas intocados.
>
> **Falta a validação com a usuária:** a Layara cadastrar o Frigobom de ponta a ponta (T3).
> Antes disso, conferir por fora se já existe cliente "Frigobom" em OSG — o aviso de duplicata
> não enxerga cliente de outro cluster, então ela não será avisada.

## A regra

> **Gravar** (registrar, alterar, excluir) exige apenas papel `sublider` ou acima.
> **Ler** continua recortado por cluster do cliente.

Decisão da Patricia: *"quando ela faz o primeiro registro tem que ser tudo liberado sublíder
pra cima pra ela poder salvar o cadastro, senão o serviço se perde."*

## O problema

A Layara (papel `lider`) não conseguiu cadastrar "Frigobom — João Bombonatto" em 01/09/2026.
Nove tentativas entre 18h39 e 20h59, todas recusadas no mesmo ponto:

```
new row violates row-level security policy for table "contribuinte" (contribuinte/upsert, 42501)
```

Criar cliente e criar contribuinte **não fazem a mesma pergunta**:

| Passo | Pergunta |
|---|---|
| `criar_cliente_com_clusters` (RPC) | é `sublider` ou acima? **e veio ao menos 1 cluster?** |
| `rls_contribuinte_insert` | é `sublider` ou acima? **e o cliente é de um cluster seu?** |

A Layara resolve um cluster só (TAX, via Equipe Sinop → área Tax). O cliente foi marcado como
**OSG**. O passo 1 passou e criou o cliente; o passo 3 barrou — por causa de um cliente que
ela mesma tinha acabado de criar, e que já nascia invisível para ela.

O cargo nunca foi o problema: `lider` passa nos dois.

## T1 — ⚠️ MIGRAÇÃO · As três policies de INSERT

`rls_cliente_insert` **já é** só cargo — não se mexe. `cliente_clusters`,
`inscricao_contribuinte`, `distribuicao_receita` e `os_produtos_contratados` idem.

> **SQL sem comentários de propósito.** O editor SQL do Lovable corta o statement em `;` e em
> `--`. Todo o "por quê" mora neste arquivo.

```sql
DROP POLICY IF EXISTS rls_contribuinte_insert ON public.contribuinte;
CREATE POLICY rls_contribuinte_insert ON public.contribuinte
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_insert ON public.representante;
CREATE POLICY rls_representante_insert ON public.representante
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_insert ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

## T2 — Front: gerar o id e não pedir a linha de volta

> **Sem esta subtarefa, T1 não resolve nada.** O erro continua, com o texto idêntico.

### Por que

Dois inserts do salvamento pedem a linha de volta, e isso liga o `RETURNING`. Com `RETURNING`,
o Postgres aplica a policy de **SELECT** sobre a linha nova e recusa o comando inteiro — com a
**mesma mensagem** de uma recusa de INSERT. As duas são indistinguíveis pelo texto, e é por
isso que passou batido: o erro que a Layara viu pode ter sido este desde o começo.

Medido no sandbox em 02/09/2026, em tabela descartável dentro de transação (a transação
abortou sozinha; nada persistiu):

```sql
CREATE POLICY p_ins ON _teste_returning FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY p_sel ON _teste_returning FOR SELECT TO authenticated USING (false);
INSERT INTO _teste_returning (v) VALUES ('x') RETURNING id;
```
```
ERROR 42501: new row violates row-level security policy for table "_teste_returning"
```

A policy de leitura do contribuinte é `(excluido = false) AND (has_role(admin) OR
cliente_visivel_para(cliente_id))` — **falsa na linha nova** quando o cliente é de outro
cluster. A da OS é equivalente. O INSERT passa pela policy ampliada de T1 e o retorno derruba.

### O que fazer

Em `src/hooks/useSaveClientTransaction.ts`, nos dois pontos:

| Linha | Hoje | Passa a ser |
|---|---|---|
| `:494` | `.from(contribuinteTable).insert(buildContribFields(e)).select("id").single()` | id gerado antes, `.insert({ id, ...buildContribFields(e) })`, sem `.select()` |
| `:718` | `.from("ordem_servico").insert({...}).select("id").single()` | idem |

O retorno só servia para obter o `id` — que passa a ser conhecido antes de gravar, e continua
alimentando as inscrições estaduais (a partir do contribuinte) e o rateio e os produtos (a
partir da OS). Sem `.select()`, o supabase-js envia `Prefer: return=minimal` e não há
`RETURNING`, então a policy de leitura não é consultada.

Usar `crypto.randomUUID()`, que já é padrão no repo (8 arquivos, incluindo geração de id para
insert em `useDomainOrgComments.ts:392`). As duas colunas têm `DEFAULT gen_random_uuid()` e
aceitam valor explícito.

**Os outros cinco inserts do salvamento não precisam de ajuste** — `inscricao_contribuinte`,
`representante`, `distribuicao_receita`, `os_produtos_contratados` e `cliente_clusters` não
pedem retorno. E o cliente é criado por `criar_cliente_com_clusters`, que é `SECURITY DEFINER`
e devolve a linha de dentro da função, fora do alcance da policy.

> **T1 e T2 vão juntas.** Aplicar só a migração e testar dá a impressão de que não funcionou.

## T3 — Conferência

Como um `lider` ou `sublider` de um cluster só, cadastrando cliente novo e marcando um
cluster que **não** é seu:

| | Esperado |
|---|---|
| Salvar o cadastro completo | passa inteiro: cliente, contribuinte, inscrição, representante, OS, rateio, produtos |
| Procurar o cliente na lista depois | **não aparece** — é a leitura, e ela continua por cluster de propósito |
| Nenhum cliente órfão fica para trás | conferir com a consulta abaixo |

```sql
SELECT c.id, c.nome, c.created_at
  FROM public.cliente c
 WHERE c.excluido = false
   AND NOT EXISTS (SELECT 1 FROM public.contribuinte ct WHERE ct.cliente_id = c.id)
 ORDER BY c.created_at DESC;
```

## Por que esta tarefa sozinha já vale

Registrar é a única das três operações que fica **realmente** livre depois da mudança, porque
`INSERT` não procura linha nenhuma antes de gravar. Alterar e excluir têm `WHERE`, logo
precisam **ler** a linha — e a leitura continua por cluster, então seguem naturalmente
limitados (medido em dev e registrado em `soft_delete_distribuicao_receita`: *"um líder sem o
cluster do cliente afeta 0 linhas, sem erro"*).

E o primeiro registro é onde o serviço se perde de verdade: se ele não entra, não existe.

## O que fica de fora

- **O desfazer.** Se algum passo falhar por outro motivo, a tela ainda não consegue apagar o
  cliente recém-criado — isso depende da policy de DELETE, que é a
  [tarefa de excluir](TAREFA_excluir-por-cargo.md). Até lá, uma falha no meio continua
  deixando cliente órfão.
- **Os nove órfãos "Frigobom"** já em produção (01/09, cluster OSG, todos sem contribuinte).
  A Patricia decide o destino deles depois.
- **A mensagem** continua dizendo "Sem permissão para cadastrar cliente" com o texto cru do
  banco — [tarefa das mensagens](TAREFA_mensagens-de-recusa.md).

## Referências

- Auditoria das 24 operações (artefato, 02/09/2026).
- `src/hooks/useSaveClientTransaction.ts` — os 8 passos do salvamento.
