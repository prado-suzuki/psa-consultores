

# Plano — Fase 6.4: Extração da Aba "Dados do Cliente" (ClienteTab)

## Escopo

A aba "cliente" ocupa as **linhas 986–1133** (~147 linhas de JSX). Contém 6 campos de formulário: Nome, Categoria, Status (Switch), Tipo de Relacionamento (Fixo/Pontual), Área do Negócio (Select) e Região (Select). Todos controlados via `clientData` / `setClientData`.

## Tipo de Estado

```typescript
interface ClientData {
  nome: string;
  categoria: string;
  ativo: boolean;
  fixo: string;
  telefone: string;
  municipio: string;
  uf: string;
  setor_cliente: string;
  regiao: string;
}
```

## Arquivo a Criar

**`src/components/equipe/fiscal/client-form/ClienteTab.tsx`**

### Props

```typescript
interface ClienteTabProps {
  clientData: ClientData;
  setClientData: React.Dispatch<React.SetStateAction<ClientData>>;
  isReadOnly: boolean;
}
```

### Conteúdo

- JSX idêntico das linhas 987–1132 (a `<section>` completa)
- Imports próprios: `Input`, `Label`, `Select*`, `Switch`, `RequiredMark`
- Nenhuma lógica adicional — é puramente controlado pelo pai

## Edição em `NewClientModal.tsx`

1. **Exportar o tipo `ClientData`** de `src/types/clientForm.ts` para reutilização (ou defini-lo inline no ClienteTab por ora).

2. **Adicionar import**:
   ```typescript
   import { ClienteTab } from "./client-form/ClienteTab";
   ```

3. **Substituir** linhas 986–1133 por:
   ```tsx
   <TabsContent value="cliente" className="mt-0 p-3 md:p-4">
     <ClienteTab
       clientData={clientData}
       setClientData={setClientData}
       isReadOnly={isReadOnly}
     />
   </TabsContent>
   ```

4. **Limpar imports** não mais usados exclusivamente por esta aba (verificar se `Switch`, `RequiredMark` ainda são usados em outro ponto antes de remover).

## Resultado

- ~145 linhas removidas do modal
- 1 novo componente controlado na pasta `client-form/`
- Props: `clientData`, `setClientData`, `isReadOnly`
- Zero mudança visual ou comportamental

