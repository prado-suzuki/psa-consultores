# TAREFA 2 de 4 — Alterar no cadastro de cliente passa a ser por cargo

> **Uma das quatro tarefas** que aplicam a regra decidida em 02/09/2026 no módulo de cadastro
> de cliente. As outras: [registrar](../sprint-12/TAREFA_registrar-por-cargo.md) ·
> [excluir](TAREFA_excluir-por-cargo.md) · [mensagens](../sprint-12/TAREFA_mensagens-de-recusa.md).
>
> **Atenção:** a [tarefa de excluir](TAREFA_excluir-por-cargo.md) **depende desta**. Ver
> "Esta tarefa também destrava a exclusão lógica", abaixo.

## A regra

> **Gravar** (registrar, alterar, excluir) exige apenas papel `sublider` ou acima.
> **Ler** continua recortado por cluster do cliente.

## Esta tarefa também destrava a exclusão lógica

Cinco tabelas do módulo excluem **logicamente** — marcam `excluido = true`. Isso é um
`UPDATE`. Logo, **quem autoriza a exclusão lógica é a policy de UPDATE, não a de DELETE**:

Pela decisão de 02/09/2026, **só `cliente` e `contribuinte` continuam guardando linha
excluída**. Exclusão lógica é um `UPDATE` — logo, quem autoriza é a permissão de UPDATE, que
sai desta tarefa:

| Tabela | Exclui como | Autorizada por |
|---|---|---|
| `contribuinte` | **lógica** | `rls_contribuinte_update` ← **esta tarefa** |
| `cliente` | **lógica** (a tela ainda não usa) | `rls_cliente_update` ← **esta tarefa** |
| `representante` · `ordem_servico` · `distribuicao_receita` | passam a **física** | tarefas de conversão, abaixo |

Por isso esta tarefa e a de [soft delete de cliente e
contribuinte](TAREFA_soft-delete-cliente-e-contribuinte.md) se tocam: sem esta, aqueles dois
continuam sem poder ser excluídos por cluster errado.

As conversões para exclusão física estão em
[representante e rateio](TAREFA_representante-e-rateio-hard-delete.md) e
[ordem de serviço](TAREFA_os-hard-delete.md), e não dependem desta.

## T1 — ⚠️ MIGRAÇÃO · As quatro policies de UPDATE

O guarda `excluido = false` no `USING` **fica**: ele impede reeditar linha já excluída, e não
tem nada a ver com cluster. Sai só o `cliente_visivel_para` — e, na OS, também a cláusula do
cluster da própria OS.

> **SQL sem comentários de propósito** (o editor do Lovable corta em `;` e `--`).

```sql
DROP POLICY IF EXISTS rls_cliente_update ON public.cliente;
CREATE POLICY rls_cliente_update ON public.cliente
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_contribuinte_update ON public.contribuinte;
CREATE POLICY rls_contribuinte_update ON public.contribuinte
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

As outras quatro tabelas do módulo — `cliente_clusters`, `inscricao_contribuinte`,
`distribuicao_receita`, `os_produtos_contratados` — já alteram só por cargo. Não se mexe.

## Alterar continua limitado pela leitura, e isso é de propósito

Liberar a escrita por cargo **não** dá a ninguém o poder de alterar o que não enxerga. Um
`UPDATE` tem `WHERE`, logo precisa ler a linha antes de mudá-la — e a policy de SELECT
continua recortando por cluster. Medido em dev e registrado no corpo de
`soft_delete_distribuicao_receita`:

> *"o UPDATE só alcança linha que o SELECT deixa ver — medido em dev: um líder sem o cluster
> do cliente afeta 0 linhas, sem erro."*

**O problema não é o limite, é o silêncio:** dá zero linhas e a tela anuncia
"Cliente atualizado com sucesso!". Isso é da
[tarefa das mensagens](../sprint-12/TAREFA_mensagens-de-recusa.md).

## T2 — Conferência

Como um `lider` ou `sublider`, num cliente **do seu cluster**:

| | Esperado |
|---|---|
| Alterar dados do cliente, do contribuinte, do representante e da OS | grava, sem 42501 |
| Excluir um contribuinte | exclui — é o UPDATE desta tarefa, mas ainda depende da tarefa de excluir para não bater no 42501 da linha que some da vista |

Conferir o texto das policies:

```sql
SELECT tablename, policyname, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND policyname IN ('rls_cliente_update', 'rls_contribuinte_update',
                      'rls_representante_update', 'rls_ordem_servico_update');
```

Nenhuma linha do resultado deve conter `cliente_visivel_para` nem `resolve_user_cluster_ids`.

## Referências

- Auditoria das 24 operações (artefato, 02/09/2026).
- `src/hooks/useSaveClientTransaction.ts` — os passos de alteração e o `catch`.
