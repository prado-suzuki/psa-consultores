

# Plano: Substituir Caixa de Entrada por Visao de Minhas Demandas

## Objetivo

Substituir o conceito de "Caixa de Entrada" por uma visao inteligente das demandas do usuario logado, com organizacao por prioridade, projeto e data, incluindo alertas e informacoes contextuais. Habilitar edicao para criadores de demandas.

---

## Mudancas no Menu Lateral

```text
Antes:                          Depois:
- Dashboard                     - Dashboard
- Demandas                      - Demandas
  - Caixa de Entrada              - Minhas Demandas   <-- NOVO
  - Pacotes de Trabalho           - Pacotes de Trabalho
  - Clientes                      - Clientes
```

---

## Novo Componente: Minhas Demandas

Vista personalizada para o usuario logado mostrando:

### Secao 1: Alertas (Cards no Topo)

```text
+----------------+  +----------------+  +----------------+
| ⚠ ATRASADAS    |  | 📅 PARA HOJE   |  | 📋 ALTA PRIO   |
|      3         |  |      5         |  |      2         |
+----------------+  +----------------+  +----------------+
```

### Secao 2: Lista Agrupada de Demandas

Organizacao com grupos expansiveis:

```text
▼ PRIORIDADE ALTA (2)
  +--------------------------------------------------------+
  | #45 | Analise ICMS - Projeto CCO | Em progresso | Hoje |
  | #52 | Revisao PIS/COFINS - PQR   | Agendado     | Amanh |
  +--------------------------------------------------------+

▼ ATRASADAS (3)
  +--------------------------------------------------------+
  | #31 | Levantamento fiscal | Em progresso | 28/01 (-3d) |
  ...

▼ PARA ESTA SEMANA (4)
  +--------------------------------------------------------+
  ...
```

### Filtros Rapidos

```text
[Atribuidas a mim ▾] [Criadas por mim ▾] [Da minha area ▾]
```

---

## Regras de Visibilidade e Edicao

| Condicao | Pode Ver | Pode Editar |
|----------|----------|-------------|
| Demanda atribuida a mim | Sim | Nao (apenas status) |
| Demanda criada por mim | Sim | Sim |
| Demanda da minha area (fiscal) | Sim | Nao |
| Sou responsavel | Sim | Sim |

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/equipe/fiscal/FiscalSidebar.tsx` | Renomear "Caixa de Entrada" para "Minhas Demandas" |
| `src/pages/equipe/fiscal/FiscalDemandasInbox.tsx` | Atualizar titulo e componente |
| `src/components/equipe/fiscal/FiscalInbox.tsx` | Substituir completamente por novo componente |

## Novos Componentes

| Componente | Descricao |
|------------|-----------|
| `src/components/equipe/fiscal/MinhasDemandas.tsx` | Lista inteligente de demandas do usuario |
| `src/components/equipe/fiscal/DemandaAlertCards.tsx` | Cards de alerta (atrasadas, hoje, alta prioridade) |

---

## Detalhamento: MinhasDemandas.tsx

### Queries Necessarias

```typescript
// Buscar demandas onde usuario e:
// 1. Atribuido (assigned_to = user.id)
// 2. Responsavel (responsible = user.id)  
// 3. Criador (created_by = user.id)
// 4. Da area fiscal

const filters = {
  area: ['fiscal'],
  // Combinar com OR para assigned_to, responsible, created_by
};
```

### Agrupamento Dinamico

```typescript
const groupedData = useMemo(() => {
  const today = getTodayBrazil();
  const groups = {
    atrasadas: [],      // due_date < today && status != 'concluido'
    alta_prioridade: [], // priority === 'alta' && status != 'concluido'
    para_hoje: [],       // due_date === today
    esta_semana: [],     // due_date dentro da semana
    proximas: [],        // restantes
  };
  
  workPackages.forEach(wp => {
    // Classificar em grupos
  });
  
  return groups;
}, [workPackages]);
```

### Permissao de Edicao

```typescript
const canEdit = (wp: WorkPackage) => {
  return wp.created_by === user?.id || wp.responsible === user?.id;
};
```

---

## Detalhamento: DemandaAlertCards.tsx

Cards informativos no topo da pagina:

```typescript
const alertCards = [
  {
    icon: AlertTriangle,
    label: 'Atrasadas',
    count: atrasadas.length,
    color: 'red',
    onClick: () => scrollToGroup('atrasadas'),
  },
  {
    icon: Calendar,
    label: 'Para Hoje',
    count: paraHoje.length,
    color: 'amber',
    onClick: () => scrollToGroup('para_hoje'),
  },
  {
    icon: ArrowUp,
    label: 'Alta Prioridade',
    count: altaPrioridade.length,
    color: 'orange',
    onClick: () => scrollToGroup('alta_prioridade'),
  },
];
```

---

## Estrutura Visual Final

```text
+------------------------------------------------------------------+
| FISCAL - Minhas Demandas                                         |
|------------------------------------------------------------------|
| Mostrando demandas atribuidas, criadas ou sob sua responsabilid. |
|                                                                  |
| +---------------+ +---------------+ +---------------+            |
| | ⚠ Atrasadas  | | 📅 Hoje       | | 🔴 Alta prio  |            |
| |      3       | |      2        | |      1        |            |
| +---------------+ +---------------+ +---------------+            |
|                                                                  |
| [Atribuidas a mim v] [Criadas por mim v] [Da minha area v]       |
|                                                                  |
| ▼ ATRASADAS (3)                                                  |
| +--------------------------------------------------------------+ |
| | #31 Levantamento fiscal   | TAREFA | Em prog | 28/01 | [Abrir]| |
| +--------------------------------------------------------------+ |
|                                                                  |
| ▼ ALTA PRIORIDADE (1)                                            |
| +--------------------------------------------------------------+ |
| | #45 Analise ICMS - CCO    | FASE   | Agend   | 02/02 | [Edit]| |
| +--------------------------------------------------------------+ |
|                                                                  |
| ▼ PARA ESTA SEMANA (4)                                           |
| ...                                                              |
+------------------------------------------------------------------+
```

---

## Sheet de Detalhes com Botao Editar

Atualizar o `WorkPackageSheet.tsx` para:

1. Receber callback `onEdit` quando usuario pode editar
2. Mostrar botao "Editar" condicional
3. Integrar com `WorkPackageForm` para edicao

```typescript
// WorkPackageSheet.tsx
const canEdit = workPackage.created_by === user?.id || workPackage.responsible === user?.id;

{canEdit && (
  <Button onClick={() => onEdit?.(workPackage.id)}>
    <Edit className="h-4 w-4 mr-2" />
    Editar
  </Button>
)}
```

---

## Secao Tecnica

### Hook para Minhas Demandas

Criar filtro especial que combina criterios com OR:

```typescript
// useMyWorkPackages.ts
export function useMyWorkPackages(userId: string) {
  return useQuery({
    queryKey: ['my-work-packages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_work_packages')
        .select(`
          *,
          assigned_to_profile:profiles!project_work_packages_assigned_to_fkey(...),
          ...
        `)
        .eq('area', 'fiscal')
        .or(`assigned_to.eq.${userId},responsible.eq.${userId},created_by.eq.${userId}`)
        .neq('status', 'concluido')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

### Rotas

Manter mesma rota (`/equipe/projetos/fiscal/demandas/inbox`) mas renomear visualmente para "Minhas Demandas".

---

## Resumo das Entregas

1. **FiscalSidebar** - Renomear "Caixa de Entrada" para "Minhas Demandas"
2. **MinhasDemandas.tsx** - Novo componente com:
   - Cards de alerta (Atrasadas, Hoje, Alta prioridade)
   - Filtros rapidos (Atribuidas, Criadas, Da area)
   - Lista agrupada por categoria
   - Indicador de permissao de edicao
3. **DemandaAlertCards.tsx** - Cards de resumo no topo
4. **WorkPackageSheet.tsx** - Adicionar botao Editar condicional
5. **FiscalDemandasInbox.tsx** - Atualizar titulo e descricao
6. **Integracao com WorkPackageForm** - Modal de edicao para usuarios autorizados

