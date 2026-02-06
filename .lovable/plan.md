
# Plano: Retificacao de DCOMPs

## Visao Geral

Aplicar a mesma logica de retificacao implementada para PER, agora para DCOMPs:
1. Nova coluna `nr_dcomp_ret` na tabela `dcomp`
2. Tipo de declaracao (Original/Retificadora) no formulario de criacao
3. Filtragem inteligente para mostrar apenas DCOMPs vigentes

---

## 1. Migracao de Banco de Dados

### Adicionar coluna `nr_dcomp_ret` na tabela `dcomp`

```sql
ALTER TABLE dcomp 
ADD COLUMN nr_dcomp_ret character varying REFERENCES dcomp(nr_documento);
```

A coluna tera:
- Tipo: `VARCHAR`
- Nullable: `YES`
- Foreign Key: referencia `dcomp.nr_documento`

---

## 2. Atualizacao do DcompFormModal.tsx

### Novos campos no formulario

| Campo | Tipo | Comportamento |
|-------|------|---------------|
| Tipo de Declaracao | Select | Opcoes: "Original" (padrao) e "Retificadora" |
| DCOMP Retificado | Select (condicional) | Aparece apenas quando "Retificadora" esta selecionado. Lista DCOMPs existentes vinculados ao mesmo PER |

### Alteracoes tecnicas

1. Adicionar campo `nr_dcomp_ret` ao schema Zod:
```typescript
const dcompSchema = z.object({
  // ... campos existentes
  nr_dcomp_ret: z.string().nullable().optional(),
});
```

2. Adicionar estado para tipo de declaracao:
```typescript
const [tipoDeclaracao, setTipoDeclaracao] = useState<'original' | 'retificadora'>('original');
```

3. Query para buscar DCOMPs existentes do mesmo PER:
```typescript
const { data: dcompsExistentes = [] } = useQuery({
  queryKey: ['dcomps-existentes', preSelectedPer],
  queryFn: async () => {
    if (!preSelectedPer) return [];
    const { data, error } = await supabase
      .from('dcomp')
      .select('nr_documento, mes_ano_exercicio, imposto')
      .eq('nr_per_orig', preSelectedPer)
      .order('dt_envio', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: !!preSelectedPer && !isEditing,
});
```

4. Campo condicional no formulario:
```tsx
{/* Tipo de Declaracao */}
<FormItem>
  <FormLabel>Tipo de Declaracao</FormLabel>
  <Select value={tipoDeclaracao} onValueChange={(v) => setTipoDeclaracao(v as 'original' | 'retificadora')}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="original">Original</SelectItem>
      <SelectItem value="retificadora">Retificadora</SelectItem>
    </SelectContent>
  </Select>
</FormItem>

{/* Seletor de DCOMP retificado (condicional) */}
{tipoDeclaracao === 'retificadora' && (
  <FormField
    control={form.control}
    name="nr_dcomp_ret"
    render={({ field }) => (
      <FormItem>
        <FormLabel>DCOMP Retificado</FormLabel>
        <Select onValueChange={field.onChange} value={field.value || ''}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o DCOMP a retificar" />
          </SelectTrigger>
          <SelectContent>
            {dcompsExistentes.map((dcomp) => (
              <SelectItem key={dcomp.nr_documento} value={dcomp.nr_documento}>
                {dcomp.nr_documento} ({dcomp.imposto})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

5. Atualizar mutation para incluir `nr_dcomp_ret`:
```typescript
const record = {
  // ... outros campos
  nr_dcomp_ret: tipoDeclaracao === 'retificadora' ? data.nr_dcomp_ret : null,
};
```

---

## 3. Atualizacao do PerDetailModal.tsx

### Filtragem inteligente de DCOMPs

Aplicar a mesma logica do PER: ocultar DCOMPs que aparecem na coluna `nr_dcomp_ret` de outro registro.

```typescript
// Criar set de DCOMPs retificados
const dcompsRetificadosSet = useMemo(() => {
  return new Set(
    dcomps
      .filter(d => d.nr_dcomp_ret)
      .map(d => d.nr_dcomp_ret)
  );
}, [dcomps]);

// Filtrar para mostrar apenas DCOMPs vigentes
const dcompsVigentes = useMemo(() => {
  return dcomps.filter(d => !dcompsRetificadosSet.has(d.nr_documento));
}, [dcomps, dcompsRetificadosSet]);
```

### Indicador visual de DCOMP retificadora

Na tabela de DCOMPs, adicionar indicador quando o DCOMP retifica outro:

```tsx
<TableCell className="font-medium">
  {dcomp.nr_documento}
  {dcomp.nr_dcomp_ret && (
    <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
      (Retifica: {dcomp.nr_dcomp_ret})
    </span>
  )}
</TableCell>
```

---

## 4. Atualizacao do syncPerdcomp.ts

Adicionar o novo campo na interface `DcompSync`:

```typescript
interface DcompSync {
  nr_documento: string;
  nr_per_orig: string;
  mes_ano_exercicio: string;
  dt_envio: string;
  imposto: string;
  tp_credito: string;
  vlr_compensado: number;
  nr_dcomp_ret?: string | null; // NOVO
}
```

---

## 5. Atualizacao da Edge Function sync-perdcomp

Adicionar o campo `nr_dcomp_ret` na interface `DcompRecord`:

```typescript
interface DcompRecord {
  nr_documento: string
  nr_per_orig: string
  mes_ano_exercicio: string
  dt_envio: string
  imposto: string
  tp_credito: string
  vlr_compensado: number
  nr_dcomp_ret?: string | null // NOVO
}
```

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| *Migracao SQL* | Adicionar coluna `nr_dcomp_ret` na tabela `dcomp` |
| `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` | Adicionar tipo de declaracao e seletor de DCOMP retificado |
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Filtrar DCOMPs retificados e exibir indicador |
| `src/lib/syncPerdcomp.ts` | Adicionar campo `nr_dcomp_ret` na interface |
| `supabase/functions/sync-perdcomp/index.ts` | Adicionar campo `nr_dcomp_ret` na interface |

---

## Resultado Visual

### Formulario de Criacao de DCOMP

```text
┌─────────────────────────────────────────────┐
│  Novo DCOMP                                 │
├─────────────────────────────────────────────┤
│  Numero do Documento: [_______________]     │
│  PER de Origem: [Dropdown]                  │
│                                             │
│  Tipo de Declaracao:                        │
│  ○ Original  ● Retificadora                 │
│                                             │
│  DCOMP Retificado: [Dropdown]   ← NOVO      │
│                                             │
│  Mes/Ano Exercicio: [___]                   │
│  Data de Envio: [___]                       │
│  ... demais campos ...                      │
└─────────────────────────────────────────────┘
```

### Tabela de DCOMPs no PerDetailModal

```text
| Nr Documento          | Mes/Ano  | Data Envio | Imposto | ... |
|-----------------------|----------|------------|---------|-----|
| DOC-002 (Retifica: DOC-001) | 2024-01 | 15/02/2024 | PIS     | ... |  ← DOC-002 aparece
| (DOC-001 oculto, pois foi retificado)                                |
```

---

## Fluxo de Dados

```text
Usuario cria DCOMP Retificadora
         │
         ▼
┌────────────────────────┐
│  Seleciona "Retificadora" │
│  Escolhe DCOMP original   │
└────────────┬───────────┘
             │
             ▼
┌────────────────────────┐
│  Salva com nr_dcomp_ret │
│  = nr_documento original │
└────────────┬───────────┘
             │
             ▼
┌────────────────────────┐
│  Sync para DW com novo  │
│  campo nr_dcomp_ret     │
└────────────┬───────────┘
             │
             ▼
┌────────────────────────┐
│  Tabela filtra e exibe  │
│  apenas DCOMP vigente   │
└────────────────────────┘
```
