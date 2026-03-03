

# Correção: Erro de chave duplicada ao alterar responsável do projeto

## Problema
O `delete` na linha 458 não verifica erros — se falhar (por RLS ou timing), o `insert` gera conflito de chave única. Afeta alguns usuários e outros não.

## Alterações em `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

### 1. Edição (linha 458) — Verificar erro do delete
```typescript
// DE:
await supabase.from('tax_project_members').delete().eq('project_id', id);

// PARA:
const { error: delError } = await supabase.from('tax_project_members').delete().eq('project_id', id);
if (delError) throw delError;
```

### 2. Edição (linha 472) — Usar upsert na edição
```typescript
// DE:
const { error: membersError } = await supabase.from('tax_project_members').insert(members);

// PARA:
const { error: membersError } = await supabase.from('tax_project_members').upsert(members, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
```

### 3. Edição (linha 371) — Usar upsert na criação
```typescript
// DE:
const { error: membersError } = await supabase.from('tax_project_members').insert(members);

// PARA:
const { error: membersError } = await supabase.from('tax_project_members').upsert(members, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
```

