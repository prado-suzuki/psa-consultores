

## Plano: Reduzir tamanho dos cards de ferramentas no DevDashboard

### Arquivo: `src/pages/equipe/dev/DevDashboard.tsx`

**Problema**: Os cards do grid de ferramentas são grandes demais e ultrapassam a área visível ao lado da sidebar.

### Mudanças

1. **Grid (linha 207)**: Trocar `lg:grid-cols-3` por `lg:grid-cols-3 xl:grid-cols-4` e reduzir `gap-4` para `gap-3`

2. **Cards (linhas 211-242)**: Reduzir padding interno:
   - `CardHeader`: adicionar `p-3 pb-1` (menor que o padrão p-6)
   - Ícone do tool: `p-1.5` ao invés de `p-2`, ícones `h-4 w-4` ao invés de `h-5 w-5`
   - `CardTitle`: `text-sm` ao invés de `text-base`
   - `CardContent`: `p-3 pt-0` com botão `size="xs"` ou padding menor

3. **Sessões em Andamento (linhas 140-177)**: Reduzir padding do card e dos itens internos (`p-2` ao invés de `p-3`)

4. **Header e search (linhas 181-198)**: Títulos `text-base` ao invés de `text-lg`, ícones `h-4 w-4`

1 arquivo, ~15 linhas ajustadas.

