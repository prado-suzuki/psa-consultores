

# Áreas de Acesso para Admin

## Análise

**Não é necessário para Admin.** O papel `admin` já concede acesso total a todas as páginas do sistema — a verificação de admin é a primeira checagem no `usePageAccess.ts`, antes de qualquer verificação de área ou categoria.

Portanto, mesmo que as áreas não apareçam ao selecionar `admin`, isso não causa nenhum problema de acesso: o admin enxerga tudo independentemente.

## Correção necessária (apenas lider/sublider)

O problema real está apenas nos papéis `lider` e `sublider`, que precisam de áreas associadas para funcionar, mas a UI esconde o seletor quando esses papéis são escolhidos.

### Alterações em `EquipeControleAcessos.tsx`:

1. **Linha 1158** (dialog de criação):
```typescript
// De:
{newUser.roles.includes('team_member') && (
// Para:
{(newUser.roles.includes('team_member') || newUser.roles.includes('lider') || newUser.roles.includes('sublider')) && (
```

2. **Linha 1548** (dialog de edição):
```typescript
// De:
{editUser.roles.includes('team_member') && (
// Para:
{(editUser.roles.includes('team_member') || editUser.roles.includes('lider') || editUser.roles.includes('sublider')) && (
```

3. **Linha 325** (lógica de criação — sync de áreas):
```typescript
// De:
if (newUser.roles.includes('team_member') && newUser.areas.length > 0 ...
// Para:
if ((newUser.roles.includes('team_member') || newUser.roles.includes('lider') || newUser.roles.includes('sublider')) && newUser.areas.length > 0 ...
```

4. **Linha 450** (lógica de edição — sync de áreas):
```typescript
// De:
if (editUser.roles.includes('team_member')) {
// Para:
if (editUser.roles.includes('team_member') || editUser.roles.includes('lider') || editUser.roles.includes('sublider')) {
```

Admin não precisa dessa alteração pois já tem acesso irrestrito.

