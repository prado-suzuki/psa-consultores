

# Correcao dos payloads para endpoints IBS/CBS

## Problema

Os endpoints IBS/CBS esperam campos com nomes diferentes dos endpoints DIFAL. Os erros 422 mostram exatamente quais campos estao faltando.

## Correcoes

### 1. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx` (linha 321-327)

O endpoint `/api/v1/ibs-cbs/classificacoes/buscar` exige `cod_produto_svc` e `cod_ncm_nbs` como campos obrigatorios (ao inves de `cod_produto` e `cod_ncm` do DIFAL).

```
DE:
  itens: groupedItemsFromApi.map((item) => ({
    id_contribuinte: item.id_contribuinte,
    cod_produto: item.cod_produto,
    cod_ncm: item.cod_ncm,
  }))

PARA:
  itens: groupedItemsFromApi.map((item) => ({
    id_contribuinte: item.id_contribuinte,
    cod_produto: item.cod_produto,
    cod_ncm: item.cod_ncm,
    cod_produto_svc: item.cod_produto,
    cod_ncm_nbs: item.cod_ncm,
  }))
```

Como os dados vem de NFes de mercadorias, `cod_produto_svc` recebe o mesmo valor de `cod_produto` e `cod_ncm_nbs` o mesmo de `cod_ncm`. Quando houver servicos, esses campos terao valores distintos.

### 2. `src/components/equipe/dev/IbsCbsAuditModal.tsx` (linha 64-66)

O endpoint `/api/v1/ibs-cbs/regras` espera `codigos` ao inves de `ncms`.

```
DE:  { ncms: [group.cod_ncm], uf: ufDestino }
PARA: { codigos: [group.cod_ncm], uf: ufDestino }
```

## Resumo

- 2 arquivos alterados
- Apenas ajuste de nomes de campos nos payloads
- Sem alteracao de logica ou UI

