

## Plano: Simplificar coluna Equipe na tabela de projetos

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Import** — adicionar `Crown` do lucide-react.

**2. Helper de abreviação** — criar função inline:
```ts
const shortName = (first: string, last: string) =>
  `${first} ${last.charAt(0)}.`;
```

**3. Coluna Equipe (width 12% → 10%)** — alterar `TableHead` style para `width: '10%'`.

**4. Célula Equipe** (linhas ~615-631) — substituir por:
```tsx
<TableCell
  title={[
    executorName ? `${executorName} (executor)` : null,
    liderName ? `${liderName} (líder)` : null,
  ].filter(Boolean).join(' / ')}
>
  <div className="space-y-0.5">
    {executorName && (
      <div className="flex items-center gap-1 text-sm">
        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{shortName(project.responsible.first_name, project.responsible.last_name)}</span>
      </div>
    )}
    {liderName && liderName !== executorName && (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Crown className="h-3 w-3 shrink-0" />
        <span className="truncate">{shortName(project.leader.first_name, project.leader.last_name)}</span>
      </div>
    )}
    {!executorName && !liderName && <span className="text-muted-foreground">-</span>}
  </div>
</TableCell>
```

- Executor = líder → mostra só 1 linha (ícone User)
- Nomes abreviados: "Ricardo M." em vez de "Ricardo Migueis"
- Tooltip nativo com nomes completos + papel
- Ícone `User` para executor, `Crown` para líder
- Segunda linha em `text-xs text-muted-foreground`

**5. Redistribuir larguras** — com Equipe a 10%, sobram 2% extras. Redistribuir:
- Projeto: 20% → 21%
- Produto: 16% → 17%
- Restante mantido

