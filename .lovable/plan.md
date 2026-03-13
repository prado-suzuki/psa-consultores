

# Plano de Ação: Fase 1 - Reestruturação de Diretórios

## Passos a Executar

### 1. Mover Página
**Origem:** `src/pages/equipe/dev/GestaoClientes.tsx`
**Destino:** `src/pages/equipe/fiscal/GestaoClientes.tsx`

### 2. Mover Componente
**Origem:** `src/components/equipe/dev/NewClientModal.tsx`
**Destino:** `src/components/equipe/fiscal/NewClientModal.tsx`

### 3. Atualizar Imports

#### 3.1 `src/pages/equipe/fiscal/FiscalCadastrosClientes.tsx`
```typescript
// ANTES (linha 2):
import { GestaoClientesContent } from '@/pages/equipe/dev/GestaoClientes';

// DEPOIS:
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';
```

#### 3.2 `src/pages/equipe/fiscal/GestaoClientes.tsx` (arquivo movido)
```typescript
// ANTES (linha 16):
import NewClientModal from "@/components/equipe/dev/NewClientModal";

// DEPOIS:
import NewClientModal from "@/components/equipe/fiscal/NewClientModal";
```

## Resumo de Alterações

| Ação | Arquivo | Tipo |
|------|---------|------|
| Mover | `src/pages/equipe/dev/GestaoClientes.tsx` → `src/pages/equipe/fiscal/GestaoClientes.tsx` | Página |
| Mover | `src/components/equipe/dev/NewClientModal.tsx` → `src/components/equipe/fiscal/NewClientModal.tsx` | Componente |
| Editar | `src/pages/equipe/fiscal/FiscalCadastrosClientes.tsx` | Import |
| Editar | `src/pages/equipe/fiscal/GestaoClientes.tsx` | Import |

