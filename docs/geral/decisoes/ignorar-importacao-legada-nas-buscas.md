# Ignorar migrations de importação legada nas buscas

**Status:** Aceita
**Data:** 2026-07-14

## Contexto

As migrations `supabase/migrations/20260429120000_import_legacy_tickets.sql` e
`supabase/migrations/20260429130000_import_legacy_tickets_retry.sql` são idênticas
e somam aproximadamente 27 mil linhas de SQL de importação de dados legados.

## Decisão

Manter os dois arquivos no histórico de migrations e excluí-los apenas das buscas
padrão de ferramentas (ripgrep, IAs) por meio de um `.ignore` na raiz do repositório.

## Justificativa

Reduzir ruído e consumo de contexto das IAs sem comprometer migrations aplicadas,
resets do banco ou provisionamento de novos ambientes.

## Consequência

Os arquivos continuam versionados e aplicáveis pelo Supabase. Podem ser acessados
explicitamente quando necessário (ex.: `rg --files --no-ignore`, leitura direta
por caminho).
