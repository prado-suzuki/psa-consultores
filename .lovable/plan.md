

# Exibir Centro de Custo nos cards de Área

No `src/components/equipe/estrutura/EstruturaManager.tsx`, linha ~427, após o líder e antes do badge de equipes, adicionar a exibição do Centro de Custo da área.

**Lógica:**
- Se a área tem `cost_center_id` próprio → mostrar o CC direto de `centrosCusto`
- Senão → herdar do cluster (via `empresa_id` → `empresas` → `centro_custo_id` → `centrosCusto`)
- Exibir como badge ou texto inline: `CC: CÓDIGO - Nome`

**Alteração (linha ~428):**
Antes do `<Badge>` de equipes, inserir:
```tsx
{(() => {
  let ccLabel: string | null = null;
  if (area.cost_center_id) {
    const cc = centrosCusto.find(c => c.id === area.cost_center_id);
    ccLabel = cc ? `${cc.codigo} - ${cc.nome}` : null;
  } else {
    ccLabel = getEmpresaCostCenter(cluster.empresa_id);
  }
  return ccLabel ? (
    <Badge variant="secondary" className="text-xs ml-1">CC: {ccLabel}</Badge>
  ) : null;
})()}
```

Um único arquivo alterado, ~8 linhas adicionadas.

