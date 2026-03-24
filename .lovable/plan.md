

## Fase 1 — Types, Constants e Move do Arquivo

### Resumo

Extrair types, constantes e utilitários do `NewClientModal.tsx` (4.418 linhas) para arquivos dedicados, mover o arquivo para `src/components/equipe/`, e atualizar imports. Zero alteração visual/funcional.

---

### Passo 1 — Mover arquivo e atualizar import

| Ação | Arquivo |
|---|---|
| Mover (criar novo + reescrever) | `src/components/equipe/fiscal/NewClientModal.tsx` → `src/components/equipe/NewClientModal.tsx` |
| Atualizar import (linha 14) | `src/pages/equipe/fiscal/GestaoClientes.tsx` |
| Criar pasta | `src/components/equipe/client-form/` (via criação do `constants.ts`) |

Apenas 1 arquivo importa `NewClientModal`: `GestaoClientes.tsx` linha 14. O import muda de:
```
import NewClientModal from "@/components/equipe/fiscal/NewClientModal"
```
para:
```
import NewClientModal from "@/components/equipe/NewClientModal"
```

---

### Passo 2 — Criar `src/types/clientForm.ts`

Extrair do `NewClientModal.tsx` (linhas 124–191, 384–389):

- `DraftEntity` (interface, linhas 124–146)
- `InscricaoIE` (interface, linhas 148–154)
- `DraftParticipant` (interface, linhas 161–171)
- `DraftOrdemServico` (interface, linhas 173–188)
- `DraftContract` (type alias, linhas 190–191)
- `NewClientModalProps` (interface, linhas 384–389)

No `NewClientModal.tsx`: remover essas definições e adicionar:
```typescript
import { DraftEntity, InscricaoIE, DraftParticipant, DraftOrdemServico, DraftContract, NewClientModalProps } from "@/types/clientForm";
```

---

### Passo 3 — Criar `src/components/equipe/client-form/constants.ts`

Extrair do `NewClientModal.tsx`:

| Item | Linhas aprox. |
|---|---|
| `TIPO_PARTICIPANTE_OPTIONS` | 63–72 |
| `UF_STATES` | 156–159 |
| `SITUACAO_PROJETO_OPTIONS` | 116–121 |
| `formatCpfCnpj` | 194–209 |
| `formatCep` | 211–215 |
| `formatPhone` | 217–223 |
| `formatBRLInput`, `centsToValue`, `valueToCents` | 226–232 |
| `formatDateMask`, `parseDateMask`, `isoToMasked` | 235–262 |
| `formatCurrencyDisplay` | 919–920 |
| `generateNextOsNumber` | 77–114 |
| `defaultClientData` (factory) | 612–623 |
| `createDefaultDraftEntity` (factory) | 632–652 |
| `createDefaultDraftParticipant` (factory) | 656–664 |
| `createDefaultDraftContract` (factory) | 680–693 |

**NÃO inclui** `syncCadastrosToDW` (linhas 265–276) — permanece no `NewClientModal.tsx` até a Fase 3 (hook de persistência).

No `NewClientModal.tsx`: remover todas essas definições e adicionar:
```typescript
import {
  TIPO_PARTICIPANTE_OPTIONS, UF_STATES, SITUACAO_PROJETO_OPTIONS,
  formatCpfCnpj, formatCep, formatPhone, formatBRLInput, centsToValue, valueToCents,
  formatDateMask, parseDateMask, isoToMasked, formatCurrencyDisplay,
  generateNextOsNumber, defaultClientData, createDefaultDraftEntity,
  createDefaultDraftParticipant, createDefaultDraftContract,
} from "./client-form/constants";
```

O `generateNextOsNumber` precisa de `supabase` e do tipo `DraftOrdemServico`, que serão importados dentro do `constants.ts`.

---

### Arquivos resultantes

| Arquivo | Ação | Linhas aprox. |
|---|---|---|
| `src/types/clientForm.ts` | **Criar** | ~75 |
| `src/components/equipe/client-form/constants.ts` | **Criar** | ~180 |
| `src/components/equipe/NewClientModal.tsx` | **Criar** (cópia do original com imports atualizados, definições locais removidas) | ~4.150 |
| `src/components/equipe/fiscal/NewClientModal.tsx` | **Deletar** (substituído pelo novo caminho) | - |
| `src/pages/equipe/fiscal/GestaoClientes.tsx` | **Alterar** linha 14 | 1 linha |

### Validação

- `NewClientModal.tsx` continua com export default e mesmo comportamento
- O build deve compilar sem erros
- Nenhuma mudança visual ou funcional

