# TAREFA 4 — Representante e rateio passam a excluir de vez

> **Decisão da Patricia, 02/09/2026:** só `cliente` e `contribuinte` guardam linha excluída.
> Todo o resto apaga de verdade.
>
> Esta tarefa converte **as duas tabelas fáceis**. A ordem de serviço tem bloqueio próprio e
> está em [tarefa separada](TAREFA_os-hard-delete.md); `cliente_clusters`,
> `inscricao_contribuinte` e `os_produtos_contratados` **já apagam de verdade** e não entram.

## Por que estas duas são fáceis

Conferido no schema de produção em 02/09/2026: **nenhuma chave estrangeira aponta para
`representante` nem para `distribuicao_receita`**. Apagar uma linha delas não derruba nada e
não é barrado por nada. É o oposto da ordem de serviço, que tem 70 OS presas por projeto.

O que se perde, e é o preço da decisão:

| | Hoje guardadas | O que some do histórico |
|---|---|---|
| `representante` | 9 de 81 linhas com `excluido = true` | quem já foi representante do cliente e quem teve acesso ao portal |
| `distribuicao_receita` | 189 linhas de 401 | como a receita da OS já foi repartida entre centros de custo |

O rastro que sobra é o `audit_logs`, que registra o **ato** de excluir, não os valores.

> **Contagens conferidas em produção por SELECT em 02/09/2026.** Elas andam: a primeira medição
> desta tarefa dizia 187 linhas de rateio e 196 no total, e dois dias de uso já mudaram os dois
> números. Antes de executar a fase 2, medir de novo — é ela que apaga.

## A entrega vai em duas fases, e a segunda é opcional

**Fase 1 — muda o comportamento, sem apagar nada.** A tela passa a apagar de verdade daqui
para frente. A coluna `excluido` continua existindo e as 198 linhas já marcadas continuam onde
estão, invisíveis como sempre foram. **Totalmente reversível.**

**Fase 2 — limpa e simplifica.** Apaga as 196 linhas já marcadas e derruba a coluna. Depois
disso não tem volta. Fica para quando a fase 1 estiver rodando tranquila.

Fazer as duas de uma vez é possível, mas junta uma mudança reversível com uma irreversível na
mesma janela. Não recomendo.

---

## T1 — ⚠️ MIGRAÇÃO · Fase 1: permissões de apagar

As permissões de `DELETE` das duas já existem e já são só por cargo — o que falta é tirar o
guarda `excluido = false` do `USING`, que hoje impede apagar linha que já esteja marcada.

> Sem comentários `--` de propósito: o editor SQL do Lovable corta em `;` e `--`.

```sql
DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_distribuicao_receita_delete ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

## T2 — Front apaga em vez de marcar

Em `src/hooks/useSaveClientTransaction.ts`:

1. **Representante** — o passo `representante/soft-delete` deixa de chamar
   `softDeleteVerificado` e passa a `.delete().in(partIdField, removedPartIds)`, conferindo
   quantas linhas saíram (o padrão que a tarefa das mensagens já instalou: zero linhas nunca é
   sucesso).
2. **Rateio** — os dois pontos que chamam `soft_delete_distribuicao_receita` passam a
   `.delete().in("id", ids)`, com a mesma conferência. São o rateio removido da OS e o
   `distribuicao_receita/soft-delete-orfas`.
3. As leituras dessas duas tabelas param de precisar de `.eq('excluido', false)` — são
   **3 filtros** no código (2 em representante, 1 em rateio). Deixá-los não quebra nada na fase
   1; na fase 2 eles quebram, então é melhor sair agora.
4. `soft_delete_distribuicao_receita` fica sem chamador. **Não derrubar ainda** — a
   [tarefa da OS](TAREFA_os-hard-delete.md) confirma que ninguém mais usa antes de remover.

## T3 — ⚠️ MIGRAÇÃO · Fase 2 (opcional, depois): limpar e simplificar

> **Irreversível.** Só depois da fase 1 rodando, e com a Patricia confirmando o descarte das
> 196 linhas.

```sql
DELETE FROM public.representante WHERE excluido = true;
DELETE FROM public.distribuicao_receita WHERE excluido = true;

ALTER TABLE public.representante DROP COLUMN excluido;
ALTER TABLE public.distribuicao_receita DROP COLUMN excluido;
```

Antes de rodar, refazer a contagem: hoje são **9** e **187**. Se vier bem diferente, parar e
entender por quê.

Depois da coluna cair, é preciso reemitir as permissões que ainda a citam — `SELECT`, `UPDATE`
e `DELETE` das duas tabelas — senão elas quebram. E conferir as duas views que mencionam
`excluido` junto dessas tabelas (`cliente_setor_regiao_atual` e `org_comments_feed`).

## T4 — Conferência

| | Esperado |
|---|---|
| Remover um representante e salvar | some da tela **e** do banco |
| Remover uma linha de rateio e salvar | idem |
| Excluir uma OS que tenha rateio | o rateio sai junto, por cascata da chave estrangeira |

```sql
SELECT count(*) AS representantes_marcados FROM public.representante WHERE excluido = true;
SELECT count(*) AS rateios_marcados FROM public.distribuicao_receita WHERE excluido = true;
```

Na fase 1 os números ficam parados em 9 e 187 (nada novo é marcado). Na fase 2, zeram.
