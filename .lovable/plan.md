# Reset dos dados de teste do Controle PERDCOMP

## Objetivo

Apagar **todos os registros** (hard delete, sem usar `excluido`) das tabelas do módulo PERDCOMP, mantendo a estrutura intacta.

## Tabelas afetadas

- `distribuicao_dcomp` (filha de `dcomp`)
- `dcomp` (filha de `per`)
- `per_situacao` (filha de `per`)
- `per` (raiz)

## Ordem de execução

Para respeitar as FKs, deletar de baixo para cima:

```text
1. DELETE FROM distribuicao_dcomp;
2. DELETE FROM dcomp;
3. DELETE FROM per_situacao;
4. DELETE FROM per;
```

Tudo executado em uma única transação via tool `supabase--insert`. Sem `TRUNCATE`, sem desabilitar constraints — a ordem acima é suficiente.

## Validação pós-execução

```sql
SELECT
  (SELECT count(*) FROM per) AS per,
  (SELECT count(*) FROM per_situacao) AS per_situacao,
  (SELECT count(*) FROM dcomp) AS dcomp,
  (SELECT count(*) FROM distribuicao_dcomp) AS distribuicao_dcomp;
```

Todos devem retornar `0`.

## Observações

- Operação **irreversível** — não há soft delete envolvido.
- Não afeta `grupo_tributo` nem `codigo_receita` (catálogo RFB permanece).
- Apaga dados de **todos os ambientes** (dev e prod), pois o `DELETE` não filtra por `ambiente`. Se quiser limitar a um ambiente, me avise antes de aprovar.
