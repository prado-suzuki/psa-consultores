

## Padronizar cards de OS — produto/segmento no título

### Contexto

- A interface `OrdemServico` já inclui `id_produto_segmento: string | null`
- O RPC `get_ordens_by_client_name` retorna `SETOF ordem_servico` (todas as colunas)
- Nenhuma alteração de query ou tipo necessária — o campo já está disponível

### Arquivo 1: `ContratosTab.tsx` — header do card colapsado (linha 123)

Substituir `OS {cont.ordem_servico}` por:
```tsx
{(() => {
  const p = cont.id_produto_segmento
    ? produtoSegmentoFullOptions.find(ps => ps.id === cont.id_produto_segmento)
    : null;
  return p
    ? `OS ${cont.ordem_servico} — ${p.codigo} — ${p.nome}`
    : `OS ${cont.ordem_servico}`;
})()}
```

### Arquivo 2: `FiscalProjetosCadastro.tsx`

**A. Importar hook (topo):**
```tsx
import { useClientFormOptions } from '@/hooks/useClientFormOptions';
```

**B. Chamar hook (~linha 155):**
```tsx
const { produtoSegmentoFullOptions } = useClientFormOptions();
```

**C. Título do card de OS (linha 582):**

Substituir `OS: {getOsLabel(os)}` por:
```tsx
{(() => {
  const p = os.id_produto_segmento
    ? produtoSegmentoFullOptions.find(ps => ps.id === os.id_produto_segmento)
    : null;
  return p
    ? `OS: ${getOsLabel(os)} — ${p.codigo} — ${p.nome}`
    : `OS: ${getOsLabel(os)}`;
})()}
```

Sem `as any` — `os` já é tipado como `OrdemServico` que inclui `id_produto_segmento`.

**D. Remover badge `getServicoName` (linhas 606-615):** deletar bloco inteiro.

**E. Remover função `getServicoName` (linhas 373-377):** deletar.

### Resultado

| Local | Formato |
|-------|---------|
| ContratosTab | `OS 001/2026 — CT — Consultoria Tributária` + valor |
| FiscalProjetosCadastro | `OS: 001/2026 — CT — Consultoria Tributária` + badge situação + datas |

Zero `as any`, zero queries novas, zero alteração de tipo.

