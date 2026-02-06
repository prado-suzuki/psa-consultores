

# Plano: Reorganizar Colunas da Tabela Principal de PER

## Objetivo

Atualizar a tabela principal de PER para exibir as colunas na ordem especificada, adicionando novas colunas e mantendo as existentes.

---

## Analise das Colunas

### Colunas Finais (na ordem)
| # | Coluna | Status | Fonte de Dados |
|---|--------|--------|----------------|
| 1 | Nr Processo PER | Existe | `per.numero_processo_per` |
| 2 | Situacao | Existe | `per_situacao.situacao` |
| 3 | Atualizacao | Existe (manter) | `per_situacao.criado_em` |
| 4 | Data Solicitada | Existe | `per.dt_solicitada` |
| 5 | Exercicio | Existe | `per.exercicio` |
| 6 | Trimestre | Existe (manter) | `per.tri_exercicio` |
| 7 | Tipo de Cred. | Existe | `per.tp_credito` |
| 8 | Valor do Credito | Existe | `per.vlr_credito` |
| 9 | PER Compensado | **NOVA** | Soma de `dcomp.vlr_compensado` (ja calculado em `dcompTotalMap`) |
| 10 | Saldo Disponivel | Existe (renomear de "Saldo Restante do PER") | `vlr_credito - total_compensado` |
| 11 | Ressarcido | **NOVA** | Valor ressarcido quando existe `dt_pagamento` |
| 12 | Data do Pagamento | **NOVA** | `per_situacao.dt_pagamento` |
| 13 | Editar | Existe | Botao de acao |

---

## Alteracoes Tecnicas

### 1. Atualizar Interface `PerSituacaoMap`

Adicionar campo `dt_pagamento`:

```typescript
interface PerSituacaoMap {
  [key: string]: {
    situacao: string;
    criado_em: string;
    dt_pagamento: string | null; // NOVO
  };
}
```

### 2. Atualizar Query de Situacoes

Incluir `dt_pagamento` na consulta e no mapeamento:

```typescript
.select('nr_proc_per, situacao, criado_em, dt_pagamento')

// No mapeamento:
map[sit.nr_proc_per] = {
  situacao: sit.situacao,
  criado_em: sit.criado_em || '',
  dt_pagamento: sit.dt_pagamento || null,
};
```

### 3. Atualizar Headers da Tabela

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Nr Processo</TableHead>
    <TableHead>Situacao</TableHead>
    <TableHead>Atualizacao</TableHead>
    <TableHead>Data Solicitada</TableHead>
    <TableHead>Exercicio</TableHead>
    <TableHead>Trimestre</TableHead>
    <TableHead>Tipo Credito</TableHead>
    <TableHead className="text-right">Valor Credito</TableHead>
    <TableHead className="text-right">PER Compensado</TableHead>
    <TableHead className="text-right">Saldo Disponivel</TableHead>
    <TableHead className="text-right">Ressarcido</TableHead>
    <TableHead>Data Pagamento</TableHead>
    <TableHead className="w-[80px]">Editar</TableHead>
  </TableRow>
</TableHeader>
```

### 4. Atualizar Celulas da Tabela

```tsx
{/* 1. Nr Processo PER */}
<TableCell className="font-medium">{item.numero_processo_per}</TableCell>

{/* 2. Situacao */}
<TableCell>{situacaoInfo?.situacao || '-'}</TableCell>

{/* 3. Atualizacao (MANTER) */}
<TableCell>{situacaoInfo?.criado_em ? formatDate(situacaoInfo.criado_em) : '-'}</TableCell>

{/* 4. Data Solicitada */}
<TableCell>{formatDate(item.dt_solicitada)}</TableCell>

{/* 5. Exercicio */}
<TableCell>{item.exercicio}</TableCell>

{/* 6. Trimestre (MANTER) */}
<TableCell>{item.tri_exercicio}o</TableCell>

{/* 7. Tipo Credito */}
<TableCell>{item.tp_credito}</TableCell>

{/* 8. Valor Credito */}
<TableCell className="text-right">{formatCurrency(item.vlr_credito)}</TableCell>

{/* 9. PER Compensado (NOVA) */}
<TableCell className="text-right">
  {formatCurrency(dcompTotalMap[item.numero_processo_per] || 0)}
</TableCell>

{/* 10. Saldo Disponivel (renomeado) */}
<TableCell className="text-right">
  {(() => {
    const totalCompensado = dcompTotalMap[item.numero_processo_per] || 0;
    const saldo = item.vlr_credito - totalCompensado;
    return (
      <span className={cn(
        "font-medium",
        saldo > 0 ? "text-green-600 dark:text-green-400" : 
        saldo < 0 ? "text-red-600 dark:text-red-400" : ""
      )}>
        {formatCurrency(saldo)}
      </span>
    );
  })()}
</TableCell>

{/* 11. Ressarcido (NOVA) */}
<TableCell className="text-right">
  {situacaoInfo?.dt_pagamento ? formatCurrency(item.vlr_credito) : '-'}
</TableCell>

{/* 12. Data Pagamento (NOVA) */}
<TableCell>
  {situacaoInfo?.dt_pagamento ? formatDate(situacaoInfo.dt_pagamento) : '-'}
</TableCell>

{/* 13. Editar */}
<TableCell>
  <Button variant="ghost" size="icon" ...>
    <Pencil className="h-4 w-4" />
  </Button>
</TableCell>
```

### 5. Atualizar colSpan da Mensagem Vazia

```tsx
<TableCell colSpan={13}>
```

---

## Logica de "Ressarcido"

- **Se existe `dt_pagamento`**: Exibe o valor do credito (`vlr_credito`) como ressarcido
- **Se nao existe `dt_pagamento`**: Exibe "-"

---

## Resultado Visual

```text
| Nr Processo | Situacao     | Atualizacao | Data Solic. | Exerc | Tri | Tipo   | Valor Cred   | PER Comp    | Saldo Disp   | Ressarcido   | Data Pgto  | Editar |
|-------------|--------------|-------------|-------------|-------|-----|--------|--------------|-------------|--------------|--------------|------------|--------|
| 28688.835.. | PER Deferido | 20/02/2025  | 15/01/2024  | 2024  | 1o  | PIS    | R$ 100.000   | R$ 25.000   | R$ 75.000    | R$ 100.000   | 25/02/2025 | [icon] |
| 41407.405.. | Em analise   | 15/01/2025  | 20/03/2024  | 2024  | 2o  | COFINS | R$ 50.000    | R$ 0        | R$ 50.000    | -            | -          | [icon] |
```

---

## Arquivo a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Atualizar interface, query, headers e celulas da tabela |

