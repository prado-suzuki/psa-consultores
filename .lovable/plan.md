

## Plano: Cascata organizacional no formulário de projeto

### Resumo

Ao selecionar uma Área no formulário, resolver o `estrutura_area_id` da `tax_areas` e, se existir, filtrar os dropdowns de Líder, Sublíder e Membros com base na estrutura organizacional. Se `NULL`, manter comportamento atual.

### 1. Alterar query de `tax_areas` (linha ~123)

Incluir `estrutura_area_id` no select:
```ts
.select('id, nome, estrutura_area_id')
```
Atualizar interface `TaxArea` para incluir `estrutura_area_id: string | null`.

### 2. Derivar `estruturaAreaId` da área selecionada

```ts
const selectedTaxArea = taxAreas.find(a => a.id === formData.area_id);
const estruturaAreaId = selectedTaxArea?.estrutura_area_id || null;
```

### 3. Três novas queries condicionais (habilitadas apenas quando `estruturaAreaId` existir)

**a) Líderes da área:**
```ts
useQuery(['area-lideres', estruturaAreaId], ...)
// FROM estrutura_area_lideres WHERE area_id = estruturaAreaId → retorna user_id[]
```

**b) Sublíderes da área:**
```ts
useQuery(['area-sublideres', estruturaAreaId], ...)
// FROM estrutura_equipes WHERE area_id = estruturaAreaId → retorna sublider_id[] (não nulos)
```

**c) Membros da área:**
```ts
useQuery(['area-membros', estruturaAreaId], ...)
// FROM estrutura_equipe_membros JOIN estrutura_equipes WHERE area_id = estruturaAreaId → retorna user_id[]
```

### 4. Listas filtradas para os dropdowns

Substituir os `useMemo` atuais de `lideres`, `sublideres` e `availableMembers`:

| Campo | `estruturaAreaId` existe | `estruturaAreaId` é NULL |
|---|---|---|
| **Líder** | `teamMembers` filtrado pelos `user_id` de `area-lideres`. Se 0 resultados → fallback para todos os líderes (comportamento atual) | Comportamento atual (todos com role `lider`) |
| **Sublíder** | `teamMembers` filtrado pelos `sublider_id` de `area-sublideres`. Se 0 → fallback | Comportamento atual (todos com role `sublider`) |
| **Membros** | `teamMembers` filtrado pelos `user_id` de `area-membros`, excluindo líderes/sublíderes já selecionados. Inclui também `member_ids` já salvos (edição) | Comportamento atual (filtro por equipes do sublíder) |

### 5. Auto-preenchimento do Líder

Quando `estruturaAreaId` existe e a query retorna exatamente 1 líder → setar `formData.leader_ids = [userId]` automaticamente (apenas na criação, não na edição).

### 6. Botão "Incluir todos da área"

Visível apenas quando `estruturaAreaId` existir. Ao clicar:
```ts
setFormData(prev => ({
  ...prev,
  member_ids: [...new Set([...prev.member_ids, ...areaMemberIds])]
}));
```
Posicionado ao lado do label "Membros do Projeto". Reutiliza o estilo do "Selecionar todos" atual mas como botão externo.

### 7. Limpeza ao trocar Área (ajuste no useEffect existente, linha ~426)

Quando `area_id` muda por ação do usuário:
- Limpar `leader_ids`, `sublider_ids`, `member_ids`, `category_ids`
- Não limpar ao trocar sublíder (regra já existente para membros, mantida)

### 8. Edição de projeto existente

Ao carregar projeto para edição:
- Os selects ficam filtrados pela área, mas os `member_ids`/`leader_ids`/`sublider_ids` já salvos são preservados e exibidos mesmo que não façam mais parte da estrutura da área (via inclusão no `useMemo` com `|| selectedSet.has(id)`)

### 9. Persistência de membros (update)

A regra do usuário diz "usar upsert", mas o código atual (linha 594-614) usa delete+insert para `tax_project_members`. Vou substituir por **upsert com `onConflict: 'project_id,user_id'`** seguido de delete dos membros removidos. Mesma lógica para `project_servicos`.

### Arquivos alterados

Apenas `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`.

