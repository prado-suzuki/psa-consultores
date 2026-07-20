# IA-T3 (correção) — Criar CLAUDE.md

## Pré-voo
- Confirmado: `CLAUDE.md` **não existe** na raiz.
- `AGENTS.md`, `docs/AI_CONTEXT.md` e `docs/rls/mapa-do-banco.md` presentes (não serão tocados).

## Ação única
Criar `CLAUDE.md` na raiz com exatamente o conteúdo especificado no briefing:

- Título: `# CLAUDE.md: PSA Consultores`
- Seção "Schema do banco (regra)" referenciando `docs/rls/mapa-do-banco.md` e proibindo leitura integral de `src/integrations/supabase/types.ts`.
- Seção "Fontes de verdade" apontando para `AGENTS.md`, `docs/AI_CONTEXT.md` e `docs/rls/mapa-do-banco.md`.
- Nota final indicando que o arquivo é um ponteiro enxuto.

## Fora de escopo
- Não alterar `AGENTS.md`, `docs/AI_CONTEXT.md`, código, migrations, schema ou config.

## GATE
- `CLAUDE.md` na raiz existe após o commit.
- Contém a referência a `docs/rls/mapa-do-banco.md` e a proibição sobre `types.ts` inteiro.
- Nenhum outro arquivo modificado.
