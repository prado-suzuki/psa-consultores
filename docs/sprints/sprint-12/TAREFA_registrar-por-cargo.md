# TAREFA 1 de 4 — Registrar no cadastro de cliente passa a ser por cargo

> **Uma das quatro tarefas** que aplicam a regra decidida em 02/09/2026 no módulo de cadastro
> de cliente. As outras: [alterar](TAREFA_alterar-por-cargo.md) ·
> [excluir](TAREFA_excluir-por-cargo.md) · [mensagens](TAREFA_mensagens-de-recusa.md).
>
> **É esta que fecha o erro relatado.** Independente das outras três — pode ir sozinha.

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

## T2 — Conferência

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
