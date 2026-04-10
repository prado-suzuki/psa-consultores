

## Correção: incluir "Planejado" no dropdown de projetos (manter "Suspenso" fora)

### Arquivo: `src/hooks/useOrgProjects.ts` (linha 153)

Trocar:
```typescript
if (onlyActive) query = query.eq('status', 'active');
```
Por:
```typescript
if (onlyActive) query = query.in('status', ['active', 'planned']);
```

Isso faz com que projetos **planejados** apareçam no dropdown de criação de tarefas (resolvendo casos como o Everest se o status for `planned`), mas projetos **em suspenso** (`on_hold`) continuem ocultos — impedindo criação de tarefas neles.

### Build errors (mesmo deploy)

1. **`supabase/functions/notify-ticket/index.ts`** — Usar `any` no tipo do client para eliminar os 15 erros de tipo. Trocar `ReturnType<typeof createClient>` por `any` nos parâmetros de `getGestorRecipients`, `getEmailForUser` e `getNameForUser`.

2. **`src/components/equipe/dev/correcoes-sped/TabF100.tsx`** (linha 195) — Adicionar cast intermediário `as unknown` antes de `as RegF100`.

