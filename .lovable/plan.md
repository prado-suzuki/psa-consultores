

# Plano: Corrigir erro "column participante.id does not exist"

## Diagnóstico

O erro ocorre ao salvar alterações em um cliente que já possui participantes. A tabela `participante` (produção) usa `id_participante` como chave primária — **não possui coluna `id`**. Porém o código assume `"id"` para produção em 3 locais:

**Arquivo**: `src/components/equipe/dev/NewClientModal.tsx`

- **Linha 1391**: `const partIdField = isProductionEnvironment ? "id" : "id_participante";` — usado para detectar participantes removidos
- **Linha 1495**: `const pIdField = isProductionEnvironment ? "id" : "id_participante";` — usado para update de participantes existentes

## Correção

Ambas as ocorrências devem usar `"id_participante"` incondicionalmente, já que ambas as tabelas (`participante` e `participante_dev`) usam esse nome de coluna:

```typescript
// Linha 1391 — trocar para:
const partIdField = "id_participante";

// Linha 1495 — trocar para:
const pIdField = "id_participante";
```

Impacto: correção pontual, sem efeitos colaterais.

