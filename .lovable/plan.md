

# Corrigir mapeamento de roles e exibição de membros no cadastro de projetos Tax

## Problemas raiz identificados

1. **Sublíderes aparecem como "Líder Geral"**: Ricardo Migueis e Washington Lima têm `role='sublider'` na tabela `user_roles`, mas na `tax_project_members` estão cadastrados com `role='leader'` (dados legados). Ao editar, o useEffect (linha 388) carrega `role='leader' || 'responsible'` → `leader_ids`, então eles aparecem como badges de Líder Geral sem estar no dropdown (pois o dropdown filtra por `user_roles.role='lider'`).

2. **Membros não aparecem ao editar**: `handleOpenModal` seta `sublider_ids: []`, e a condição na linha 1143 esconde o dropdown de Membros quando `sublider_ids.length === 0`. O useEffect que carrega os sublíderes do banco roda depois, mas nesse meio tempo os membros ficam invisíveis.

3. **Role `responsible` tratado como líder**: Linha 388 mapeia `responsible` → `leader_ids`, mas o `responsible` no modelo antigo era um membro/responsável interno, não um líder geral.

4. **Cadastro com unique constraint**: A tabela `tax_project_members` tem `UNIQUE(project_id, user_id)`. O `upsert` com `ignoreDuplicates` ignora silenciosamente atualizações de role quando o user já existe no projeto.

## Solução

### 1. Corrigir mapeamento de roles ao carregar projeto para edição (linha 388)

**Lógica de migração automática**: Ao carregar `currentProjectMembers`, cruzar com `userRoles` para colocar cada usuário no bucket correto conforme seu role **atual** em `user_roles`:
- Se `user_roles.role = 'lider'` → `leader_ids`
- Se `user_roles.role = 'sublider'` → `sublider_ids`  
- Todos os demais → `member_ids`

Isso resolve o problema de sublíderes aparecerem como líderes.

### 2. Mostrar dropdown de Membros quando já existem membros salvos (linha 1143)

Mudar condição de:
```
formData.sublider_ids.length === 0
```
Para:
```
formData.sublider_ids.length === 0 && formData.member_ids.length === 0
```

### 3. Incluir membros já selecionados no `availableMembers` (linha 693)

Garantir que membros já salvos no projeto apareçam no dropdown mesmo antes da query de `filteredMemberIds` completar:
```ts
const availableMembers = useMemo(() => {
  const excludeIds = new Set([...formData.leader_ids, ...formData.sublider_ids]);
  const selectedSet = new Set(formData.member_ids);
  if (formData.sublider_ids.length === 0 && selectedSet.size === 0) return [];
  return teamMembers.filter(
    m => !excludeIds.has(m.id) && (filteredMemberIds.includes(m.id) || selectedSet.has(m.id))
  );
}, [teamMembers, formData.leader_ids, formData.sublider_ids, formData.member_ids, filteredMemberIds]);
```

### 4. Corrigir persistência — substituir upsert por delete+insert (linhas 451-453, 555-557)

O update já faz delete+insert (linha 539). Mas o create (linha 452) usa `upsert` com `ignoreDuplicates` que pode silenciar conflitos. Trocar por insert simples (no create não deveria haver duplicatas).

### 5. Validação: Líder Geral obrigatório no submit

Adicionar validação no `handleSubmit` (linha 643):
```ts
if (formData.leader_ids.length === 0) {
  toast.error('Selecione ao menos um Líder Geral');
  return;
}
```

### Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | 5 pontos: useEffect de carga, condição membros, availableMembers, persistência, validação |

