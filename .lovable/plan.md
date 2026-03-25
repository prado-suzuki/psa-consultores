

## Coluna "Produto" — trocar resolução de serviço para produto/segmento

### Resumo
A coluna "Serviço" na listagem de projetos passa a mostrar o **produto/segmento da OS vinculada** (formato `CT — Consultoria Tributária`) em vez do serviço operacional.

### Alterações

**1. `src/hooks/useTaxProjects.ts` (linhas 91-111)**
Trocar o bloco de resolução `servico_contratado`:
- **Antes:** `ordem_servico.id_servico → servicos_prestados.nome`
- **Depois:** `ordem_servico.id_produto_segmento → produto_segmento.codigo + nome`
- Remover todos os `as any` — ambas as tabelas (`ordem_servico`, `produto_segmento`) estão nos types gerados
- Formato: `"CT — Consultoria Tributária"`

```typescript
// Resolve servico_contratado via ordem_servico → id_produto_segmento → produto_segmento
const osIds = [...new Set((data || []).filter(p => p.ordem_servico_id).map(p => p.ordem_servico_id as string))];
const servicoMap: Record<string, string> = {};

if (osIds.length > 0) {
  const { data: osRows } = await supabase
    .from('ordem_servico')
    .select('id, id_produto_segmento')
    .in('id', osIds);
  const produtoIds = [...new Set((osRows || []).filter(o => o.id_produto_segmento).map(o => o.id_produto_segmento as string))];
  const produtoNames: Record<string, string> = {};
  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase.from('produto_segmento').select('id, codigo, nome').in('id', produtoIds);
    (produtos || []).forEach(p => { produtoNames[p.id] = `${p.codigo} — ${p.nome}`; });
  }
  (osRows || []).forEach(o => {
    if (o.id_produto_segmento && produtoNames[o.id_produto_segmento]) {
      servicoMap[o.id] = produtoNames[o.id_produto_segmento];
    }
  });
}
```

**2. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` (linha 423)**
Renomear header da coluna:
- **Antes:** `<TableHead>Serviço</TableHead>`
- **Depois:** `<TableHead>Produto</TableHead>`

### Não alterado
- Zero alteração no banco
- Zero alteração no formulário
- Renderização da célula (linha 457) permanece igual: `project.servico_contratado || '-'`

