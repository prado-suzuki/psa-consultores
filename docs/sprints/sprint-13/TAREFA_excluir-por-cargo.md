# TAREFA 2 — Apagar cliente e contribuinte por cargo

> **Escopo reduzido em 02/09/2026.** Esta tarefa cuidava das oito tabelas. Com a decisão de
> deixar só `cliente` e `contribuinte` com exclusão lógica, as outras três conversões ganharam
> tarefa própria e levaram as permissões de apagar delas junto:
> [representante e rateio](TAREFA_representante-e-rateio-hard-delete.md) ·
> [ordem de serviço](TAREFA_os-hard-delete.md).
>
> Restaram aqui as permissões de **apagar de verdade** `cliente` e `contribuinte` — que
> continuam existindo mesmo nas duas tabelas de exclusão lógica, e num caso são exercidas.

## Por que ainda importa, se estas duas excluem logicamente

**O desfazer do salvamento apaga cliente de verdade.** Quando um passo do cadastro falha, a
tela chama `.delete()` no cliente recém-criado, e a cascata leva contribuinte, OS, rateio e
produtos. Hoje esse apagar exige `cliente_visivel_para` — atinge **zero linhas, sem devolver
erro**, e a tela acredita que desfez.

É a causa dos **nove clientes "Frigobom — João Bombonatto"** órfãos em produção, criados em
01/09 entre 18h39 e 20h59, todos no cluster OSG, todos sem nenhum contribuinte.

A de `contribuinte` não é exercida pelo cadastro — entra para não ficar mais restrita que o
`UPDATE` ao lado, que é a incoerência que produziu este bug em primeiro lugar.

## T1 — ⚠️ MIGRAÇÃO · As duas permissões de apagar

> Sem comentários `--` de propósito: o editor SQL do Lovable corta em `;` e `--`.

```sql
DROP POLICY IF EXISTS rls_cliente_delete ON public.cliente;
CREATE POLICY rls_cliente_delete ON public.cliente
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_contribuinte_delete ON public.contribuinte;
CREATE POLICY rls_contribuinte_delete ON public.contribuinte
  FOR DELETE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

O guarda `excluido = false` **fica** nestas duas: elas guardam linha excluída, e apagar de vez
o que já foi excluído logicamente não é operação que o cadastro deva oferecer.

## T2 — Conferência

Forçar uma falha no meio do salvamento de um cliente novo — o jeito mais simples é lançar o
mesmo produto duas vezes na mesma OS, que o banco recusa no último passo. Esperado: **nada
persiste**, e nenhum cliente órfão fica.

```sql
SELECT c.id, c.nome, c.created_at
  FROM public.cliente c
 WHERE c.excluido = false
   AND NOT EXISTS (SELECT 1 FROM public.contribuinte ct WHERE ct.cliente_id = c.id)
 ORDER BY c.created_at DESC;
```

A consulta não pode ganhar linha nova depois do teste.

## O que fica de fora

**Os nove órfãos que já existem.** Esta tarefa impede novos; não limpa os antigos. A Patricia
decide o destino deles — apagar, ou marcar como excluídos.

## Referências

- Auditoria das 32 operações (artefato, 02/09/2026).
- `src/hooks/useSaveClientTransaction.ts` — o desfazer, no `catch` do salvamento.
