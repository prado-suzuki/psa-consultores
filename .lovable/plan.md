

## Habilitar edição inline em D100, F100, F120 e F130

### Arquivos alterados: 6

---

### 1. Tipos — `src/types/correcoesSped.ts`

**D100Item**: Adicionar `_originalSnapshot: D100Item` (flat, pois o item já é achatado no hook). O snapshot captura o estado original dos campos editáveis para diff.

**F100Item**: Adicionar `_originalSnapshot: RegF100` (o sub-objeto `F100` contém todos os campos editáveis).

**F120Item**: Adicionar `_originalSnapshot: F120Reg` (análogo — edição acontece dentro do nó `F120`).

**F130Item**: Adicionar `_originalSnapshot: F130Reg` (análogo — edição dentro do nó `F130`).

---

### 2. Hooks — `src/hooks/useCorrecoesSped.ts`

**useCorrecoesD100**: Expandir o `queryFn` para:
- Guardar `_originalSnapshot` como cópia do item flat antes de aplicar correções
- Buscar correções ativas via `batchedIn` com `registro_tipo = 'D100'`
- Aplicar snapshot corrigido sobre o item (merge), preservando `_originalSnapshot`

**useCorrecoesF100**: Substituir `useCorrecoesQuery` por `useQuery` customizado para:
- Guardar `_originalSnapshot: { ...entry.F100 }` em cada item
- Buscar correções ativas com `registro_tipo = 'F100'`
- Aplicar snapshot corrigido sobre o sub-objeto `F100`

**useCorrecoesF120** e **useCorrecoesF130**: Mesma transformação do F100, com `registro_tipo = 'F120'`/`'F130'` e snapshot do sub-objeto `F120`/`F130`.

---

### 3. Componentes — editar 4 arquivos

Para cada um dos 4 componentes (TabD100, TabF100, TabF120, TabF130), aplicar o mesmo padrão do TabC170:

**Infraestrutura de edição (adicionar em cada componente):**
- Imports: `useAuth`, `supabase`, `toast`, `Button`, `Input`, `Pencil/Check/X/Loader2`, `useRef`, `useEffect`
- Estado: `rows`, `editingId`, `savingId`, `draft`, `locallyEditedIds` (useRef)
- `useEffect` de merge inteligente (protege linhas editadas localmente)
- Props adicionais: `empresaCnpj` e `periodo` (passados do CorrecoesSped)

**Definições específicas por componente:**

| Componente | Draft fields | Snapshot source | registro_tipo | Campos isCurrency | Campos isPercentage |
|------------|-------------|-----------------|---------------|-------------------|---------------------|
| TabD100 | CST_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, ALIQ_COFINS, VL_COFINS, COD_CTA | item flat | `D100` | VL_PIS, VL_COFINS | ALIQ_PIS, ALIQ_COFINS |
| TabF100 | VL_OPER, CST_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, ALIQ_COFINS, VL_COFINS, COD_CTA | item.F100 | `F100` | VL_OPER, VL_PIS, VL_COFINS | ALIQ_PIS, ALIQ_COFINS |
| TabF120 | VL_OPER_DEP, CST_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, ALIQ_COFINS, VL_COFINS, COD_CTA | item.F120 | `F120` | VL_OPER_DEP, VL_PIS, VL_COFINS | ALIQ_PIS, ALIQ_COFINS |
| TabF130 | VL_OPER_AQUIS, CST_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, ALIQ_COFINS, VL_COFINS, COD_CTA | item.F130 | `F130` | VL_OPER_AQUIS, VL_PIS, VL_COFINS | ALIQ_PIS, ALIQ_COFINS |

**Funções replicadas em cada componente:**
- `toDraft(item)`: extrai campos editáveis formatados (vírgula BRL para numéricos)
- `getSnapshotFromItem(item)`: retorna o objeto snapshot puro (flat para D100, sub-objeto para F-blocks)
- `buildChangedFields(original, next)`: compara campo a campo, retorna `CampoAlteradoEfd[]`
- `handleSave(item)`: upsert em `efd_correcoes` (desativa anterior se existir, insere nova)
- `renderEditableCell(item, field, className, options)`: renderiza Input ou valor formatado com destaque amber para alterados

**Coluna "Ações" (sticky right):**
- Super cabeçalho: `colSpan` do grupo Impostos **não muda**; adicionar +1 colSpan vazio para Ações
- TableHead: `sticky right-0 bg-background z-10 border-l shadow w-[90px]`
- TableCell: botões Pencil/Check/X + Badge "Corrigido" quando há snapshot alterado

**Particularidade dos blocos F (F100, F120, F130):**
- Os campos editáveis vivem dentro do sub-objeto (ex: `item.F100.CST_PIS`), então:
  - `toDraft` lê de `item.F100.FIELD`
  - `handleSave` constrói `nextSnapshot` como cópia do sub-objeto e aplica os campos do draft
  - `buildChangedFields` compara `item._originalSnapshot` (que é o RegF100/F120Reg/F130Reg original) com `nextSnapshot`
  - Após salvar, `setRows` atualiza `{ ...row, F100: { ...row.F100, ...nextSnapshot } }`

---

### 4. Integração — `src/pages/equipe/dev/CorrecoesSped.tsx`

- Expandir a condição do botão "Enviar Correções" de `(activeTab === 'c170' || activeTab === 'a170')` para incluir `d100`, `f100`, `f120`, `f130`
- Ajustar o label e a chamada `enviarCorrecoes(activeTab.toUpperCase())`
- Passar `empresaCnpj` e `periodo` como props para TabD100, TabF100, TabF120, TabF130

---

### Resumo

| Arquivo | Ação |
|---------|------|
| `src/types/correcoesSped.ts` | +`_originalSnapshot` em 4 interfaces |
| `src/hooks/useCorrecoesSped.ts` | Expandir 4 hooks com snapshot + batchedIn |
| `src/components/.../TabD100.tsx` | Edição inline completa (~200 linhas adicionadas) |
| `src/components/.../TabF100.tsx` | Edição inline completa (~200 linhas adicionadas) |
| `src/components/.../TabF120.tsx` | Edição inline completa (~200 linhas adicionadas) |
| `src/components/.../TabF130.tsx` | Edição inline completa (~200 linhas adicionadas) |
| `src/pages/.../CorrecoesSped.tsx` | Botão enviar + props extras |

**Total: 7 arquivos, ~850 linhas adicionadas/modificadas.**

