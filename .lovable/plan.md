

## Plan: Atualizar tipos e consumidores para nova estrutura da API `/revisao/notas-itens`

### Mudança na API

Antes: `itens_efd` era um array flat de `ItemEfd` (com `nfe_itens` inline).
Agora: `itens_efd` é um array de objetos com chaves `c170`, `0200` e `nfe_itens` separadas.

### Arquivo 1: `src/types/correcoesSped.ts`

**Adicionar** interface `Item0200` com os campos do registro 0200 (COD_ITEM, DESCR_ITEM, COD_NCM, TIPO_ITEM, etc.).

**Adicionar** interface `ItemEfdEntry` (wrapper do novo formato):
```typescript
interface ItemEfdEntry {
  c170: ItemEfd;
  "0200": Item0200 | null;
  nfe_itens: NfeItem[];
}
```

**Mover** `nfe_itens` de `ItemEfd` para `ItemEfdEntry` (remover de `ItemEfd`).

**Atualizar** `NotaRevisao.itens_efd` de `ItemEfd[]` para `ItemEfdEntry[]`.

**Atualizar** `FlatItemEfd` para estender de `ItemEfd` e incluir campos do 0200:
```typescript
interface FlatItemEfd extends ItemEfd {
  chv_nfe: string;
  dt_doc: string;
  tipo_relacao: '...' ;
  nfe_itens: NfeItem[];
  // Campos do 0200
  DESCR_ITEM_0200: string | null;
  COD_NCM: string | null;
  TIPO_ITEM: string | null;
}
```

### Arquivo 2: `src/components/equipe/dev/correcoes-sped/TabC170.tsx`

**Atualizar flatMap** para desestruturar o novo formato:
```typescript
data.notas.flatMap(nota =>
  nota.itens_efd.map(entry => ({
    ...entry.c170,
    nfe_itens: entry.nfe_itens ?? [],
    chv_nfe: nota.chv_nfe,
    dt_doc: nota.dt_doc,
    tipo_relacao: nota.tipo_relacao,
    DESCR_ITEM_0200: entry["0200"]?.DESCR_ITEM ?? null,
    COD_NCM: entry["0200"]?.COD_NCM ?? null,
    TIPO_ITEM: entry["0200"]?.TIPO_ITEM ?? null,
  }))
)
```

**Atualizar `getNcm`**: Priorizar `COD_NCM` do registro 0200 sobre o NCM do XML.

**Na tabela**: A coluna NCM do lado EFD agora usa `item.COD_NCM` (do 0200) em vez de extrair do XML. A coluna Descrição EFD pode opcionalmente mostrar `DESCR_ITEM_0200` se diferente de `DESCR_COMPL`.

### Arquivo 3: `src/pages/equipe/dev/CorrecoesSped.tsx`

**Atualizar** o modal de detalhes: `selectedItem` passa a ser `FlatItemEfd` (que já inclui `nfe_itens` e campos 0200). Ajustar referências a `selectedItem.nfe_itens` (que agora vem do flat item, não do `ItemEfd` original).

### Nenhum outro arquivo afetado

Os hooks `useCorrecoesSped` e as abas A170/D100/F100 não consomem esta rota e permanecem inalterados.

