

## Plano: Corrigir envio de parâmetros de data vazios no hook useBalanceteEfd

### Problema
O hook envia `dt_ini=&dt_fim=` mesmo quando as datas não foram preenchidas, causando erro 422 na API.

### Arquivo: `src/hooks/useBalanceteEfd.ts`

Alterar a construção do `URLSearchParams` para:
- Sempre enviar `id_contribuinte`
- Só adicionar `dt_ini` e `dt_fim` se **ambos** estiverem preenchidos (string não vazia)
- Se apenas um estiver preenchido, adicionar ambos (a API exige os dois juntos) — na prática, o frontend já valida isso, mas a lógica será: se `dt_ini` e `dt_fim` forem strings não vazias, inclui ambos; caso contrário, não inclui nenhum

1 arquivo, ~5 linhas alteradas.

