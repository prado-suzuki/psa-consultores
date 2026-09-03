# TAREFA 3 — Cliente e contribuinte: consertar o soft delete

> **Decisão da Patricia, 02/09/2026:** no módulo de cadastro de cliente, **só `cliente` e
> `contribuinte` guardam linha excluída** (soft delete). Todo o resto passa a apagar de vez.
>
> Esta tarefa cuida dos **dois que ficam**. Os que mudam de lado estão em
> [representante e rateio](TAREFA_representante-e-rateio-hard-delete.md) e
> [ordem de serviço](TAREFA_os-hard-delete.md).
>
> **Depende de [alterar por cargo](TAREFA_alterar-por-cargo.md):** soft delete é um `UPDATE`,
> então quem autoriza é a permissão de alterar.

## O problema

Excluir logicamente grava `excluido = true`. As permissões de **leitura** dessas duas tabelas
exigem `excluido = false`. A linha nova sai da vista de quem está gravando **no meio da própria
gravação**, e o banco recusa o comando inteiro com 42501.

Não é questão de cluster: **recusa todo mundo que não é admin**, mesmo no cluster certo.

Medido nesta casa, em transação com rollback (líder Ricardo Migueis, 20/08/2026), em
[`20260820132950_soft_delete_os_e_rateio_security_definer.sql`](../../../supabase/migrations/20260820132950_soft_delete_os_e_rateio_security_definer.sql):

```
update ordem_servico set excluido = true            -> 42501
idem, sem cláusula RETURNING                        -> 42501
```

Falhar **sem** `RETURNING` é o que descarta a correção barata de tirar o `.select()` do front:
não é o retorno que dispara, é o `WHERE`. Aquela migração corrigiu OS e rateio por função
`SECURITY DEFINER` e deixou escrito: *"`cliente`, `contribuinte`, `representante`,
`correcoes_icms` e `documento_arquivo` têm o mesmo defeito e ficam para outra tarefa."*

Com a decisão de 02/09, `representante` sai da lista por outro caminho — vira hard delete.
Restam **`cliente` e `contribuinte`**, e são estes dois.

## Quanto disso a tela usa hoje

| | |
|---|---|
| `contribuinte` | a aba Contribuintes exclui logicamente a cada remoção de linha — **é o caminho quente** |
| `cliente` | o cadastro **nunca** exclui cliente logicamente. A coluna existe e nenhuma tela a usa |

Então a função de `cliente` é preventiva: entra para a regra ficar completa e para a próxima
tela que precisar não repetir o defeito. Se preferir enxugar, dá para entregar só a de
`contribuinte` — mas aí o `cliente` fica com uma armadilha documentada e sem dono.

## T1 — ⚠️ MIGRAÇÃO · Função de exclusão lógica para os dois

Espelha `soft_delete_ordem_servico`, que já está em produção e é o padrão da casa.

### Pré-requisitos, conferidos em produção em 02/09/2026

- `cliente` e `contribuinte` são de `postgres` e **não** têm FORCE ROW LEVEL SECURITY, então a
  função `SECURITY DEFINER` escapa da permissão.
- Triggers: `contribuinte` só tem `update_contribuinte_updated_at`. `cliente` tem esse e o
  `trg_cliente_tem_cluster`, que é `DEFERRABLE INITIALLY DEFERRED` e checa vínculo de cluster —
  não é afetado por marcar `excluido`.
- `updated_at` não entra no `UPDATE`: o trigger `BEFORE UPDATE` já resolve.
- Chaves primárias: `cliente.id` e `contribuinte.id`.

### SQL

> Sem comentários `--` de propósito: o editor SQL do Lovable corta o statement em `;` e `--`.
> Acentos fora das mensagens de exceção pelo mesmo motivo.

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
```

A de `cliente` é a mesma, trocando `contribuinte ct` por `cliente cl`, `ct.id` por `cl.id` e as
duas mensagens para "Cliente nao encontrado" e "Sem permissao para excluir % de % cliente(s)".

> **Ordem:** depois da [tarefa de alterar](TAREFA_alterar-por-cargo.md). A autorização de dentro
> da função espelha a permissão de alterar; aplicada antes, ficaria mais frouxa que ela.

## T2 — Front usa a função nova

Em `src/hooks/useSaveClientTransaction.ts`:

1. `contribuinte/soft-delete` passa de `softDeleteVerificado` para `softDeleteViaRpc`, com
   `soft_delete_contribuinte`.
2. Ampliar o tipo do parâmetro `rpc` de `softDeleteViaRpc`.
3. Depois que [representante virar hard delete](TAREFA_representante-e-rateio-hard-delete.md),
   `softDeleteVerificado` fica sem nenhum uso — **remover a função e o comentário** que
   documenta a pendência, que passa a estar errado.

## T3 — Conferência

Como um `lider` ou `sublider`, num cliente do seu cluster: remover um contribuinte da aba e
salvar. Tem que excluir, sem 42501. Depois, conferir que a linha sumiu da tela e continua no
banco com `excluido = true`.

## O que fica de fora

`correcoes_icms` e `documento_arquivo` seguem com o mesmo defeito — dos cinco listados na
migração de 20/08, continuam pendentes e não pertencem a este módulo.
