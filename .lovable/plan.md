

## Plano: Polish Estético do PivotTable — Dashboard Financeiro Premium

Alterações **exclusivamente visuais** (classes Tailwind e estrutura de divs). Zero mudanças em lógica, filtros ou `useMemo`.

### Arquivo: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

#### 1. Container do Card (linha 72)
Trocar `div` wrapper por card com borda e acento lateral:
```
bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6
```

#### 2. Cabeçalho de seção (linhas 73-76)
Substituir o header simples por um com borda lateral teal e tipografia maior:
```
<div className="border-l-4 border-teal-600 pl-3 py-3 px-4 bg-slate-50">
  <span className="text-sm font-bold text-slate-800">{title}</span>
</div>
```

#### 3. Valores zero com cor apagada (linhas 164-176, 210-222)
Adicionar lógica de cor condicional nas células de período:
- `val === 0` → `text-slate-300`
- `val < 0` → `text-red-600`
- `val > 0` → `text-slate-700`

Mesmo tratamento na linha de totais.

#### 4. Linha de total geral (linhas 193-228)
- Classe da `TableRow`: `bg-slate-100 hover:bg-slate-100 font-bold border-t-2 border-slate-300`
- Sticky cells: trocar `bg-slate-50` → `bg-slate-100`
- Texto do label "Total": `text-xs font-bold uppercase text-slate-800`
- Células de valor: `font-bold text-slate-900`

#### 5. Coluna Total individual por linha (linhas 178-187)
Adicionar `bg-slate-50/50` para destaque sutil na coluna Total de cada row.

#### 6. Rodapé de contagem (linhas 233-235)
Adicionar `border-t border-slate-100` para separação visual sutil.

#### 7. Espaçamento entre cards (linha 420)
Trocar `space-y-4` → `space-y-6` para mais respiro.

### Resumo de impacto

| Elemento | Antes | Depois |
|---|---|---|
| Card wrapper | `shadow-sm` sem borda | `shadow-sm border border-slate-200` |
| Header seção | `bg-slate-100 text-xs` flat | `border-l-4 border-teal-600 text-sm font-bold` |
| Zeros | `text-slate-700` (igual a valores) | `text-slate-300` (apagado) |
| Linha total | `bg-slate-50 font-semibold` | `bg-slate-100 font-bold border-t-2` |
| Espaçamento | `space-y-4` | `space-y-6` |

Arquivo unico afetado: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`.

