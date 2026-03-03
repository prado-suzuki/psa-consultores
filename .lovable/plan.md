

# Reestruturar seção "Integrantes" no modal de projeto Tax

## Resumo

Renomear a seção "Equipe" para "Integrantes", trocar os campos de seleção única para múltipla (Líderes Gerais e Sublíderes), e condicionar a lista de membros à seleção de sublíderes — exibindo apenas os membros das equipes associadas.

## Alterações em `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

### 1. Renomear e reestruturar campos

| De | Para |
|---|---|
| Seção "Equipe" | Seção "Integrantes" |
| "Responsável Interno" (select único, filtra `team_member`) | "Líder Geral" (multi-select com checkboxes, filtra role `lider`) |
| "Líder Responsável" (select único, filtra `lider`) | "Sublíder" (multi-select com checkboxes, filtra role `sublider`) |

### 2. Mudanças no formData

```typescript
// DE:
responsible_id: '',    // string única
leader_id: '',         // string única

// PARA:
leader_ids: [] as string[],    // múltiplos líderes gerais
sublider_ids: [] as string[],  // múltiplos sublíderes
```

### 3. Buscar roles `sublider` além de `lider` e `team_member`

Atualizar a query `user-roles-lider-team` para incluir `sublider`:
```typescript
.in('role', ['lider', 'team_member', 'sublider'])
```

Criar listas filtradas:
- `lideres` → role `lider`
- `sublideres` → role `sublider`

### 4. Membros condicionais à seleção de sublíderes

Quando `sublider_ids` tiver valores:
1. Query `estrutura_equipes` filtrando `sublider_id IN sublider_ids` → obter `equipe_ids`
2. Query `estrutura_equipe_membros` filtrando `equipe_id IN equipe_ids` → obter `user_ids`
3. Filtrar a lista de membros para exibir apenas esses `user_ids`

Se nenhum sublíder selecionado, ocultar a seção de membros com mensagem "Selecione ao menos um sublíder para ver os membros disponíveis."

### 5. UI dos multi-selects (Líder Geral e Sublíder)

Usar o mesmo padrão de checkboxes em tabela já utilizado para membros:
- Lista com checkboxes
- Badges mostrando os selecionados acima da lista
- Scroll limitado (`max-h-32`)

### 6. Ajustar mutations (create/update)

Na inserção em `tax_project_members`:
- Para cada `leader_id` em `leader_ids` → role `'leader'`
- Para cada `sublider_id` em `sublider_ids` → role `'sublider'`
- Membros continuam com role `'member'`

Na tabela `tax_projects`, os campos `responsible_id` e `leader_id` ficam `null` (a referência passa a ser via `tax_project_members`). Alternativamente, manter `leader_id` como o primeiro líder selecionado para compatibilidade com a tabela de listagem.

### 7. Ajustar carregamento ao editar

Ao abrir para edição, popular `leader_ids` com membros de role `'leader'` e `sublider_ids` com role `'sublider'` do `currentProjectMembers`.

## Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Reestruturar seção Integrantes, multi-select, membros condicionais |

