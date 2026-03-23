

## Plano: Nova Ferramenta "Mapa NCM (PIS/COFINS)"

CRUD completo para a tabela `pis_cofins_regra`, seguindo os padrões do projeto (hook encapsulado, auditoria, rota protegida).

### Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `src/hooks/useRegrasNCM.ts` | Hook encapsulado com query + mutations (create, update, delete) + audit log |
| `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx` | Sheet lateral com formulário (zod + react-hook-form) para criar/editar regra |
| `src/pages/equipe/dev/MapaNCMPisCofins.tsx` | Página principal com filtros, tabela e ações |

### Arquivos a editar

| Arquivo | Alteração |
|---|---|
| `src/components/equipe/dev/DevLayout.tsx` | Adicionar item "Mapa NCM" no array `pisCofinsSubItems` |
| `src/App.tsx` | Adicionar import + rota `/equipe/dev/mapa-ncm-pis-cofins` |
| `src/config/protectedPages.ts` | Registrar a nova página |
| `src/hooks/useAuditLog.ts` | Adicionar `'regra_pis_cofins'` ao type `AuditEntityType` |

---

### 1. Hook `useRegrasNCM.ts`

- **Query**: `supabase.from('pis_cofins_regra').select('*').order('cod_ncm')` com queryKey `['regras-ncm-pis-cofins']`
- **createRegra**: mutation que insere na tabela com `id_segmento` fixo (campo obrigatório, default `'geral'`), chama `logAction` com `entity_type: 'regra_pis_cofins'`, action `'created'`
- **updateRegra**: mutation de update por `id`, chama `logAction` com `'updated'` e `changed_fields`
- **deleteRegra**: mutation de delete por `id`, chama `logAction` com `'deleted'`
- Todos invalidam a queryKey no `onSuccess`
- Tipagem: usar `Database['public']['Tables']['pis_cofins_regra']['Row']` do types.ts gerado

### 2. Componente `RegraFormSheet.tsx`

Baseado no arquivo enviado, adaptado ao projeto:
- Schema zod com campos: `cod_ncm` (obrigatório), `cst_pis`, `cst_cofins`, `desc_cst` (obrigatórios), `base_legal`, `permite_credito` (Select S/N/vazio), `tipo_credito`, `observacoes`, `data_vigencia_inicio`, `data_vigencia_fim` (inputs numéricos bigint, conforme schema real)
- Usa mutations do hook `useRegrasNCM` (não chama supabase direto)
- Sheet com `sm:max-w-[600px]`, grid 2 colunas, botões teal

### 3. Página `MapaNCMPisCofins.tsx`

**Filtros** (card `bg-slate-50 rounded-xl`):
- Input de busca (NCM ou Descrição) com ícone `Search`
- Switch "Apenas com crédito"
- Botão "Nova Regra" (teal, ícone `Plus`)

**Tabela** (card `bg-white rounded-xl shadow-sm border`):
- Header `bg-slate-50`, `text-xs uppercase tracking-wider`
- Colunas: NCM, CST PIS, CST COFINS, Descrição CST, Crédito (Badge verde/outline), Ações (Editar/Excluir)
- Empty state com ícone `FileSpreadsheet`
- Hover `hover:bg-slate-50/50`
- Contador de registros no rodapé

**Modais**:
- `RegraFormSheet` para criar/editar
- `AlertDialog` para confirmar exclusão

### 4. Sidebar (DevLayout.tsx)

```typescript
// pisCofinsSubItems — adicionar:
{ icon: FileSpreadsheet, label: 'Mapa NCM', path: '/equipe/dev/mapa-ncm-pis-cofins' },
```

### 5. Rota (App.tsx)

```tsx
import MapaNCMPisCofins from "./pages/equipe/dev/MapaNCMPisCofins";
// ...
<Route path="/equipe/dev/mapa-ncm-pis-cofins" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/mapa-ncm-pis-cofins"><MapaNCMPisCofins /></PageAccessGate></TeamRoute>} />
```

### 6. Registro de página protegida

```typescript
{
  page_path: '/equipe/dev/mapa-ncm-pis-cofins',
  page_name: 'Mapa NCM PIS/COFINS',
  page_description: 'Gerenciamento de regras fiscais NCM para PIS/COFINS',
  category: 'dev',
  requires_admin: false,
  requires_team_member: true,
}
```

### Detalhes técnicos

- `data_vigencia_inicio` e `data_vigencia_fim` são `bigint` (number | null) no schema, não date — o formulário usa Input type `number`
- `id_segmento` é `string` obrigatório na tabela — o hook define um default `'geral'` no insert
- Filtragem client-side via `useMemo` (busca textual + toggle de crédito)
- Nenhuma RLS nova necessária — tabela já existe com dados carregados

