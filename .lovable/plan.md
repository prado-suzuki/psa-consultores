
# Plano: Adicionar "Saldo Restante do PER" na Tabela Principal

## Objetivo
1. Renomear "Saldo Restante" para "Saldo Restante do PER" no modal de detalhes
2. Adicionar coluna "Saldo Restante do PER" na tabela principal, antes da coluna "Editar"

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Renomear "Saldo Restante" para "Saldo Restante do PER" (2 lugares) |
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Adicionar coluna "Saldo Restante do PER" na tabela |

---

## Detalhes Tecnicos

### 1. PerDetailModal.tsx

**Linha 295** (header do modal):
```tsx
// DE:
Saldo Restante

// PARA:
Saldo Restante do PER
```

**Linha 511** (footer mobile):
```tsx
// DE:
Saldo Restante

// PARA:
Saldo Restante do PER
```

---

### 2. ControlePerdcomp.tsx

**Adicionar funcao auxiliar** para calcular saldo por PER:
```typescript
// Criar mapa de total compensado por PER
const dcompTotalMap = useMemo(() => {
  const map: Record<string, number> = {};
  for (const dcomp of dcompData) {
    const perNum = dcomp.nr_per_orig;
    if (!map[perNum]) map[perNum] = 0;
    map[perNum] += dcomp.vlr_compensado || 0;
  }
  return map;
}, [dcompData]);
```

**Adicionar coluna no TableHeader** (apos "Valor Credito", antes de "Editar"):
```tsx
<TableHead className="text-right">Saldo Restante do PER</TableHead>
```

**Adicionar celula no TableRow** (apos "Valor Credito", antes de "Editar"):
```tsx
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
```

**Atualizar colSpan** da mensagem "Nenhum registro encontrado":
```tsx
// DE:
<TableCell colSpan={9}>

// PARA:
<TableCell colSpan={10}>
```

---

## Resultado Visual

### Tabela Principal (Nova Coluna)
```text
| Nr Processo | Situacao | Atualizacao | Exercicio | Trimestre | Data | Tipo | Valor Credito | Saldo Restante do PER | Editar |
|-------------|----------|-------------|-----------|-----------|------|------|---------------|----------------------|--------|
| 12345...    | Em analise | 01/01/2024 | 2024     | 1o        | ...  | PIS  | R$ 10.000,00  | R$ 7.500,00         | [icone]|
```

### Modal de Detalhes (Renaomeado)
```text
Valor Credito          Saldo Restante do PER
R$ 10.000,00           R$ 7.500,00
```

---

## Observacoes

- Os dados de DCOMP (`dcompData`) ja estao sendo buscados na pagina
- O calculo do saldo sera: `vlr_credito - soma(vlr_compensado)` de todos os DCOMPs vinculados
- Cores do saldo: verde se positivo, vermelho se negativo, neutro se zero
- A performance sera otimizada com `useMemo` para evitar recalculos desnecessarios
