

## Plano: Adicionar tradução do campo SIMPLES nas abas D100 e F100

### Alteração

Criar um mapa de tradução e aplicá-lo nos dois componentes:

```typescript
const SIMPLES_LABELS: Record<string, string> = {
  A: 'Ausente',
  O: 'Optante',
  N: 'Não Optante',
};
const formatSimples = (code: string | null | undefined) =>
  SIMPLES_LABELS[code ?? ''] ?? code ?? '—';
```

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/correcoes-sped/TabD100.tsx` | Adicionar `SIMPLES_LABELS` + `formatSimples`. Na L113, trocar `{item.SIMPLES}` por `{formatSimples(item.SIMPLES)}` |
| `src/components/equipe/dev/correcoes-sped/TabF100.tsx` | Adicionar `SIMPLES_LABELS` + `formatSimples`. Adicionar coluna "Simples" na tabela (header após "Tipo", célula com Badge renderizando `formatSimples(item.SIMPLES)`). Ajustar colSpan do grupo EFD de 5 para 6 |

