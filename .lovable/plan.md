

# Plano: Adicionar Calculadora Detalhada para Economias Opcionais

## Problema Atual

As economias adicionais no modal de melhoria (`ProcessImprovementModal.tsx`) são apenas campos de valor:

```text
+----------------------------------+
| Economia com Sistemas: [R$500]   |  <- Só o valor final
| Build vs Buy: [R$2000]           |  <- Não sabemos de onde veio
| Outras Economias: [R$300]        |  <- Sem histórico
+----------------------------------+
```

**Problema**: Não há como saber de onde esses valores vieram, dificultando auditoria e análise futura.

---

## Solução Proposta

Transformar cada campo de economia em uma seção expandível com detalhamento:

```text
+------------------------------------------------------------------------+
| Economias Adicionais (opcional)                                        |
+------------------------------------------------------------------------+
|                                                                        |
| v Economia com Sistemas                                    R$ 950/mês  |
| +------------------------------------------------------------------+  |
| | Sistema/Ferramenta        | Custo ANTES | Custo DEPOIS | Economia | |
| |---------------------------|-------------|--------------|----------|  |
| | Alterdata                 | R$ 500      | R$ 0         | R$ 500   | |
| | Planilha Excel Online     | R$ 50       | R$ 0         | R$ 50    | |
| | Licença Power BI          | R$ 400      | R$ 0         | R$ 400   | |
| | [+ Adicionar Sistema]                                              | |
| +------------------------------------------------------------------+  |
|                                                                        |
| v Construir vs Comprar (economia única)                   R$ 12.000   |
| +------------------------------------------------------------------+  |
| | Item                      | Custo Mercado | Custo Interno| Economia| |
| |---------------------------|---------------|--------------|---------|  |
| | Sistema de Conciliação    | R$ 10.000     | R$ 0         | R$10.000| |
| | Consultoria Implementação | R$ 2.000      | R$ 0         | R$ 2.000| |
| | [+ Adicionar Item]                                                 | |
| +------------------------------------------------------------------+  |
|                                                                        |
| v Outras Economias                                         R$ 200/mês |
| +------------------------------------------------------------------+  |
| | Descrição                          | Valor/mês                    | |
| |------------------------------------|------------------------------|  |
| | Redução de papel/impressões        | R$ 100                       | |
| | Economia com energia               | R$ 100                       | |
| | [+ Adicionar Economia]                                             | |
| +------------------------------------------------------------------+  |
+------------------------------------------------------------------------+
```

---

## Estrutura de Dados

### Nova Tabela: `improvement_savings_details`

```sql
CREATE TABLE public.improvement_savings_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_id uuid REFERENCES public.process_improvements(id) ON DELETE CASCADE,
  savings_type text NOT NULL CHECK (savings_type IN ('system', 'build_vs_buy', 'other')),
  description text NOT NULL,
  cost_before numeric DEFAULT 0,
  cost_after numeric DEFAULT 0,
  savings_value numeric NOT NULL,
  is_monthly boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Campos**:
- `savings_type`: Tipo da economia (system, build_vs_buy, other)
- `description`: Nome do sistema, item ou descrição
- `cost_before`: Custo anterior (para sistemas e build vs buy)
- `cost_after`: Custo atual (geralmente 0 quando elimina)
- `savings_value`: Valor economizado (calculado ou manual)
- `is_monthly`: Se é recorrente mensal ou único

---

## Alteracoes no Frontend

### 1. Novos Estados e Interfaces

```typescript
interface SavingsItem {
  id?: string;
  savings_type: 'system' | 'build_vs_buy' | 'other';
  description: string;
  cost_before: number;
  cost_after: number;
  savings_value: number;
  is_monthly: boolean;
}

// Estados
const [systemSavings, setSystemSavings] = useState<SavingsItem[]>([]);
const [buildVsBuySavings, setBuildVsBuySavings] = useState<SavingsItem[]>([]);
const [otherSavings, setOtherSavings] = useState<SavingsItem[]>([]);
```

### 2. Componente de Linha de Economia

```tsx
const SavingsItemRow = ({ 
  item, 
  type, 
  onUpdate, 
  onRemove,
  showCosts = true 
}) => (
  <div className="flex items-center gap-2 py-2 border-b border-gray-100">
    <Input
      placeholder={type === 'other' ? 'Descrição' : 'Sistema/Item'}
      value={item.description}
      onChange={(e) => onUpdate({ ...item, description: e.target.value })}
      className="flex-1"
    />
    {showCosts && (
      <>
        <Input
          type="number"
          placeholder="Custo Antes"
          value={item.cost_before || ''}
          onChange={(e) => {
            const before = parseFloat(e.target.value) || 0;
            onUpdate({ 
              ...item, 
              cost_before: before,
              savings_value: before - item.cost_after
            });
          }}
          className="w-28"
        />
        <Input
          type="number"
          placeholder="Custo Depois"
          value={item.cost_after || ''}
          onChange={(e) => {
            const after = parseFloat(e.target.value) || 0;
            onUpdate({ 
              ...item, 
              cost_after: after,
              savings_value: item.cost_before - after
            });
          }}
          className="w-28"
        />
      </>
    )}
    <div className="w-24 text-right font-medium text-green-600">
      R$ {item.savings_value.toLocaleString('pt-BR')}
    </div>
    <Button variant="ghost" size="icon" onClick={onRemove}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);
```

### 3. Seção de Economias Expandível

```tsx
<Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
  <CollapsibleTrigger asChild>
    <div className="flex items-center justify-between p-3 hover:bg-blue-100/50 rounded cursor-pointer">
      <div className="flex items-center gap-2">
        <ChevronRight className={cn("h-4 w-4 transition-transform", systemOpen && "rotate-90")} />
        <Monitor className="h-4 w-4 text-blue-600" />
        <span className="font-medium">Economia com Sistemas</span>
      </div>
      <Badge variant="outline" className="text-green-600 border-green-300">
        R$ {totalSystemSavings.toLocaleString('pt-BR')}/mês
      </Badge>
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="pl-6 pr-2 pb-3 space-y-2">
      <div className="grid grid-cols-[1fr_100px_100px_80px_32px] gap-2 text-xs font-medium text-muted-foreground px-2">
        <span>Sistema/Ferramenta</span>
        <span>Custo Antes</span>
        <span>Custo Depois</span>
        <span className="text-right">Economia</span>
        <span></span>
      </div>
      {systemSavings.map((item, i) => (
        <SavingsItemRow
          key={i}
          item={item}
          type="system"
          onUpdate={(updated) => updateSavingsItem(i, updated, 'system')}
          onRemove={() => removeSavingsItem(i, 'system')}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => addSavingsItem('system')}
        className="w-full border-dashed border"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Sistema
      </Button>
    </div>
  </CollapsibleContent>
</Collapsible>
```

### 4. Cálculo Automático dos Totais

```typescript
const totalSystemSavings = useMemo(() => 
  systemSavings.reduce((sum, item) => sum + item.savings_value, 0), 
  [systemSavings]
);

const totalBuildVsBuy = useMemo(() => 
  buildVsBuySavings.reduce((sum, item) => sum + item.savings_value, 0), 
  [buildVsBuySavings]
);

const totalOtherSavings = useMemo(() => 
  otherSavings.reduce((sum, item) => sum + item.savings_value, 0), 
  [otherSavings]
);

// Atualizar additionalSavings automaticamente
useEffect(() => {
  setAdditionalSavings({
    system_savings_monthly: totalSystemSavings,
    build_vs_buy_savings: totalBuildVsBuy,
    other_savings_monthly: totalOtherSavings
  });
}, [totalSystemSavings, totalBuildVsBuy, totalOtherSavings]);
```

### 5. Salvar Detalhes ao Criar Melhoria

```typescript
// Após criar o improvement, salvar os detalhes
const allSavingsDetails = [
  ...systemSavings.map(s => ({ ...s, improvement_id: improvement.id, savings_type: 'system' })),
  ...buildVsBuySavings.map(s => ({ ...s, improvement_id: improvement.id, savings_type: 'build_vs_buy' })),
  ...otherSavings.map(s => ({ ...s, improvement_id: improvement.id, savings_type: 'other' }))
].filter(s => s.description.trim());

if (allSavingsDetails.length > 0) {
  await supabase
    .from('improvement_savings_details')
    .insert(allSavingsDetails);
}
```

---

## Fluxo de Uso

```text
1. Usuario clica em "Avaliar Melhoria" no processo
   ↓
2. Na seção "Economias Adicionais", expande "Economia com Sistemas"
   ↓
3. Clica em "+ Adicionar Sistema"
   ↓
4. Preenche: "Alterdata" | Antes: R$500 | Depois: R$0
   ↓
5. Sistema calcula automaticamente: Economia = R$500
   ↓
6. Badge atualiza mostrando total: "R$ 500/mês"
   ↓
7. Ao salvar, registra tanto o total quanto o detalhamento
   ↓
8. No histórico, pode ver de onde veio cada economia
```

---

## Arquivos a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `migrations/` | Criar tabela `improvement_savings_details` |
| `ProcessImprovementModal.tsx` | Refatorar seção de economias com collapsibles e linhas detalhadas |
| `ImprovementHistoryModal.tsx` | Mostrar detalhamento das economias no histórico |

---

## Benefícios

1. **Rastreabilidade**: Histórico completo de cada economia registrada
2. **Cálculo Automático**: Sistema calcula economia baseado em antes/depois
3. **Auditoria**: Fácil identificar de onde vieram os valores
4. **Documentação**: Detalhamento serve como memória do projeto
5. **Precisão**: Evita estimativas vagas, força o detalhamento

