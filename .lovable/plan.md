
# Plano de Correção: DIFAL Inteligente

## Resumo dos Problemas

1. **Erro `nfes.flatMap is not a function`**: A API retorna um objeto paginado `{ items: [], total, page, page_size, has_more }`, mas o código espera um array direto.

2. **Filtros diferentes do ConsultaXMLs**: Os campos de data estão usando `MonthYearPicker` em vez de `Calendar + Popover` com data completa (dia/mês/ano), e o contribuinte mostra CNPJ em linha separada.

---

## Alterações Necessárias

### Arquivo: `src/pages/equipe/dev/AuditoriaFiscal.tsx`

#### 1. Corrigir Tipo de Retorno da API

Adicionar interface para resposta paginada:

```typescript
interface NFeApiResponse {
  items: NFeRecord[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
```

Alterar query de NFes para usar `.items`:

```typescript
const { data: nfesData, ... } = useQuery({
  // ...
  queryFn: async () => {
    // ...
    return response.json() as Promise<NFeApiResponse>;
  },
});

// E no flatItems useMemo:
const flatItems = useMemo(() => {
  if (!nfesData?.items || !contribuintes) return [];
  // ...
  return flattenNFeItems(nfesData.items, cnpj);
}, [nfesData, contribuintes, selectedContribuinte]);
```

#### 2. Alterar Filtros de Data para Calendar + Popover

Remover `MonthYearPicker` e usar o mesmo padrão do ConsultaXMLs:

**Antes:**
```typescript
const [dataInicio, setDataInicio] = useState<{ month: number; year: number } | null>({ ... });
```

**Depois:**
```typescript
const [dataInicio, setDataInicio] = useState("2024-01-01");
const [dataFim, setDataFim] = useState("2026-01-31");
```

Adicionar imports necessários:
```typescript
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
```

Substituir componente de data no JSX:
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className={cn(
        "w-full h-9 px-3 text-left font-normal justify-start",
        !dataInicio && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
      {dataInicio 
        ? format(parse(dataInicio, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
        : "Selecione"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={dataInicio ? parse(dataInicio, "yyyy-MM-dd", new Date()) : undefined}
      onSelect={(date) => {
        setDataInicio(date ? format(date, "yyyy-MM-dd") : "");
        setSearchTriggered(false);
      }}
      initialFocus
      locale={ptBR}
    />
  </PopoverContent>
</Popover>
```

#### 3. Alterar Campo Contribuinte

Remover a exibição do CNPJ em linha separada:

**Antes:**
```typescript
<SelectItem key={contribuinte.id} value={contribuinte.id}>
  <div className="flex flex-col">
    <span>{contribuinte.nome_razao_social}</span>
    <span className="text-xs text-slate-500">{contribuinte.cpf_cnpj}</span>
  </div>
</SelectItem>
```

**Depois:**
```typescript
<SelectItem key={contribuinte.id} value={contribuinte.id}>
  {contribuinte.nome_razao_social}
</SelectItem>
```

#### 4. Atualizar Query de NFes

Alterar URL para usar datas no formato correto (já está `yyyy-MM-dd`):

```typescript
const url = `${API_BASE_URL}/api/v1/query/contribuintes/${cnpj}/nfes?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo=entrada`;
```

---

## Resumo das Mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| Tipo API NFes | `NFeRecord[]` | `NFeApiResponse` (com `.items`) |
| Data Início | `MonthYearPicker` | `Calendar + Popover` (dd/MM/yyyy) |
| Data Fim | `MonthYearPicker` | `Calendar + Popover` (dd/MM/yyyy) |
| Contribuinte Select | Nome + CNPJ em 2 linhas | Apenas nome |
| Estado dataInicio | `{ month, year }` | String `"yyyy-MM-dd"` |

---

## Seção Técnica

### Imports a Adicionar
```typescript
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
```

### Imports a Remover
```typescript
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
```

### Estados Alterados
```typescript
// Antes
const [dataInicio, setDataInicio] = useState<{ month: number; year: number } | null>({ ... });
const [dataFim, setDataFim] = useState<{ month: number; year: number } | null>({ ... });

// Depois
const [dataInicio, setDataInicio] = useState("2024-01-01");
const [dataFim, setDataFim] = useState("2026-01-31");
```

### Lógica flatItems
```typescript
const flatItems = useMemo(() => {
  if (!nfesData?.items || !contribuintes) return [];
  const contribuinteData = contribuintes.find((c) => c.id === selectedContribuinte);
  if (!contribuinteData?.cpf_cnpj) return [];

  const cnpj = contribuinteData.cpf_cnpj.replace(/\D/g, '');
  return flattenNFeItems(nfesData.items, cnpj); // Usar .items
}, [nfesData, contribuintes, selectedContribuinte]);
```
