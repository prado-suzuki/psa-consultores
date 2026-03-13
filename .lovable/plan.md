

# Plano — Fase 6.3: Extração da Aba Faturamento

## Escopo

A aba Faturamento ocupa as linhas **3401–3495** (~95 linhas). É **puramente read-only** — exibe dados do primeiro contribuinte marcado como `contribuinte_faturamento` (ou o primeiro da lista). Não possui estados internos, handlers nem formulários editáveis.

## Arquivo a Criar

**`src/components/equipe/fiscal/client-form/FaturamentoTab.tsx`**

```typescript
import { DraftEntity } from "@/types/clientForm";
import { Building2 } from "lucide-react";

interface FaturamentoTabProps {
  entities: DraftEntity[];
}

export const FaturamentoTab = ({ entities }: FaturamentoTabProps) => {
  const faturamentoEntity = entities.find(e => e.contribuinte_faturamento) || entities[0];
  // ... JSX idêntico ao atual (empty state + grid de dados)
};
```

## Edição em `NewClientModal.tsx`

1. **Adicionar import**:
   ```typescript
   import { FaturamentoTab } from "./client-form/FaturamentoTab";
   ```

2. **Substituir** linhas 3401–3495 (todo o `TabsContent value="faturamento"`) por:
   ```tsx
   <TabsContent value="faturamento" className="mt-0 p-3 md:p-4">
     <FaturamentoTab entities={entities} />
   </TabsContent>
   ```

## Resultado

- ~90 linhas removidas do modal
- 1 novo componente apresentacional sem estado próprio
- Única prop: `entities: DraftEntity[]`
- Zero mudança visual ou comportamental

