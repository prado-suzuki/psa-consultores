

# Correção: site em branco por chunk splitting de React

## Diagnóstico confirmado
A regra `manualChunks` na linha 35 de `vite.config.ts` coloca `react-dom` e `react-router` no chunk `react-vendor`, mas **não inclui `react`** (o pacote core). Isso quebra a dependência interna do `react-dom` sobre `react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, gerando o erro fatal em produção.

## Correção
Arquivo: `vite.config.ts`, linha 35.

Alterar a condição para incluir `react` no mesmo chunk:

```typescript
// ANTES (quebrado):
if (id.includes("react-dom") || id.includes("react-router")) {
  return "react-vendor";
}

// DEPOIS (corrigido):
if (
  id.includes("/react/") ||
  id.includes("/react-dom/") ||
  id.includes("react-router") ||
  id.includes("scheduler")
) {
  return "react-vendor";
}
```

Detalhes:
- `/react/` com barras evita falsos positivos (ex: `react-hook-form` não será capturado)
- `/react-dom/` com barras pela mesma razão
- `scheduler` é dependência interna do `react-dom`, deve ficar junto
- `react-router` pode continuar com match parcial pois não há conflito

## Após a correção
Republicar o projeto (Publish → Update). O novo build gerará um chunk `react-vendor` contendo `react` + `react-dom` + `scheduler` + `react-router` juntos, eliminando o erro.

