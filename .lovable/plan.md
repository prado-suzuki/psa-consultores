

# Substituicao de Endpoints - Calculadora IBS/CBS

## Mapeamento: Endpoints Atuais vs Novos

| # | Arquivo | Endpoint Atual (DIFAL) | Endpoint Novo (IBS/CBS) | Linha |
|---|---------|----------------------|------------------------|-------|
| 1 | `IbsCbsAuditModal.tsx` | `POST /api/v1/ncm/regras` | `POST /api/v1/ibs-cbs/regras` | 61 |
| 2 | `CalculadoraIbsCbs.tsx` | `POST /api/v1/classificacoes/buscar` | `POST /api/v1/ibs-cbs/classificacoes/buscar` | 329 |
| 3 | `CalculadoraIbsCbs.tsx` | `POST /api/v1/classificacoes/sync` | `POST /api/v1/ibs-cbs/classificacoes/sync` | 575 |
| 4 | `CalculadoraIbsCbs.tsx` | `POST /api/v1/ncm/calculo-difal/exportar/{id}` | `POST /api/v1/ibs-cbs/calculo-ibs-cbs/exportar/{id}` | 488 |

O endpoint de listagem de itens agrupados (linha 254) permanece inalterado pois busca dados de NFes do contribuinte, que e compartilhado entre DIFAL e IBS/CBS:
- `GET /api/v1/query/contribuintes/{id}/nfes/agrupado-item` -- sem alteracao

## Alteracoes por arquivo

### 1. `src/components/equipe/dev/IbsCbsAuditModal.tsx`

Linha 61 - Buscar regras NCM para classificacao no modal:
```
DE:  /api/v1/ncm/regras
PARA: /api/v1/ibs-cbs/regras
```

### 2. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx`

Linha 329 - Buscar classificacoes existentes dos itens:
```
DE:  /api/v1/classificacoes/buscar
PARA: /api/v1/ibs-cbs/classificacoes/buscar
```

Linha 488 - Exportar calculo para Excel:
```
DE:  /api/v1/ncm/calculo-difal/exportar/{contribuinte_id}
PARA: /api/v1/ibs-cbs/calculo-ibs-cbs/exportar/{contribuinte_id}
```

Linha 575 - Sincronizar decisoes de classificacao:
```
DE:  /api/v1/classificacoes/sync
PARA: /api/v1/ibs-cbs/classificacoes/sync
```

## Resumo

- **4 endpoints** a substituir em **2 arquivos**
- **1 endpoint** compartilhado que permanece igual (agrupado-item)
- Nenhuma alteracao de tipos, banco de dados ou logica -- apenas URLs
- Os arquivos do DIFAL (`AuditoriaFiscal.tsx` e `DifalAuditModal.tsx`) permanecem inalterados

