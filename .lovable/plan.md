

## Ajuste: Cards KPI compactos com scroll horizontal

### Problema
Os 4 KPI cards do dashboard de horas ocupam muito espaco vertical (especialmente em telas menores) e nao sao todos visiveis sem rolar a pagina.

### Solucao
Trocar o grid por um container flex com scroll horizontal (`overflow-x-auto`) e reduzir o padding dos cards para ficarem mais compactos.

### Alteracao unica

**Arquivo:** `src/components/sprint/SprintHoursDashboard.tsx` (linhas 136-170)

- Substituir `grid grid-cols-2 md:grid-cols-4 gap-3` por `flex gap-3 overflow-x-auto pb-1`
- Adicionar `min-w-[140px] flex-shrink-0` em cada Card para manter tamanho minimo e evitar colapso
- Reduzir padding de `p-4` para `p-3`
- Reduzir fonte do valor de `text-2xl` para `text-xl`

Resultado: cards em linha unica com scroll lateral quando necessario, mais compactos visualmente.

