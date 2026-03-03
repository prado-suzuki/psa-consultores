

# Expandir Sistema de Roles — Novas Camadas de Classificação

## Mapeamento: Atual → Novo

| Role Interno (DB) | Label Atual | Novo Label | Ação |
|---|---|---|---|
| `admin` | Admin | Admin | Manter |
| `team_member` | Equipe | Membro | Renomear label apenas |
| `lider` | Líder Responsável | Líder Geral | Renomear label apenas |
| `client` | Cliente | Cliente | Manter |
| `sublider` | — | Sublíder | **NOVO** — adicionar ao enum |
| `timecliente` | — | Time Cliente | **NOVO** — adicionar ao enum |

## Alterações

### 1. Migration SQL
- `ALTER TYPE app_role ADD VALUE 'sublider'`
- `ALTER TYPE app_role ADD VALUE 'timecliente'`
- Atualizar RLS das tabelas de estrutura para incluir `sublider` onde `lider` já tem acesso

### 2. AuthContext (`src/contexts/AuthContext.tsx`)
- Adicionar flags `isLider`, `isSublider` ao context (para uso futuro em permissões)
- Manter `isTeamMember` e `isAdmin` funcionando como antes

### 3. UI — Labels de exibição
Atualizar `getRoleBadge()` em todos os arquivos que exibem roles:
- `src/pages/equipe/EquipeControleAcessos.tsx`
- `src/pages/gestao/GestaoAcessos.tsx`
- `src/pages/administracao/AdminAcessos.tsx`

Adicionar badges para `sublider` e `timecliente`, renomear labels de `team_member` → "Membro" e `lider` → "Líder Geral".

### 4. Cadastro de Usuários (aba "Usuários Estrutura")
- Atualizar o select de roles para incluir as 6 opções
- Atualizar contadores/stats para refletir os novos papéis

### Escopo explicitamente FORA
- Redefinição de permissões de acesso a páginas (será próxima etapa conforme mencionado)
- Alteração de Route Guards (AdminRoute, TeamRoute) — mantém lógica atual
- RLS policies existentes — continuam funcionando, apenas expandidas para novos roles onde necessário

