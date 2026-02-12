
# Reformular Serviços no Modal de Cadastro de Clientes

## Contexto

A seção de serviços dentro do contrato (Seção 4 do `NewClientModal`) atualmente usa um dropdown customizado que lista itens de `catalog_clients` e permite adicionar valor monetário a cada serviço. O pedido é substituir essa lógica por:

1. **Input com autocomplete** baseado em serviços já cadastrados no sistema
2. **Múltiplos serviços** com botão "Adicionar Serviço"
3. **Remover** dropdown antigo, campos de valor e quantidade
4. **Adicionar** Select de "Equipe Responsável" (dados de `catalog_clients.name`)
5. **Alinhar layout** da nova estrutura

## Alterações no `src/components/equipe/dev/NewClientModal.tsx`

### 1. Atualizar `DraftService`

Simplificar a interface removendo `valor` e renomeando para refletir a nova estrutura:

```typescript
interface DraftService {
  _id: number;
  descricao: string;          // Nome do serviço (digitado ou selecionado do autocomplete)
  id_catalog_client: string;  // Equipe responsável (FK para catalog_clients)
  catalog_name: string;       // Nome da equipe para exibição
}
```

### 2. Adicionar query de serviços existentes para autocomplete

Nova query para buscar descrições únicas da tabela `servico`:

```typescript
const { data: existingServices = [] } = useQuery({
  queryKey: ['existing-services-autocomplete'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('servico')
      .select('descricao')
      .not('descricao', 'is', null);
    if (error) throw error;
    const unique = [...new Set(data.map(s => s.descricao))].filter(Boolean).sort();
    return unique as string[];
  },
  enabled: open,
});
```

### 3. Adicionar estado para cada linha de serviço em draft

Novo estado para gerenciar linhas de serviço com campos individuais:

```typescript
// Substituir draftServices por lógica de campos dinâmicos
// Cada linha terá: input de descrição (com autocomplete) + select de equipe
const [serviceInputs, setServiceInputs] = useState<{ text: string; showSuggestions: boolean }[]>([]);
```

Porém, para manter simplicidade, vamos usar o array `draftServices` existente com um state auxiliar de "texto sendo digitado" por índice.

### 4. Substituir a sub-seção de serviços (linhas 731-787)

**Remover:**
- Botão dropdown customizado (`isServiceDropdownOpen`)
- Campo `Input type="number"` de valor
- Estado `isServiceDropdownOpen`
- Função `updateServiceValue`
- Lógica de subtração de valor no `removeServiceFromDraft`

**Novo layout por serviço:**

```
[ Input texto com autocomplete (Serviço) ] [ Select Equipe Responsável ] [X remover]
```

Com botão "Adicionar Serviço" que insere uma nova linha vazia.

### 5. Lógica de autocomplete

Cada input de serviço terá:
- Estado local para controlar se as sugestões estão visíveis
- Filtro por texto digitado contra `existingServices`
- Ao clicar numa sugestão, preenche o campo
- Ao digitar texto livre (novo serviço), também funciona

### 6. Atualizar `addServiceToDraft` e `removeServiceFromDraft`

```typescript
const addEmptyService = () => {
  setDraftServices([...draftServices, {
    _id: Date.now() + Math.random(),
    descricao: '',
    id_catalog_client: '',
    catalog_name: '',
  }]);
};

const updateServiceField = (id: number, field: string, value: string) => {
  setDraftServices(draftServices.map(s => 
    s._id === id ? { ...s, [field]: value } : s
  ));
};

const removeServiceFromDraft = (id: number) => {
  setDraftServices(draftServices.filter(s => s._id !== id));
};
```

### 7. Atualizar save (handleSave)

Na inserção de serviços (linha 362-369), remover campo `valor`:

```typescript
const svcPayload = contract.services.map(s => ({
  id_contrato: newContrato.id_contrato,
  descricao: s.descricao || null,
  valor: null,  // Campo removido da UI
  id_catalog_client: s.id_catalog_client || null,
}));
```

### 8. Atualizar cards de contrato existentes (linhas 679-688)

Nos cards que mostram contratos adicionados, substituir exibição de valor monetário por nome da equipe responsável:

```typescript
{cont.services.map(s => (
  <div key={s._id} className="flex justify-between text-xs text-muted-foreground">
    <span className="truncate">{s.descricao}</span>
    <span className="text-emerald-600 font-medium">{s.catalog_name}</span>
  </div>
))}
```

### 9. Limpar estados não mais usados

- Remover `isServiceDropdownOpen` e `setIsServiceDropdownOpen`
- Remover `updateServiceValue`
- Simplificar `removeServiceFromDraft` (sem lógica de valor)

## Resumo visual

**Antes:**
```
[Dropdown: Adicionar Serviço ▼]
  Serviço A   [R$ ___] [X]
  Serviço B   [R$ ___] [X]
```

**Depois:**
```
[Input: Digite o serviço...✎] [Select: Equipe ▼] [X]
[Input: Digite o serviço...✎] [Select: Equipe ▼] [X]
[+ Adicionar Serviço]
```

## Arquivos modificados

- `src/components/equipe/dev/NewClientModal.tsx` (único arquivo)
