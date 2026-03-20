

## Plano: Correção do Contrato da API PIS/COFINS

### 1. Hook `src/hooks/usePisCofinsApuracao.ts`

**Parâmetros da interface**: trocar `cnpj` → `idContribuinte`, `dataInicio` → `dtIni`, `dataFim` → `dtFim`.

**Construção da URL**: trocar os query params para `id_contribuinte`, `dt_ini`, `dt_fim`.

**Tratamento de erro**: no bloco `!res.ok`, parsear JSON da resposta e extrair `error_message`. Usar `toast()` para exibir mensagens 400 (ex: `INVALID_DATE_RANGE`). Re-throw com a mensagem extraída.

**queryKey**: atualizar para `['pis-cofins-apuracao', idContribuinte, dtIni, dtFim]`.

### 2. Página `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

**Chamada do hook**: passar `idContribuinte: selectedContribuinte` em vez de `cnpj`. Remover o `useMemo` que extrai CNPJ do contribuinte (não mais necessário). Passar `dtIni: dataInicio`, `dtFim: dataFim`.

**Validação** já existe (datas em par ou ambas omitidas) — manter sem alteração.

### 3. Tipos `src/types/pisCofins.ts`

**`PisCofinsRateioReceitas`**: corrigir campos para:
- `rec_bru_cum: number`
- `rec_bru_ncum_exp: number`
- `rec_bru_ncum_nt_mi: number`
- `rec_bru_ncum_trib_mi: number`
- `rec_bru_total: number`

Remover os campos antigos (`ncum_exp`, `ncum_trib_mi`, `ncum_nt_mi`, `faturamento_bruto`).

`cst_pis` já é `string` — sem alteração.

### 4. Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/hooks/usePisCofinsApuracao.ts` | Params renomeados, URL corrigida, toast em erro 400 |
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Passar `idContribuinte` direto, remover derivação de CNPJ |
| `src/types/pisCofins.ts` | Campos de rateio corrigidos |

