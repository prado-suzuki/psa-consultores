

## Plan: Corrigir cálculo do Saldo Disponível na tabela de PERs

### Problema identificado

O `dcompTotalMap` em `ControlePerdcomp.tsx` soma **todos** os DCOMPs vinculados a cada PER, incluindo os que já foram **retificados** por outro DCOMP. Quando um DCOMP A é retificado por DCOMP B (`B.nr_dcomp_ret = A`), ambos são somados, duplicando o valor compensado e gerando saldo negativo incorreto (destacado em vermelho).

O `PerDetailModal` já trata isso corretamente — filtra DCOMPs retificados antes de somar. A tabela principal não faz essa filtragem.

### Correção: `src/pages/equipe/dev/ControlePerdcomp.tsx`

**1. Criar set de DCOMPs retificados** (antes do `dcompTotalMap`, ~linha 244):

```typescript
const dcompsRetificadosSet = useMemo(() => {
  return new Set(
    dcompData
      .filter((d: any) => d.nr_dcomp_ret)
      .map((d: any) => d.nr_dcomp_ret)
  );
}, [dcompData]);
```

**2. Filtrar DCOMPs vigentes no `dcompTotalMap`** (~linha 245-253):

Alterar o loop para ignorar DCOMPs cujo `nr_documento` está no `dcompsRetificadosSet`:

```typescript
const dcompTotalMap = useMemo(() => {
  const map: Record<string, number> = {};
  for (const dcomp of dcompData) {
    if (dcompsRetificadosSet.has(dcomp.nr_documento)) continue; // pular retificados
    const perNum = dcomp.nr_per_orig;
    if (!map[perNum]) map[perNum] = 0;
    map[perNum] += dcomp.vlr_compensado || 0;
  }
  return map;
}, [dcompData, dcompsRetificadosSet]);
```

### Resultado

- Saldo Disponível na tabela principal passa a considerar apenas DCOMPs vigentes (mesmo comportamento do modal de detalhes)
- PERs que antes apareciam em vermelho com saldo negativo passam a exibir o saldo correto
- Nenhum outro arquivo afetado

