
# Plano: Melhorias na Ferramenta de Controle PERDCOMP

## Visao Geral

Este plano implementa tres melhorias principais:
1. Expansao das opcoes de situacao do PER
2. Sistema de retificacao de processos
3. Filtragem inteligente para mostrar apenas processos vigentes

---

## 1. Novo Campo: Situacao do PER

### Alteracao no `PerDetailModal.tsx`

Substituir a lista atual de situacoes (`Deferido`, `Analisado`, `Em análise`) pela lista completa:

| Situacao |
|----------|
| Analise concluida |
| Analise preliminar disponibilizada |
| Cancelado |
| Contribuinte intimado |
| Despacho decisorio emitido |
| Em analise |
| Em discussao administrativa - CARF |
| Em discussao administrativa - CSRF |
| Em discussao administrativa - DRJ |
| Homologado |
| Nao admitido |
| Pedido de cancelamento deferido |
| PER deferido |
| Retificado |

Atualizar tambem o mapeamento de cores para incluir as novas situacoes com cores apropriadas.

---

## 2. Logica de Retificacao (Criacao de PER)

### Alteracao no `PerFormModal.tsx`

**Novos campos no formulario:**

| Campo | Tipo | Comportamento |
|-------|------|---------------|
| Tipo de Declaracao | Select | Opcoes: "Original" (padrao) e "Retificadora" |
| Processo Retificado | Select (condicional) | Aparece apenas quando "Retificadora" esta selecionado. Lista todos os `numero_processo_per` existentes do contribuinte |

**Logica de salvamento:**
- Sempre cria uma nova linha na tabela `per`
- Se "Retificadora": grava o numero do processo antigo na coluna `nr_proc_ret`
- Se "Original": deixa `nr_proc_ret` como `null`

**Alteracoes tecnicas:**
1. Adicionar campo `nr_proc_ret` ao schema zod (opcional)
2. Criar estado para controlar tipo de declaracao
3. Buscar PERs existentes para o dropdown condicional
4. Passar `nr_proc_ret` na mutation de criacao e sincronizacao

---

## 3. Filtragem Inteligente da Tabela

### Alteracao no `ControlePerdcomp.tsx`

**Regra:** Ocultar processos que aparecem na coluna `nr_proc_ret` de outro registro.

**Implementacao:**
1. Apos buscar os dados do `perData`, criar um Set com todos os valores de `nr_proc_ret` (processos retificados)
2. Filtrar a lista para excluir processos cujo `numero_processo_per` esta nesse Set
3. Resultado: mostrar apenas versoes mais recentes (retificadores) ou originais nunca retificados

```text
Exemplo:
- PER-001 (original) -> nr_proc_ret = null
- PER-002 (retifica PER-001) -> nr_proc_ret = "PER-001"

Tabela mostra apenas: PER-002
(PER-001 fica oculto pois aparece no nr_proc_ret de PER-002)
```

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Expandir `SITUACAO_OPTIONS` e `SITUACAO_COLORS` com 14 novas situacoes |
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Adicionar campos de tipo de declaracao e PER retificado |
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Implementar filtro de processos retificados |

---

## Detalhes Tecnicos

### Schema Zod atualizado (PerFormModal)

```typescript
const perSchema = z.object({
  numero_processo_per: z.string().min(1, 'Numero do processo e obrigatorio'),
  id_contribuinte: z.string().min(1, 'Contribuinte e obrigatorio'),
  exercicio: z.coerce.number().min(2000).max(2100),
  tri_exercicio: z.coerce.number().min(1).max(4),
  dt_solicitada: z.string().min(1, 'Data e obrigatoria'),
  tp_credito: z.string().min(1, 'Tipo de credito e obrigatorio'),
  vlr_credito: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_proc_ret: z.string().nullable().optional(),
});
```

### Novas situacoes com cores

```typescript
const SITUACAO_OPTIONS = [
  { value: 'Analise concluida', label: 'Analise concluida' },
  { value: 'Analise preliminar disponibilizada', label: 'Analise preliminar disponibilizada' },
  { value: 'Cancelado', label: 'Cancelado' },
  { value: 'Contribuinte intimado', label: 'Contribuinte intimado' },
  { value: 'Despacho decisorio emitido', label: 'Despacho decisorio emitido' },
  { value: 'Em analise', label: 'Em analise' },
  { value: 'Em discussao administrativa - CARF', label: 'Em discussao administrativa - CARF' },
  { value: 'Em discussao administrativa - CSRF', label: 'Em discussao administrativa - CSRF' },
  { value: 'Em discussao administrativa - DRJ', label: 'Em discussao administrativa - DRJ' },
  { value: 'Homologado', label: 'Homologado' },
  { value: 'Nao admitido', label: 'Nao admitido' },
  { value: 'Pedido de cancelamento deferido', label: 'Pedido de cancelamento deferido' },
  { value: 'PER deferido', label: 'PER deferido' },
  { value: 'Retificado', label: 'Retificado' },
];

const SITUACAO_COLORS: Record<string, string> = {
  'Analise concluida': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Analise preliminar disponibilizada': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Contribuinte intimado': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Despacho decisorio emitido': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Em analise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Em discussao administrativa - CARF': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - CSRF': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - DRJ': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Homologado': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Nao admitido': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Pedido de cancelamento deferido': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  'PER deferido': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Retificado': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};
```

### Logica de filtro (ControlePerdcomp)

```typescript
// Criar set de processos retificados
const retificadosSet = new Set(
  perData
    .filter(item => item.nr_proc_ret)
    .map(item => item.nr_proc_ret)
);

// Filtrar para mostrar apenas processos vigentes
const processosVigentes = perData.filter(
  item => !retificadosSet.has(item.numero_processo_per)
);
```

### Novo campo condicional no PerFormModal

```typescript
// Estado para tipo de declaracao
const [tipoDeclaracao, setTipoDeclaracao] = useState<'original' | 'retificadora'>('original');

// Query para buscar PERs existentes
const { data: persExistentes = [] } = useQuery({
  queryKey: ['pers-existentes', contribuinteId],
  queryFn: async () => {
    if (!contribuinteId) return [];
    const { data, error } = await supabase
      .from('per')
      .select('numero_processo_per')
      .eq('id_contribuinte', contribuinteId)
      .order('exercicio', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: !!contribuinteId && !isEditing,
});
```

---

## Banco de Dados

A coluna `nr_proc_ret` ja existe na tabela `per` com as seguintes caracteristicas:
- Tipo: `VARCHAR`
- Nullable: `YES`
- Foreign Key: referencia `per.numero_processo_per`

Nenhuma migracao de banco de dados e necessaria.

---

## Resultado Esperado

1. **Situacoes expandidas**: O usuario podera selecionar entre 14 situacoes diferentes ao atualizar o status de um PER
2. **Retificacao funcional**: Ao criar um novo PER, o usuario podera marca-lo como retificadora e selecionar qual processo esta sendo retificado
3. **Tabela limpa**: A tabela principal exibira apenas processos vigentes, ocultando automaticamente os que ja foram retificados
