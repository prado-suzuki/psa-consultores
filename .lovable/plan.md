

# Correcao do erro 422 no sync IBS/CBS

## Problema

O endpoint `/api/v1/ibs-cbs/classificacoes/sync` retorna 422 com a mensagem:

```
"type": "missing", "loc": ["body","decisoes",0,"id_regra"], "msg": "Field required"
```

O servidor espera o campo **`id_regra`** mas o frontend envia **`id_icms_st`**.

## Causa raiz

O endpoint IBS/CBS foi criado com base no DIFAL, mas renomeou `id_icms_st` para `id_regra`. O frontend ainda usa o nome antigo.

## Correcao

### 1. `src/types/ibscbs.ts` - Atualizar a interface

Renomear `id_icms_st` para `id_regra` na interface `IbsCbsSyncDecisao`:

```
DE:   id_icms_st: string | null;
PARA: id_regra: string | null;
```

### 2. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx` (~linha 568)

Alterar o campo no payload:

```
DE:   id_icms_st: d.id_icms_st_bq,
PARA: id_regra: d.id_icms_st_bq,
```

## Resumo

- 2 arquivos, 1 linha em cada
- O valor continua vindo de `d.id_icms_st_bq` (coluna da tabela `difal_decisao`), apenas o nome do campo no payload muda para `id_regra`

