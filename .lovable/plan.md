
# Correção: DIFAL Inteligente - Parâmetro Incorreto na API

## Problema Identificado

A ferramenta **DIFAL Inteligente** não carrega itens porque está passando o **CNPJ** na URL da API, enquanto a API espera o **ID do contribuinte** (UUID do Supabase).

### Comparação das Ferramentas

| Ferramenta | URL Gerada | Funciona? |
|------------|------------|-----------|
| Consulta XMLs | `/contribuintes/{UUID}/nfes?...` | Sim |
| DIFAL Inteligente | `/contribuintes/{CNPJ}/nfes?...` | Não |

### Código Atual (DIFAL - linha 147-148)

```typescript
const cnpj = contribuinteData.cpf_cnpj.replace(/\D/g, '');
const url = `${API_BASE_URL}/api/v1/query/contribuintes/${cnpj}/nfes?...`;
```

### Código Correto (Consulta XMLs - linha 385)

```typescript
const url = `${baseUrl}/${selectedContribuinte}/nfes?${params.toString()}`;
// selectedContribuinte = UUID do contribuinte
```

---

## Correção Necessária

### Arquivo: `src/pages/equipe/dev/AuditoriaFiscal.tsx`

#### 1. Simplificar a Query de NFes (linhas 132-158)

Usar diretamente o `selectedContribuinte` (ID/UUID) em vez de buscar o CNPJ:

**Antes:**
```typescript
queryFn: async () => {
  const contribuinteData = contribuintes?.find(
    (c) => c.id === selectedContribuinte
  );
  if (!contribuinteData?.cpf_cnpj) {
    throw new Error('CNPJ do contribuinte não encontrado');
  }

  const cnpj = contribuinteData.cpf_cnpj.replace(/\D/g, '');
  const url = `${API_BASE_URL}/api/v1/query/contribuintes/${cnpj}/nfes?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo=entrada`;
  // ...
}
```

**Depois:**
```typescript
queryFn: async () => {
  if (!selectedContribuinte) {
    throw new Error('Contribuinte não selecionado');
  }

  const url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo=entrada`;
  // ...
}
```

#### 2. Ajustar a Função `flattenNFeItems` (linhas 160-183)

Passar o ID do contribuinte (ou buscar o CNPJ se realmente necessário para a classificação):

**Opção A - Usar ID como identificador:**
```typescript
return flattenNFeItems(nfesData.items, selectedContribuinte);
```

**Opção B - Manter CNPJ para classificação (mais correto semanticamente):**
```typescript
const flatItems = useMemo(() => {
  if (!nfesData?.items || !contribuintes) return [];
  const contribuinteData = contribuintes.find(
    (c) => c.id === selectedContribuinte
  );
  // Usar CNPJ apenas para o campo id_contribuinte nos itens
  const cnpj = contribuinteData?.cpf_cnpj?.replace(/\D/g, '') || selectedContribuinte;
  return flattenNFeItems(nfesData.items, cnpj);
}, [nfesData, contribuintes, selectedContribuinte]);
```

---

## Resumo das Mudanças

| Local | Antes | Depois |
|-------|-------|--------|
| URL da API | `/${cnpj}/nfes?...` | `/${selectedContribuinte}/nfes?...` |
| Validação | Verifica `cpf_cnpj` | Verifica `selectedContribuinte` |
| `enabled` | Depende de `contribuintes` | Depende apenas de `selectedContribuinte` |

---

## Seção Técnica

### Código Corrigido (linhas 132-158)

```typescript
// Query: Buscar NFes do período
const {
  data: nfesData,
  isLoading: isLoadingNFes,
  error: nfesError,
} = useQuery({
  queryKey: ['difal-nfes', selectedContribuinte, dataInicio, dataFim],
  queryFn: async () => {
    if (!selectedContribuinte) {
      throw new Error('Contribuinte não selecionado');
    }

    // Usar ID do contribuinte (UUID) como na Consulta XMLs
    const url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo=entrada`;

    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error('Erro ao buscar notas fiscais');
    }

    return response.json() as Promise<NFeApiResponse>;
  },
  enabled: searchTriggered && !!selectedContribuinte,
});
```

### Código Corrigido para flatItems (linhas 186-195)

```typescript
// Itens achatados
const flatItems = useMemo(() => {
  if (!nfesData?.items) return [];
  
  // Buscar CNPJ para usar como id_contribuinte na classificação
  const contribuinteData = contribuintes?.find(
    (c) => c.id === selectedContribuinte
  );
  const cnpj = contribuinteData?.cpf_cnpj?.replace(/\D/g, '') || selectedContribuinte;
  
  return flattenNFeItems(nfesData.items, cnpj);
}, [nfesData, contribuintes, selectedContribuinte]);
```

Esta correção alinha o DIFAL Inteligente com o padrão da Consulta XMLs, usando o ID do contribuinte na URL da API, garantindo que os itens sejam carregados corretamente.
