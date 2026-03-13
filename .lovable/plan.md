

# Plano de Ação — Fase 4: Extrair consultas externas (CNPJ/CEP) para hook dedicado

## Arquivo a Criar

**`src/hooks/useExternalConsults.ts`**

```typescript
export interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  cnae_fiscal: number | null;
  cnae_fiscal_descricao: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function useExternalConsults() {
  async function consultarCnpj(cnpj: string): Promise<CnpjData>;
  async function consultarCep(cep: string): Promise<CepData>;
  return { consultarCnpj, consultarCep };
}
```

- `consultarCnpj`: sanitiza dígitos, faz fetch para BrasilAPI, lança `Error` se `!res.ok`
- `consultarCep`: sanitiza dígitos, faz fetch para ViaCEP, lança `Error` se `data.erro`
- Funções puras de fetch — sem estado, sem toast, sem side effects

## Arquivo a Editar

**`src/components/equipe/fiscal/NewClientModal.tsx`**

### Mudanças nos 4 handlers (linhas 642–670, 672–694, 866–898, 900–925):

Os handlers continuam no componente (gerenciam loading, toast e state), mas delegam o fetch ao hook:

```typescript
const { consultarCnpj, consultarCep } = useExternalConsults();

const handleCnpjBlur = async (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return;
  setCnpjLoading(true);
  try {
    const data = await consultarCnpj(digits);  // ← hook
    setDraftEntity((prev) => ({ ...prev, /* mapeamento idêntico */ }));
    toast.success("Dados preenchidos via CNPJ");
  } catch {
    toast.error("CNPJ não encontrado na base federal");
  } finally {
    setCnpjLoading(false);
  }
};
// Mesmo padrão para handleCepBlur, handleInlineCnpjBlur, handleInlineCepBlur
```

## Resumo

| Ação | Arquivo |
|---|---|
| **Criar** | `src/hooks/useExternalConsults.ts` |
| **Editar** | `src/components/equipe/fiscal/NewClientModal.tsx` — substituir 4 blocos de `fetch` por chamadas ao hook (~8 linhas removidas, 1 import + 1 desestruturação adicionados) |

## Escopo Protegido

- `executeSave` e toda lógica de mutação
- Estados de loading (`cnpjLoading`, `cepLoading`) — permanecem no componente
- Toasts — permanecem no componente
- Mapeamento de dados para drafts — permanece no componente

