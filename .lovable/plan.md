

# Plano de Ação — Fase 6.2: Extração de DateFieldWithInput e CurrencyField

## Componentes a Extrair

Ambos estão definidos nas linhas 77–180 do `NewClientModal.tsx`.

### `DateFieldWithInput` (linhas 77–147)
- Dependências: `useState`, `useEffect` do React; `Input`, `Button`, `Calendar`, `Popover*`, `CalendarIcon` do shadcn/lucide; `toast` do sonner; `parseDate` de `@/lib/dateUtils`; `formatDateMask`, `parseDateMask`, `isoToMasked` de `./constants`

### `CurrencyField` (linhas 150–180)
- Dependências: `useState`, `useEffect` do React; `Input` do shadcn; `cn` de `@/lib/utils`; `formatBRLInput`, `centsToValue`, `valueToCents` de `./constants`

## Arquivos a Criar

### 1. `src/components/equipe/fiscal/client-form/DateFieldWithInput.tsx`
- Copia exata das linhas 77–147, adicionando imports próprios
- Importa `formatDateMask`, `parseDateMask`, `isoToMasked` de `./constants`
- Importa `parseDate` de `@/lib/dateUtils`
- Export nomeado: `export const DateFieldWithInput = ...`

### 2. `src/components/equipe/fiscal/client-form/CurrencyField.tsx`
- Copia exata das linhas 150–180, adicionando imports próprios
- Importa `formatBRLInput`, `centsToValue`, `valueToCents` de `./constants`
- Importa `cn` de `@/lib/utils`
- Export nomeado: `export const CurrencyField = ...`

## Edição em `NewClientModal.tsx`

- **Remover** linhas 75–180 (ambos os componentes + comentários)
- **Adicionar** dois imports:
```typescript
import { DateFieldWithInput } from "./client-form/DateFieldWithInput";
import { CurrencyField } from "./client-form/CurrencyField";
```
- **Remover** imports não mais usados no arquivo principal (se exclusivos desses componentes): `Calendar`, `CalendarIcon`, `Popover`, `PopoverContent`, `PopoverTrigger`, `cn` — verificar se ainda são usados em outro ponto do JSX antes de remover

## Resultado

- ~105 linhas removidas do modal
- 2 novos arquivos reutilizáveis na pasta `client-form/`
- Zero alteração de comportamento

