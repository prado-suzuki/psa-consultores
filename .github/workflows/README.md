# GitHub Actions Workflows

## `ci.yml` — Pipeline de qualidade

Roda em todo push para `main` e em toda pull request direcionada a `main`.

**Jobs:**

1. **Checkout + Setup Node 20** com cache de `~/.npm`.
2. **Install** — `npm ci` (determinístico, usa o `package-lock.json`).
3. **Lint** — `npm run lint` (ESLint flat config).
4. **Typecheck** — `npx tsc --build --noEmit` (TypeScript).
5. **Tests** — `npm test` (Vitest em modo single-run).
6. **Build** — `npm run build` (Vite).
7. **Artifact** — em PRs, faz upload da pasta `dist/` (retenção: 7 dias).

**Concorrência:** runs em andamento são cancelados quando um novo push chega
no mesmo PR/branch, economizando minutos de CI.

## Branch protection recomendada

Ativar em **Settings → Branches → main**:

- ✅ Require status checks to pass before merging
  - Selecionar: `Lint + Typecheck + Tests + Build`
- ✅ Require branches to be up to date before merging

Isso garante que nenhum PR seja mergeado sem passar pelo pipeline.
