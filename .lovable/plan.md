

# Fix: Remove estrutura-based access bypass

## Problem
Both `checkAreaAccess` (used at area selection/login) and `usePageAccess` (used by `PageAccessGate` on every page) have a fallback path:

```
user → estrutura_equipe_membros → estrutura_equipes → estrutura_areas.page_categories
```

If the user belongs to ANY team in an area, they automatically get access to ALL pages in that area — bypassing the explicit `user_page_access` check entirely.

## Fix

### File 1: `src/lib/accessControl.ts`
**Remove lines 49-76** (the entire "Acesso herdado via estrutura organizacional" block). The function will return `true` only if:
- User is admin, OR
- User has at least one `user_page_access` record for a page in the target area's categories

### File 2: `src/hooks/usePageAccess.ts`
**Remove lines 46-75** (the "Check membership-based access via estrutura" block). The hook will return `true` only if:
- User is admin, OR
- Page is not registered in `page_permissions` (free access), OR
- User has explicit `user_page_access` for that page, OR
- Page category is `'geral'` and user is internal

### What stays the same
- Admin always has access
- `'geral'` category pages remain open to all internal users
- Unregistered pages remain free access
- Cluster/estrutura membership continues to work for **data filtering** within areas (project lists, task assignment, etc.) — no changes needed there

### Files changed
- `src/lib/accessControl.ts` — remove estrutura fallback
- `src/hooks/usePageAccess.ts` — remove estrutura fallback

No database, RLS, or migration changes needed. The bug is purely in frontend access-check logic.

