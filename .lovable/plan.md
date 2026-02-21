## Migrar endpoint de itens agrupados para o novo `/api/v1/ibs-cbs/`

### Resumo

O endpoint de listagem de itens agrupados foi movido para uma rota dedicada ao IBS/CBS. Precisamos atualizar a URL, os parametros de query, os tipos TypeScript e a logica de mapeamento para refletir a nova resposta simplificada.

---

### Mudancas no endpoint


| Aspecto                         | Antes                                                 | Depois                                    |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| URL                             | `/api/v1/query/contribuintes/{id}/nfes/agrupado-item` | `/api/v1/ibs-cbs/{id}/nfes/agrupado-item` |
| Query param `tipo_analise`      | `ibs_cbs` (obrigatorio)                               | Removido                                  |
| Query param `tipo_mov`          | `Saida` (com acento: `Saída`)                         | `Saida` (sem acento)                      |
| Query param `page_size` default | 25                                                    | 25                                        |
| Query params de filtro `valid`  | `true`/`false`                                        | Não existe mais                           |


### Campos removidos da resposta

Os seguintes campos nao sao mais retornados pelo novo endpoint e serao removidos dos tipos e da UI:

- `CFOP`
- `CST`
- `aliq_prod`
- `pRedBC`

### Campo adicionado

- `is_valid` (number: 0 ou 1) -- indica se o item ja foi validado
- `redBC` (float) -- percentual de redução da aliquota de IBS CBS

### Campo alterado

- `cProd` agora e retornado como `number` (antes era `string`)

---

### Arquivos a editar

#### 1. `src/types/ibscbs.ts`

- Remover campos `CFOP`, `CST`, `aliq_prod`, `pRedBC` de `IbsCbsApiGroupedItem`
- Adicionar campo `is_valid: number`
- Alterar tipo de `cProd` para `number`
- Remover campos `cfop`, `cst_icms`, `aliq_icms`, `pRedBC` de `IbsCbsGroupedItem`

#### 2. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx`

- Alterar URL da query de itens agrupados (linha ~255) para o novo endpoint
- Remover `&tipo_analise=ibs_cbs` da URL
- Alterar `tipo_mov=Saída` para `tipo_mov=Saida`
- Alterar `ITEMS_PER_PAGE` de 25 para 100
- Atualizar o mapeamento de `IbsCbsApiGroupedItem` para `IbsCbsGroupedItem` (remover campos inexistentes)
- Usar `is_valid` da resposta para determinar status (`validado`/`pendente`) em vez de depender apenas das classificacoes
- Remover colunas CFOP, CST ICMS, Aliquota e Red BC da tabela na UI (se exibidas)

#### 3. `src/components/equipe/dev/IbsCbsAuditModal.tsx`

- Remover exibicao dos campos `cfop`, `cst_icms`, `aliq_icms`, `pRedBC` no painel lateral de "Dados do Produto"
- Remover a secao "Tributacao" que mostra CST ICMS, Aliquota e Red BC

---

### Detalhes tecnicos

**Nova URL construida:**

```typescript
const url = `${API_BASE_URL}/api/v1/ibs-cbs/${selectedContribuinte}/nfes/agrupado-item?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo_mov=Saida&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`;
```

**Novo mapeamento de item:**

```typescript
(item: IbsCbsApiGroupedItem): IbsCbsGroupedItem => ({
  groupKey: `${item.xProd}|${item.cProd}|${item.NCM}`,
  xProd: item.xProd,
  cod_produto: String(item.cProd),
  cod_ncm: item.NCM,
  id_contribuinte: selectedContribuinte,
  count: item.tot_itens,
  totalValue: item.vlr_total,
  nfesCount: item.tot_nfes,
  redBC: item.redBC,
  status: item.is_valid === 1 ? "validado" : "pendente",
  classificacao: null,
})
```

`**IbsCbsApiGroupedItem` atualizado:**

```typescript
export interface IbsCbsApiGroupedItem {
  cProd: number;
  xProd: string;
  NCM: string;
  tot_itens: number;
  tot_nfes: number;
  vlr_total: number;
  redBC: number | null;
  is_valid: number;
}
```

`**IbsCbsGroupedItem` atualizado:**

```typescript
export interface IbsCbsGroupedItem {
  groupKey: string;
  xProd: string;
  cod_produto: string;
  cod_ncm: string;
  id_contribuinte: string;
  count: number;
  totalValue: number;
  nfesCount: number;
  redBC: number | null;
  status: 'validado' | 'pendente';
  classificacao?: IbsCbsClassificacaoExistente | null;
}
```