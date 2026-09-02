# TAREFA 3 de 4 — Excluir no cadastro de cliente passa a ser por cargo

> **Uma das quatro tarefas** que aplicam a regra decidida em 02/09/2026 no módulo de cadastro
> de cliente. As outras: [registrar](TAREFA_registrar-por-cargo.md) ·
> [alterar](TAREFA_alterar-por-cargo.md) · [mensagens](TAREFA_mensagens-de-recusa.md).
>
> **Depende da [tarefa de alterar](TAREFA_alterar-por-cargo.md).** Nas cinco tabelas de
> exclusão lógica quem autoriza é a policy de UPDATE, que sai de lá. Aplicar aquela primeiro.
>
> **Relacionada:** [cascata da OS](TAREFA_exclusao-em-cascata-da-os.md) — o que acontece com
> rateio e produtos quando a OS sai. Independente desta; pode ir antes ou depois.

## Excluir é duas coisas diferentes neste módulo

| Tabela | Como exclui | Quem autoriza de fato |
|---|---|---|
| `cliente` | **física** (só o desfazer automático do salvamento) | `rls_cliente_delete` → T1 |
| `cliente_clusters` | **física** | policy `ALL` — já só cargo, não se mexe |
| `inscricao_contribuinte` | **física** | policy de DELETE — já só cargo, não se mexe |
| `os_produtos_contratados` | **física** | policy de DELETE — já só cargo, não se mexe |
| `contribuinte` | **lógica** | UPDATE (tarefa 2) **+ função nova** → T3 |
| `representante` | **lógica** | UPDATE (tarefa 2) **+ função nova** → T3 |
| `ordem_servico` | **lógica**, por função SECURITY DEFINER | a checagem **dentro da função** → T2 |
| `distribuicao_receita` | **lógica**, por função SECURITY DEFINER | a checagem **dentro da função** → T2 |

As policies de DELETE de contribuinte, representante e OS quase não são exercidas pelo
cadastro (ele exclui logicamente), mas entram em T1 mesmo assim — deixá-las mais restritas
que o UPDATE ao lado é a incoerência que produziu este bug em primeiro lugar.

---

## T1 — ⚠️ MIGRAÇÃO · As quatro policies de DELETE

```sql
DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

**O que T1 resolve sozinha:** o **desfazer** do salvamento volta a funcionar. Hoje ele apaga o
cliente recém-criado, esbarra no cluster, atinge 0 linhas e **não devolve erro** — a tela
acredita que desfez. É a causa dos nove clientes "Frigobom" órfãos em produção. Com T1, uma
falha no meio do salvamento volta a ser tudo-ou-nada: o `DELETE` do cliente passa e a cascata
leva contribuinte, OS, rateio e produtos junto.

---

## T2 — ⚠️ MIGRAÇÃO · As duas funções de exclusão que já existem

`soft_delete_ordem_servico` e `soft_delete_distribuicao_receita` rodam como donas da tabela,
então **policy nenhuma se aplica a elas**: a autorização é o `SELECT count(*) INTO
v_autorizadas` de dentro do corpo — e lá está `cliente_visivel_para` cravado.

Sem T2, excluir OS e excluir rateio continuam exigindo cluster mesmo depois de T1 e da tarefa
2. A própria função avisa: *"Manter idêntica ao texto das policies — se elas mudarem, isto
muda junto."*

Reemitir as duas trocando **apenas** o bloco de autorização, mantendo contagem, tudo-ou-nada,
mensagens e `GET DIAGNOSTICS` como estão:

`soft_delete_ordem_servico` → no bloco `v_autorizadas`:
```sql
       has_role(v_uid, 'admin'::app_role)
       OR (
         os.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
```

`soft_delete_distribuicao_receita` → no bloco `v_autorizadas`:
```sql
       has_role(v_uid, 'admin'::app_role)
       OR (
         dr.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
```

> Ao reemitir, **remover os comentários `--` do corpo** se a aplicação for pelo editor SQL do
> Lovable. E **não** reintroduzir `SET updated_at = now()` em
> `soft_delete_distribuicao_receita`: a tabela não tem essa coluna.

---

## T3 — ⚠️ MIGRAÇÃO · Duas funções novas, para contribuinte e representante

### Por que a policy não basta

A exclusão lógica grava `excluido = true`. As policies de SELECT dessas tabelas exigem
`excluido = false` — **a linha nova sai da vista de quem está gravando, no meio da própria
gravação**, e o banco recusa o comando inteiro com 42501. Tirar o cluster não muda isso.

Medido nesta casa, em transação com rollback (líder Ricardo Migueis, 20/08/2026), registrado
em [`20260820132950_soft_delete_os_e_rateio_security_definer.sql`](../../../supabase/migrations/20260820132950_soft_delete_os_e_rateio_security_definer.sql):

```
update ordem_servico set excluido = true            -> 42501
idem, sem cláusula RETURNING                        -> 42501
```

Falhar **sem** `RETURNING` descarta a correção barata de tirar o `.select()` do front: não é o
retorno que dispara, é o `WHERE`. E o cabeçalho daquela migração diz: *"Só estas duas tabelas.
`cliente`, `contribuinte`, `representante`, `correcoes_icms` e `documento_arquivo` têm o mesmo
defeito e ficam para outra tarefa."* Esta é a outra tarefa, para duas das cinco.

### Pré-requisitos, conferidos em produção em 02/09/2026

- `contribuinte` e `representante` são de `postgres` e **não** têm FORCE ROW LEVEL SECURITY,
  então a função SECURITY DEFINER escapa da policy.
- Triggers: `contribuinte` só tem `update_contribuinte_updated_at`. `representante` tem esse e
  `trg_representante_block_disable_acesso_chamados`, que dispara **apenas** quando
  `acesso_chamados` muda — a exclusão não toca nessa coluna.
- `updated_at` não entra no `UPDATE`: o trigger `BEFORE UPDATE` já resolve.
- Chaves primárias: `contribuinte.id` e `representante.id_representante`.

### SQL

```sql
CREATE OR REPLACE FUNCTION public.soft_delete_contribuinte(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM contribuinte ct
   WHERE ct.id = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM contribuinte ct
   WHERE ct.id = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         ct.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Contribuinte nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % contribuinte(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE contribuinte ct
     SET excluido = true
   WHERE ct.id = ANY (_ids)
     AND ct.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_contribuinte(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_contribuinte(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_representante(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_total       integer;
  v_existentes  integer;
  v_autorizadas integer;
  v_marcadas    integer;
BEGIN
  SELECT count(DISTINCT u) INTO v_total
    FROM unnest(coalesce(_ids, '{}'::uuid[])) u
   WHERE u IS NOT NULL;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessao sem usuario autenticado.'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_existentes
    FROM representante rp
   WHERE rp.id_representante = ANY (_ids);

  SELECT count(*) INTO v_autorizadas
    FROM representante rp
   WHERE rp.id_representante = ANY (_ids)
     AND (
       has_role(v_uid, 'admin'::app_role)
       OR (
         rp.excluido = false
         AND has_role_or_higher(v_uid, 'sublider'::app_role)
       )
     );

  IF v_existentes < v_total THEN
    RAISE EXCEPTION 'Representante nao encontrado: % de % id(s) enviados nao existem.',
      v_total - v_existentes, v_total
      USING ERRCODE = 'P0002';
  END IF;

  IF v_autorizadas < v_total THEN
    RAISE EXCEPTION 'Sem permissao para excluir % de % representante(s).',
      v_total - v_autorizadas, v_total
      USING ERRCODE = '42501';
  END IF;

  UPDATE representante rp
     SET excluido = true
   WHERE rp.id_representante = ANY (_ids)
     AND rp.excluido = false;

  GET DIAGNOSTICS v_marcadas = ROW_COUNT;
  RETURN v_marcadas;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_representante(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_representante(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_representante(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_representante(uuid[]) TO service_role;
```

> **Acentos retirados das mensagens de exceção de propósito**, pelo mesmo motivo do SQL sem
> comentários: menos pontuação para o editor do Lovable errar. Aplicando por arquivo de
> migração, pode-se restaurar a acentuação.

> **Ordem:** tarefa 2 (alterar) → T1 → T2 → T3. A autorização das funções espelha as policies
> novas; aplicadas antes, ficariam mais frouxas que elas por alguns minutos.

---

## T4 — Front passa a usar as funções novas

Em `src/hooks/useSaveClientTransaction.ts`:

1. Trocar as duas chamadas de `softDeleteVerificado` por `softDeleteViaRpc`:
   - `contribuinte/soft-delete` → `soft_delete_contribuinte`
   - `representante/soft-delete` → `soft_delete_representante`
2. Ampliar o tipo do parâmetro `rpc` de `softDeleteViaRpc` para as quatro funções.
3. **Remover `softDeleteVerificado`** e o comentário que documenta a pendência — depois de T3
   ela não tem mais uso, e o comentário passa a estar errado.
4. Atualizar o cabeçalho de `softDeleteViaRpc`: ele afirma que só OS e rateio têm o defeito e
   que as funções são duas. Passam a ser quatro.

## T5 — Conferência

Como um `lider` ou `sublider`, num cliente **do seu cluster**:

| | Esperado |
|---|---|
| Excluir um contribuinte | exclui, sem 42501 |
| Excluir um representante | exclui, sem 42501 |
| Excluir uma OS e uma linha de rateio | exclui, sem 42501 (confere T2) |
| Forçar falha no meio do salvamento | nada persiste, nenhum cliente órfão fica (confere T1) |

```sql
SELECT tablename, policyname, cmd, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND cmd = 'DELETE'
   AND policyname LIKE 'rls_%'
   AND tablename IN ('cliente', 'contribuinte', 'representante', 'ordem_servico');
```

Nenhuma linha deve conter `cliente_visivel_para` nem `resolve_user_cluster_ids`.

## O que fica de fora

- **`cliente`, `correcoes_icms` e `documento_arquivo`** seguem com o defeito de exclusão
  lógica (dos cinco listados na migração de 20/08, três continuam pendentes). No cadastro isso
  não aparece — ele nunca exclui cliente logicamente.
- **As seis operações que recusam sem mensagem** — [tarefa das mensagens](TAREFA_mensagens-de-recusa.md).
- **Exclusão lógica × física** como decisão de modelo: discutida em 02/09 e não fechada. O
  resumo do que foi medido está em
  [cascata da OS](TAREFA_exclusao-em-cascata-da-os.md#decisão-ainda-em-aberto--exclusão-lógica--física).
