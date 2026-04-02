

## Plan: Formatar coluna "Últ. atualização" no padrão brasileiro com horário

### Problema

A função `formatDate` (linha 55) faz split por `-` esperando `YYYY-MM-DD`, mas `criado_em` é um timestamp ISO completo (`2026-04-02T13:43:47.868314+00:00`). O split falha e o catch retorna o valor cru.

### Solução

Adicionar uma função `formatDateTime` no mesmo arquivo que:
1. Cria `new Date(dateStr)` — o construtor JS interpreta ISO corretamente e converte para o timezone local do navegador (que será GMT-4)
2. Formata com `format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })`

### Alteração em `src/pages/equipe/dev/ControlePerdcomp.tsx`

**1. Adicionar função (após `formatDate`, linha 63):**

```typescript
const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
};
```

**2. Usar `formatDateTime` na célula da coluna "Últ. atualização" (linha 649):**

```typescript
{situacaoInfo?.criado_em ? formatDateTime(situacaoInfo.criado_em) : "-"}
```

Resultado: `02/04/2026 às 09:43` (horário local GMT-4).

**1 arquivo, ~10 linhas alteradas.**

