

## Plano: Corrigir endpoints conforme documentação oficial da API

A documentação revela que os 3 endpoints estão com paths errados e que as respostas são **arrays flat** (não objetos wrapper).

### Correções no `src/hooks/useCorrecoesSped.ts`

| Hook | Path atual (errado) | Path correto (API doc) |
|------|---------------------|----------------------|
| `useCorrecoesA170` | `/api/v1/pis_cofins/revisao/servicos-notas` | `/api/v1/pis_cofins/revisao/servicos_itens` |
| `useCorrecoesD100` | `/api/v1/pis_cofins/revisao/transportes` | `/api/v1/pis_cofins/revisao/transp` |
| `useCorrecoesF100` | `/api/v1/pis_cofins/revisao/outros-documentos` | `/api/v1/pis_cofins/revisao/transp_outros` |

### Correções nos tipos (`src/types/correcoesSped.ts`)

A API retorna **arrays flat com campos UPPER_CASE**, não objetos wrapper com `notas`/`itens`. Ajustes:

- Os tipos `A170Response`, `D100Response`, `F100Response` devem ser simplesmente arrays (`A170Item[]`, `D100Item[]`, `F100Item[]`) ou os hooks devem tratar o retorno como array.
- Os campos nos tipos devem usar UPPER_CASE conforme a API: `ID_CONTRIBUINTE`, `CHV_NFSE`, `DT_DOC`, `VL_ITEM`, `CST_PIS`, etc.

### Correções nos componentes de aba

Os componentes `TabA170`, `TabD100` e `TabF100` acessam `data.notas` ou `data.itens` — precisam ser atualizados para iterar diretamente sobre o array retornado.

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCorrecoesSped.ts` | Corrigir 3 paths de endpoint |
| `src/types/correcoesSped.ts` | Ajustar tipos para arrays flat UPPER_CASE |
| `src/components/equipe/dev/correcoes-sped/TabA170.tsx` | Adaptar acesso aos dados (array flat) |
| `src/components/equipe/dev/correcoes-sped/TabD100.tsx` | Adaptar acesso aos dados (array flat) |
| `src/components/equipe/dev/correcoes-sped/TabF100.tsx` | Adaptar acesso aos dados (array flat) |

