

# Acesso automático por membership na estrutura + chamados

## Resumo

Membros de equipes (`estrutura_equipe_membros`) ganham acesso automático às páginas das áreas a que pertencem, sem necessidade de cadastro manual em `user_page_access`. Além disso, **todos os team_members** acessam o portal de chamados (`/equipe/chamados`), mas veem apenas chamados **atribuídos a eles** (isso já funciona assim no código atual).

## Como funciona hoje

```text
Acesso a página → usePageAccess → busca page_permissions + user_page_access
                                   (cadastro manual por admin)
```

## Como vai funcionar

```text
Acesso a página → usePageAccess →
  1. Admin? → OK
  2. Página não registrada? → OK
  3. Tem user_page_access manual? → OK  (mantém compatibilidade)
  4. NOVO: É team_member e página é /equipe/chamados (cat 'geral')? → OK
  5. NOVO: Pertence a equipe cuja área mapeia para a categoria da página? → OK
```

## Alterações

### 1. Migration: coluna `page_categories` em `estrutura_areas`

```sql
ALTER TABLE estrutura_areas 
  ADD COLUMN page_categories text[] DEFAULT '{}';
```

Permite o admin mapear cada área organizacional às categorias de página (ex: área "Digital" → `['rotina', 'dev']`). Configurável no EstruturaManager.

### 2. Atualizar `usePageAccess.ts`

Adicionar verificação extra após o check de `user_page_access`:
- Se a página tem categoria `'geral'` e o usuário tem role `team_member` → acesso automático
- Buscar as equipes do usuário via `estrutura_equipe_membros` → resolver áreas → verificar se `page_categories` da área inclui a categoria da página

### 3. UI: campo de mapeamento no EstruturaManager

No CRUD de áreas (`EstruturaManager.tsx`), adicionar um multi-select para definir quais categorias de página cada área concede acesso. Opções: `rotina`, `dev`, `tax`, `projetos`, `fiscal`, `osg`, `board`, `gestao`.

### 4. Chamados: sem alteração de código

O `EquipeChamados.tsx` já filtra por `assigned_to` quando `canAssignTickets` é false (linha 193-194). Basta que o membro tenha acesso à página — o filtro cuida do resto.

## Arquivos

| Arquivo | Alteração |
|---|---|
| **Migration SQL** | Coluna `page_categories text[]` em `estrutura_areas` |
| `src/hooks/usePageAccess.ts` | Lógica adicional: checar membership + categoria |
| `src/components/equipe/estrutura/EstruturaManager.tsx` | Multi-select de categorias no form de área |

