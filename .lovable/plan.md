

## Plano: Adicionar scrollbar horizontal nas tabelas da Apuração PIS/COFINS

### Problema
O componente `Table` (ui/table.tsx) envolve a `<table>` em um `<div className="relative w-full overflow-auto">`. Porém `w-full` sem restrição de `max-width` faz o div expandir com o conteúdo. As tabelas com 60+ colunas estouram a largura da página.

### Solução

**1. `ApuracaoDataTable.tsx`** — O wrapper externo `<div className="rounded-md border bg-card overflow-hidden">` já existe com `overflow-hidden`, e o `<div className="overflow-x-auto">` interno também. O problema é que o `Table` component adiciona **outro** wrapper com `overflow-auto`. Para funcionar, o container externo precisa de uma largura máxima explícita.

Alterar o wrapper externo de:
```
<div className="rounded-md border bg-card overflow-hidden">
```
para:
```
<div className="rounded-md border bg-card overflow-hidden max-w-full">
```

E remover o `<div className="overflow-x-auto">` intermediário redundante, deixando o scroll ser controlado pelo wrapper do próprio `Table`.

**2. `ApuracaoPisCofins.tsx`** — Todas as tabelas inline (Apuração, Rateio, etc.) estão dentro de `<Card className="overflow-hidden"><div className="overflow-x-auto"><Table>`. O mesmo problema: o `Card` não restringe largura. Adicionar `max-w-full` ao `Card`.

### Alterações concretas

**`src/components/equipe/dev/pis-cofins/ApuracaoDataTable.tsx` (linha 72):**
- `"rounded-md border bg-card overflow-hidden"` → `"rounded-md border bg-card overflow-x-auto max-w-full"`
- Remover o `<div className="overflow-x-auto">` interno (linha 73 e 111) — deixar scroll no wrapper externo

**`src/pages/equipe/dev/ApuracaoPisCofins.tsx`** — Em todas as ~10 ocorrências de `<Card className="overflow-hidden">`:
- Trocar para `<Card className="overflow-x-auto max-w-full">`
- Remover os `<div className="overflow-x-auto">` internos redundantes

Isso garante um único ponto de scroll horizontal por tabela, com largura restrita ao container pai.

