

## Plano: Corrigir endpoints dos hooks A170, D100 e F100

### Arquivo: `src/hooks/useCorrecoesSped.ts`

Alterar 3 strings de endpoint:

| Hook | De | Para |
|------|-----|------|
| `useCorrecoesA170` | `/api/v1/pis_cofins/revisao/a170` | `/api/v1/pis_cofins/revisao/servicos-notas` |
| `useCorrecoesD100` | `/api/v1/pis_cofins/revisao/d100` | `/api/v1/pis_cofins/revisao/transportes` |
| `useCorrecoesF100` | `/api/v1/pis_cofins/revisao/f100` | `/api/v1/pis_cofins/revisao/outros-documentos` |

Nenhuma outra alteração. Mesmos parâmetros, mesmos tipos de retorno, mesma lógica.

