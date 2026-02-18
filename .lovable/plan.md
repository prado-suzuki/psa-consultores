

# Correcao dos 3 erros na Calculadora IBS/CBS

## Erro 1: Sync retornando 422 (Critico)

**Causa**: O endpoint `/api/v1/ibs-cbs/classificacoes/sync` espera os campos `cod_produto_svc` e `cod_ncm_nbs` no payload (mesmo padrao do endpoint `buscar`), mas o frontend envia apenas `cod_produto` e `cod_ncm`.

**Correcoes necessarias**:

### Arquivo: `src/types/ibscbs.ts` (linhas 97-103)

Adicionar os campos obrigatorios na interface `IbsCbsSyncDecisao`:

```
DE:
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
  decisao: IbsCbsTipoDecisao;
  id_icms_st: string | null;

PARA:
  id_contribuinte: string;
  cod_produto: string;
  cod_ncm: string;
  cod_produto_svc: string;
  cod_ncm_nbs: string;
  decisao: IbsCbsTipoDecisao;
  id_icms_st: string | null;
```

### Arquivo: `src/pages/equipe/dev/CalculadoraIbsCbs.tsx` (linhas 561-567)

Incluir os campos no payload de sync:

```
DE:
  id_contribuinte: item.id_contribuinte,
  cod_produto: item.cod_produto,
  cod_ncm: d.cod_ncm,
  decisao: d.decisao as IbsCbsTipoDecisao,
  id_icms_st: d.id_icms_st_bq,

PARA:
  id_contribuinte: item.id_contribuinte,
  cod_produto: item.cod_produto,
  cod_ncm: d.cod_ncm,
  cod_produto_svc: item.cod_produto,
  cod_ncm_nbs: d.cod_ncm,
  decisao: d.decisao as IbsCbsTipoDecisao,
  id_icms_st: d.id_icms_st_bq,
```

---

## Erro 2: Page permissions retornando 406

**Causa**: O hook `usePageAccess` usa `.single()` para buscar a pagina na tabela `page_permissions`. Quando a pagina nao esta cadastrada (0 resultados), o PostgREST retorna 406 porque `.single()` exige exatamente 1 resultado. Deveria usar `.maybeSingle()` que aceita 0 ou 1 resultado.

### Arquivo: `src/hooks/usePageAccess.ts` (linha 26)

```
DE:  .single();
PARA: .maybeSingle();
```

A logica ja trata `page` nulo como acesso livre (linha 28), entao nenhuma outra alteracao e necessaria.

---

## Erro 3: Conexao com api.lovable.dev

Este e um problema de infraestrutura da plataforma Lovable, nao do codigo da aplicacao. Nao requer correcao.

---

## Resumo

| # | Arquivo | Alteracao |
|---|---------|-----------|
| 1 | `ibscbs.ts` | Adicionar `cod_produto_svc` e `cod_ncm_nbs` na interface |
| 2 | `CalculadoraIbsCbs.tsx` | Adicionar campos no payload do sync |
| 3 | `usePageAccess.ts` | Trocar `.single()` por `.maybeSingle()` |

3 arquivos, alteracoes minimas e pontuais.

