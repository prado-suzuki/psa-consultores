
# Plano: Ajustes no Calculo de ROI e Exibicao em Sprints

## Resumo da Analise

Apos revisao completa do codigo, identifiquei os seguintes pontos sobre o sistema de ROI atual:

### O Que Ja Funciona

1. **ProcessImprovementModal**: Calcula ROI atraves da edge function `calculate-process-roi`
2. **Edge Function**: Calcula corretamente:
   - Tempo economizado (horas)
   - Custo economizado (baseado em membros + hourly_rate de job_roles)
   - FTE liberados (horas / 176)
   - ROI percentual anual
   - Payback em meses

3. **Tabela job_roles**: Possui 10+ cargos com custos/hora definidos (R$ 15-80/hora)

4. **ImpactDashboard**: Busca melhorias completadas e exibe metricas agregadas

5. **ProcessImprovementModal** (linha 236-249): Ja atualiza a tabela `processes` com os dados "melhorados" apos salvar

### Pontos a Ajustar

1. **ROI nao esta sendo salvo na tabela processes diretamente** - Apenas no `process_improvements`
2. **Sprints nao exibem valor de melhoria gerado** - Cards de sprint nao mostram economia
3. **Variaveis adicionais de economia nao consideradas** - Sistema atual so considera mao de obra, nao economia de sistemas

---

## Alteracoes Necessarias

### 1. Adicionar Campos de ROI na Tabela Processes

Adicionar campos para armazenar o ROI calculado diretamente no processo:

```sql
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS last_roi_percentage numeric,
ADD COLUMN IF NOT EXISTS last_cost_saved_monthly numeric,
ADD COLUMN IF NOT EXISTS last_time_saved_hours numeric,
ADD COLUMN IF NOT EXISTS last_improvement_date timestamptz;
```

### 2. Atualizar ProcessImprovementModal

Modificar o `handleSave()` para tambem salvar os valores de ROI no processo:

```typescript
// Apos calcular ROI, atualizar processes com os resultados
await supabase
  .from('processes')
  .update({
    time_spent_hours: improvedHours || form.improved_time_hours,
    cost_monthly: improvedCost || form.improved_cost_monthly,
    volume_executions: form.improved_volume,
    people_involved: improvedMembers.length || form.improved_people_involved,
    // Adicionar campos de ROI
    last_roi_percentage: roiData.results.roi_percentage,
    last_cost_saved_monthly: roiData.results.cost_saved_monthly,
    last_time_saved_hours: roiData.results.time_saved_hours,
    last_improvement_date: new Date().toISOString()
  })
  .eq('id', processId);
```

### 3. Exibir Valor de Melhoria no Card da Sprint

Em `EquipeSprints.tsx`, buscar melhorias associadas a cada sprint e exibir economia total:

```text
+----------------------------------------------------+
| Sprint 1 - Janeiro                      [Ativa]    |
| Projeto: Automacao Fiscal                          |
|                                                    |
| [Progresso: ████████░░ 80%]                        |
|                                                    |
| 12 tarefas • 40h estimadas                         |
|                                                    |
| ┌─────────────────────────────────────────────┐    |
| │ Impacto Digital:                            │    |
| │ 💰 R$ 2.500/mes economizados                │    |
| │ ⏱️ 15h/mes liberadas                         │    |
| └─────────────────────────────────────────────┘    |
+----------------------------------------------------+
```

### 4. Adicionar Variaveis de Economia no Calculo

Expandir o formulario e edge function para incluir:

```text
┌─────────────────────────────────────────────────────────┐
│ Economias Adicionais (opcional)                         │
│                                                         │
│ Economia com sistemas (licencas, etc):                  │
│ [R$ ________/mes]                                       │
│                                                         │
│ Economia com construcao propria (one-time):             │
│ [R$ ________]                                           │
│                                                         │
│ Outras economias recorrentes:                           │
│ [R$ ________/mes]                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Secao Tecnica

### Migracao de Banco de Dados

```sql
-- Adicionar campos de ROI calculado na tabela processes
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS last_roi_percentage numeric,
ADD COLUMN IF NOT EXISTS last_cost_saved_monthly numeric,
ADD COLUMN IF NOT EXISTS last_time_saved_hours numeric,
ADD COLUMN IF NOT EXISTS last_improvement_date timestamptz;

-- Adicionar campos de economia adicional em process_improvements
ALTER TABLE public.process_improvements
ADD COLUMN IF NOT EXISTS system_savings_monthly numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS build_vs_buy_savings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_savings_monthly numeric DEFAULT 0;
```

### Arquivos a Modificar

1. **src/components/equipe/ProcessImprovementModal.tsx**
   - Adicionar campos para economias adicionais (sistemas, construcao propria, outros)
   - Atualizar handleSave() para salvar ROI calculado na tabela processes
   - Calcular economia total incluindo todas as variaveis

2. **supabase/functions/calculate-process-roi/index.ts**
   - Considerar system_savings_monthly e other_savings_monthly no calculo
   - Incluir build_vs_buy_savings como economia one-time no ROI

3. **src/pages/equipe/EquipeSprints.tsx**
   - Buscar melhorias associadas a cada sprint (via sprint_deliverable_id)
   - Exibir badge com economia total quando houver melhorias

4. **src/components/equipe/ImpactDashboard.tsx**
   - Ja funciona corretamente, apenas garantir atualizacao automatica

### Alteracoes no ProcessImprovementModal

Adicionar ao formulario:

```typescript
const [form, setForm] = useState({
  // ... campos existentes
  system_savings_monthly: 0,     // Economia com licencas/sistemas
  build_vs_buy_savings: 0,       // Economia unica por construir vs comprar
  other_savings_monthly: 0       // Outras economias recorrentes
});
```

Adicionar secao no UI:

```tsx
<Card className="border-blue-200 bg-blue-50/50">
  <CardContent className="pt-4">
    <h4 className="font-semibold text-blue-700 mb-4">Economias Adicionais</h4>
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Economia com Sistemas</Label>
        <Input
          type="number"
          placeholder="R$/mes"
          value={form.system_savings_monthly}
          onChange={(e) => setForm({...form, system_savings_monthly: parseFloat(e.target.value) || 0})}
        />
        <p className="text-xs text-muted-foreground">Licencas, softwares, etc</p>
      </div>
      <div className="space-y-2">
        <Label>Construir vs Comprar</Label>
        <Input
          type="number"
          placeholder="R$ (unico)"
          value={form.build_vs_buy_savings}
          onChange={(e) => setForm({...form, build_vs_buy_savings: parseFloat(e.target.value) || 0})}
        />
        <p className="text-xs text-muted-foreground">Economia por desenvolver internamente</p>
      </div>
      <div className="space-y-2">
        <Label>Outras Economias</Label>
        <Input
          type="number"
          placeholder="R$/mes"
          value={form.other_savings_monthly}
          onChange={(e) => setForm({...form, other_savings_monthly: parseFloat(e.target.value) || 0})}
        />
        <p className="text-xs text-muted-foreground">Outros ganhos recorrentes</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Alteracoes na Edge Function

Atualizar `calculate-process-roi/index.ts`:

```typescript
// Buscar dados incluindo economias adicionais
const improvement = await supabase
  .from("process_improvements")
  .select("*, system_savings_monthly, build_vs_buy_savings, other_savings_monthly")
  .eq("id", improvement_id)
  .single();

// Calcular economia total mensal
const laborSavingsMonthly = baselineCost - improvedCost;
const systemSavings = improvement.system_savings_monthly || 0;
const otherSavings = improvement.other_savings_monthly || 0;
const totalMonthlySavings = laborSavingsMonthly + systemSavings + otherSavings;

// Calcular ROI considerando economias unicas
const buildVsBuySavings = improvement.build_vs_buy_savings || 0;
const annualSavings = (totalMonthlySavings * 12) + buildVsBuySavings;

const roiPercentage = implementationCost > 0 
  ? ((annualSavings - implementationCost) / implementationCost) * 100 
  : 0;

// Atualizar com economia total
await supabase
  .from("process_improvements")
  .update({
    cost_saved_monthly: totalMonthlySavings, // Total incluindo sistemas
    // ... outros campos
  });
```

### Alteracoes no EquipeSprints

Adicionar busca de impacto por sprint:

```typescript
interface SprintImpact {
  sprintId: string;
  totalCostSaved: number;
  totalTimeSaved: number;
  improvementsCount: number;
}

// Na funcao fetchData()
const fetchSprintImpacts = async (sprintIds: string[]) => {
  const { data: improvements } = await supabase
    .from('process_improvements')
    .select('sprint_deliverable_id, cost_saved_monthly, time_saved_hours')
    .eq('evaluation_status', 'completed');

  // Buscar sprint_id de cada deliverable
  const { data: deliverables } = await supabase
    .from('sprint_deliverables')
    .select('id, sprint_id')
    .in('id', improvements?.map(i => i.sprint_deliverable_id).filter(Boolean) || []);

  // Agregar por sprint
  const impactMap: Record<string, SprintImpact> = {};
  // ... logica de agregacao
  
  return impactMap;
};
```

Exibir no card da sprint:

```tsx
{sprintImpact && sprintImpact.totalCostSaved > 0 && (
  <div className="mt-3 flex items-center gap-4 px-3 py-2 bg-green-50 rounded-lg">
    <Badge className="bg-green-100 text-green-700 border-0">
      <DollarSign className="h-3 w-3 mr-1" />
      R$ {sprintImpact.totalCostSaved.toLocaleString('pt-BR')}/mes
    </Badge>
    <Badge variant="outline" className="border-blue-300 text-blue-600">
      <Clock className="h-3 w-3 mr-1" />
      {sprintImpact.totalTimeSaved}h liberadas
    </Badge>
    <span className="text-xs text-muted-foreground">
      {sprintImpact.improvementsCount} melhoria(s)
    </span>
  </div>
)}
```

---

## Resumo das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| Banco de dados | Adicionar campos de ROI em `processes` e economias extras em `process_improvements` |
| ProcessImprovementModal | Adicionar campos de economia adicional e salvar ROI no processo |
| calculate-process-roi | Incluir economias de sistemas e build vs buy no calculo |
| EquipeSprints | Buscar e exibir impacto agregado por sprint |
| ImpactDashboard | Ja funciona - sera atualizado automaticamente |

## Fluxo Completo Apos Implementacao

```text
1. Usuario cria melhoria em ProcessImprovementModal
   ↓
2. Preenche membros ANTES e DEPOIS + economias adicionais
   ↓
3. Salva → Chama edge function calculate-process-roi
   ↓
4. Edge function calcula:
   - Economia de mao de obra (horas × custo/hora)
   - Economia de sistemas (licencas)
   - Economia unica (build vs buy)
   - FTE liberados
   - ROI percentual
   ↓
5. Salva em process_improvements + atualiza processes
   ↓
6. ImpactDashboard atualiza automaticamente (query em tempo real)
   ↓
7. Sprint cards mostram economia total das melhorias vinculadas
```
