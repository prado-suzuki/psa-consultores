

## Plano: Agrupamento Dinâmico na Listagem de Projetos

### Resumo

Adicionar um Select "Agrupar por" ao lado dos filtros existentes com 3 opções (Nenhum, Cliente, Área). Quando ativo, os projetos filtrados são organizados em seções colapsáveis com header visual (nome do grupo, contador, barra de progresso de conclusão).

### Alterações (arquivo único: `FiscalProjetosCadastro.tsx`)

**1. Imports adicionais**

- `ChevronDown`, `ChevronRight` de `lucide-react`
- `Progress` de `@/components/ui/progress`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` de `@/components/ui/collapsible`

**2. Novo estado**

```tsx
const [groupBy, setGroupBy] = useState<'none' | 'cliente' | 'area'>('none');
```

**3. Função `groupProjects` (dentro do componente, como `useMemo`)**

```tsx
const groupedProjects = useMemo(() => {
  if (groupBy === 'none') return null;
  const map = new Map<string, { label: string; projects: TaxProject[] }>();
  for (const p of filteredProjects) {
    let key: string;
    let label: string;
    if (groupBy === 'cliente') {
      key = p.external_client_id || '__none__';
      label = p.external_client?.nome || 'Sem cliente';
    } else {
      key = p.estrutura_area_id || '__none__';
      label = p.area_ref?.name || 'Sem área';
    }
    if (!map.has(key)) map.set(key, { label, projects: [] });
    map.get(key)!.projects.push(p);
  }
  // Sort: named groups alphabetically, "Sem ..." at the end
  return Array.from(map.values()).sort((a, b) => {
    const aIsNone = a.label.startsWith('Sem ');
    const bIsNone = b.label.startsWith('Sem ');
    if (aIsNone !== bIsNone) return aIsNone ? 1 : -1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}, [filteredProjects, groupBy]);
```

**4. Estado de colapso dos grupos**

```tsx
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
const toggleGroup = (label: string) => {
  setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });
};
```

Reset `collapsedGroups` quando `groupBy` muda (via `useEffect`).

**5. Select "Agrupar por" na barra de filtros (~L487)**

Inserir após o Select de Status e antes do botão "Limpar":

```tsx
<Select value={groupBy} onValueChange={v => setGroupBy(v as 'none' | 'cliente' | 'area')}>
  <SelectTrigger className="w-44">
    <SelectValue placeholder="Agrupar por" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Sem agrupamento</SelectItem>
    <SelectItem value="cliente">Agrupar por Cliente</SelectItem>
    <SelectItem value="area">Agrupar por Área</SelectItem>
  </SelectContent>
</Select>
```

**6. Renderização condicional da tabela (~L536-662)**

- **Quando `groupBy === 'none'`**: manter renderização atual (tabela plana com `filteredProjects`)
- **Quando agrupado**: renderizar `groupedProjects.map(group => ...)`, onde cada grupo é:

```text
┌──────────────────────────────────────────────────────┐
│ ▼  Grupo Zugair                     3 projetos  ██░░│
├──────────────────────────────────────────────────────┤
│ <Table> com mesmas colunas e rows do grupo           │
└──────────────────────────────────────────────────────┘
  mb-4
┌──────────────────────────────────────────────────────┐
│ ▼  Outro Cliente                    5 projetos  ██░░│
│ ...                                                  │
└──────────────────────────────────────────────────────┘
```

Cada header de grupo:
- `div` com `bg-muted rounded-lg px-4 py-2.5 cursor-pointer` + `onClick={toggleGroup}`
- Chevron à esquerda (Down/Right)
- Nome do grupo em `font-semibold`
- Badge com `{n} projeto(s)`
- Barra `<Progress>` fina (h-1.5, w-24) mostrando % de projetos `completed`
- Abaixo, `Card` com a tabela (mesma estrutura atual), condicionada a `!collapsedGroups.has(label)`

A tabela dentro de cada grupo reutiliza exatamente o mesmo `<Table>` + `<TableHeader>` + rows, apenas iterando sobre `group.projects` em vez de `filteredProjects`.

**7. Extrair bloco de renderização de row**

Para evitar duplicação, extrair o JSX de uma `<TableRow>` (L581-657) para uma função local `renderProjectRow(project: TaxProject)` que ambos os modos (plano e agrupado) chamam.

### Arquivos modificados

| Arquivo | Alterações |
|---------|-----------|
| `FiscalProjetosCadastro.tsx` | +imports (Chevron, Progress, Collapsible); +estado `groupBy`/`collapsedGroups`; +`useMemo` grouping; +Select na barra de filtros; renderização condicional tabela plana vs agrupada; função `renderProjectRow` extraída |

