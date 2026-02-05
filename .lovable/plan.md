
# Plano: Eliminar Redundancia nos Campos de ROI/Melhoria de Processos

## Problema Identificado

Atualmente existe **duplicidade de dados** entre:

1. **Tabela `processes`** (campos de baseline):
   - `time_spent_hours` - Tempo gasto (horas)
   - `time_spent_frequency` - Frequência do tempo
   - `cost_monthly` - Custo mensal
   - `volume_executions` - Volume de execuções
   - `people_involved` - Pessoas envolvidas
   - `complexity_level` - Complexidade

2. **Tabela `process_improvements`** (campos de baseline duplicados):
   - `baseline_time_hours` - Mesmo que time_spent_hours
   - `baseline_cost_monthly` - Mesmo que cost_monthly
   - `baseline_volume` - Mesmo que volume_executions
   - `baseline_people_involved` - Mesmo que people_involved

### Fluxo Atual (Redundante):
```text
1. Usuário edita processo e preenche "Performance Baseline"
   → Salva em processes.time_spent_hours, cost_monthly, etc.

2. Usuário clica "Avaliar Melhoria"
   → Modal abre com dados duplicados de "ANTES"
   → Salva novamente em process_improvements.baseline_*
```

### Problema:
- Dados de baseline armazenados em 2 lugares
- Se atualizar em um, o outro fica desatualizado
- Formulário de edição do processo tem seção "Performance Baseline" E modal de melhoria tem seção "ANTES (Baseline)"

## Solucao Proposta

### Estrategia: Usar `processes` como fonte unica de baseline

1. **Remover campos de baseline do formulário de edição do processo**
   - O baseline será preenchido APENAS no modal de melhoria
   - Campos na tabela `processes` continuam existindo mas são preenchidos via melhoria

2. **Reorganizar o fluxo de dados**:
   - Campos de baseline (ANTES) ficam na tabela `processes`
   - Modal de melhoria lê baseline de `processes` e salva melhorias em `process_improvements`
   - Ao salvar uma melhoria, atualiza `processes` com os dados "DEPOIS" como novo baseline

### Alteracoes no Formulario de Edicao do Processo

**Remover** a seção "Performance Baseline (Antes da Melhoria)" do formulário de edição em `EquipeProcessos.tsx`:

```text
ANTES (remover):
┌─────────────────────────────────────────────────┐
│ Performance Baseline (Antes da Melhoria)        │
│ ┌─────────────┐ ┌─────────────┐                 │
│ │ Tempo Gasto │ │ Frequência  │                 │
│ └─────────────┘ └─────────────┘                 │
│ ┌─────────────┐ ┌─────────────┐                 │
│ │ Custo Mensal│ │ Volume Exec │                 │
│ └─────────────┘ └─────────────┘                 │
│ ┌─────────────┐ ┌─────────────┐                 │
│ │ Pessoas     │ │ Complexidade│                 │
│ └─────────────┘ └─────────────┘                 │
└─────────────────────────────────────────────────┘

DEPOIS (simplificado):
O formulário de edição terá apenas campos descritivos:
- Nome, Descrição, Área, Fase, Prioridade
- Frequência, Volume Mensal, Impacto Financeiro
```

### Alteracoes no Modal de Melhoria

O `ProcessImprovementModal` permanece como a ÚNICA forma de gerenciar performance/ROI:

```text
┌─────────────────────────────────────────────────────┐
│ Avaliar Melhoria do Processo                    [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Descrição da Melhoria: [________________________]   │
│                                                     │
│ ┌───────────────────┐  ┌───────────────────┐        │
│ │  ANTES (Baseline) │  │  DEPOIS (Atual)   │        │
│ │                   │  │                   │        │
│ │ [Membros + Horas] │  │ [Membros + Horas] │        │
│ │ R$ 5.000/mês      │  │ R$ 2.000/mês      │        │
│ └───────────────────┘  └───────────────────┘        │
│                                                     │
│ [Cancelar]                    [Calcular e Salvar]   │
└─────────────────────────────────────────────────────┘
```

### Logica ao Salvar Melhoria

Quando uma melhoria for salva:
1. Registrar os dados de "ANTES" e "DEPOIS" em `process_improvements`
2. Atualizar a tabela `processes` com os valores atuais (DEPOIS) como novo baseline para futuras comparacoes
3. Calcular ROI normalmente

## Secao Tecnica

### Arquivos a Modificar

1. **src/pages/equipe/EquipeProcessos.tsx**
   - Remover seção "Performance Baseline" do formulário de edição (linhas 1090-1192)
   - Remover campos do `editForm` state: `time_spent_hours`, `time_spent_frequency`, `cost_monthly`, `volume_executions`, `people_involved`, `complexity_level`
   - Remover esses campos do `startEditing()` e `saveProcess()`

2. **src/components/equipe/ProcessImprovementModal.tsx**
   - Ao salvar, atualizar também a tabela `processes` com os dados "melhorados" como novo baseline
   - Adicionar label explicativo: "Os dados de 'DEPOIS' serão salvos como o novo baseline do processo"

### Campos a Remover do EditForm

```typescript
// ANTES (estado atual)
const [editForm, setEditForm] = useState({
  name: '',
  description: '',
  area: '',
  stage: '',
  priority: '',
  frequency: '',
  volume_month: '',
  financial_impact: '',
  // ❌ Remover estes campos:
  time_spent_hours: '',
  time_spent_frequency: '',
  cost_monthly: '',
  volume_executions: '',
  people_involved: '',
  complexity_level: ''
});

// DEPOIS (simplificado)
const [editForm, setEditForm] = useState({
  name: '',
  description: '',
  area: '',
  stage: '',
  priority: '',
  frequency: '',
  volume_month: '',
  financial_impact: ''
});
```

### Alteracao no ProcessImprovementModal

Adicionar ao `handleSave()`:

```typescript
// Após salvar a melhoria, atualizar processes com novo baseline
await supabase
  .from('processes')
  .update({
    time_spent_hours: improvedHours || form.improved_time_hours,
    cost_monthly: improvedCost || form.improved_cost_monthly,
    volume_executions: form.improved_volume,
    people_involved: improvedMembers.length || form.improved_people_involved
  })
  .eq('id', processId);
```

## Resumo das Alteracoes

| Arquivo | Alteração |
|---------|-----------|
| `EquipeProcessos.tsx` | Remover seção "Performance Baseline" do formulário de edição |
| `ProcessImprovementModal.tsx` | Atualizar `processes` com dados "DEPOIS" como novo baseline |

## Beneficios

1. **Elimina duplicidade**: Baseline só é gerenciado em um lugar (modal de melhoria)
2. **Fluxo mais claro**: Usuário entende que performance é avaliada via "Avaliar Melhoria"
3. **Dados sempre atualizados**: Após cada melhoria, o baseline é atualizado automaticamente
4. **Formulário de edição mais simples**: Foco apenas em dados descritivos do processo
