

# Correção das Datas Invertidas na API Selic

## Problema

Todas as chamadas à API Selic estão retornando **erro 400** porque as datas estão invertidas no hook `useSelicDataPerPer.ts`.

A URL gerada é:
```
/api/v1/selic?data_inicio=2026-02-12&data_fim=2025-10-27
```

O `data_inicio` (hoje) é posterior ao `data_fim` (dt_solicitada + 360 dias), o que é inválido. A API exige que `data_inicio` seja anterior a `data_fim`.

## Causa Raiz

Na linha 41 de `src/hooks/useSelicDataPerPer.ts`, os parâmetros estão trocados:

```
data_inicio=${hoje}  →  2026-02-12  (mais recente)
data_fim=${dataFim}  →  2025-10-27  (mais antigo)
```

O correto seria: a Selic deve ser buscada **do fim da carência (dataFim) até hoje**.

## Correção

Alterar **uma única linha** em `src/hooks/useSelicDataPerPer.ts` (linha 41):

**De:**
```
`/api/v1/selic?data_inicio=${hoje}&data_fim=${dataFim}`
```

**Para:**
```
`/api/v1/selic?data_inicio=${dataFim}&data_fim=${hoje}`
```

Isso garante que `data_inicio` (fim da carência, ex: 2025-10-27) seja sempre anterior a `data_fim` (hoje, ex: 2026-02-12).

## Impacto

- Todos os 20+ PERs que estavam com "Vlr. Corrigido" vazio passarão a exibir o valor correto
- Nenhuma outra alteração necessária -- a lógica de cálculo e renderização já está correta
