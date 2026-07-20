# IA-T3 — Registrar a regra de consulta ao schema

## Pré-voo (confirmado)
- `CLAUDE.md` NÃO existe na raiz. ✔
- `AGENTS.md` existe, tem a seção "📂 REVELAÇÃO PROGRESSIVA" (linha 60) e não menciona `mapa-do-banco`. ✔
- `docs/rls/mapa-do-banco.md` e `docs/AI_CONTEXT.md` existem. ✔

## Fora de escopo
Nenhuma alteração em código, migrations, schema, RLS, `docs/AI_CONTEXT.md` ou outros `.md`.

## Alterações

### 1) Criar `CLAUDE.md` na raiz

Observação: o conteúdo colado na tarefa tem dois trechos corrompidos ("`docs/rls/mapa-do-bancoelas, colunas, FKs...`" e "As regras completas vs/AI_CONTEXT.md`"). Vou gravar a versão limpa abaixo, mantendo intenção e estrutura de ponteiro enxuto:

```md
# CLAUDE.md — PSA Consultores

Guia rápido para assistentes de IA neste repositório.

## Schema do banco (regra)

Para conhecer o schema, consulte **`docs/rls/mapa-do-banco.md`** (tabelas, colunas, FKs, flags e RLS) — **nunca** leia `src/integrations/supabase/types.ts` inteiro (~8.9k linhas, autogerado).

## Fontes de verdade (leia estes)

- **Regras e arquitetura:** `AGENTS.md` (regras inegociáveis, padrões de código, organização de docs).
- **Contexto-mestre do projeto:** `docs/AI_CONTEXT.md`.
- **Schema do banco:** `docs/rls/mapa-do-banco.md`.

> Este arquivo é um ponteiro enxuto. As regras completas vivem em `AGENTS.md` e `docs/AI_CONTEXT.md`.
```

Se preferir preservar literalmente o texto quebrado, me avise antes de aplicar.

### 2) Atualizar `AGENTS.md`

Inserir como **primeiro item** da lista da seção "📂 REVELAÇÃO PROGRESSIVA" (imediatamente após a linha 60), antes de "Permissões e Rotas":

```
- **Schema do banco:** consulte `docs/rls/mapa-do-banco.md` (tabelas/colunas/FKs/flags/RLS) — nunca leia `src/integrations/supabase/types.ts` inteiro (autogerado, ~8.9k linhas).
```

## Validação (GATE)
1. `CLAUDE.md` existe na raiz e referencia `docs/rls/mapa-do-banco.md` + proibição de ler `types.ts` inteiro.
2. `git grep 'mapa-do-banco' AGENTS.md` retorna ≥ 1 ocorrência na seção Revelação Progressiva.
3. `docs/AI_CONTEXT.md` inalterado; nenhum arquivo de código tocado.
