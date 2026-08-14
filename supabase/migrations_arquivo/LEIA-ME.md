# Migrations arquivadas (até 14/08/2026)

Estes 557 arquivos **não são mais aplicados**. Ficam aqui como registro histórico.
O schema agora nasce de `supabase/migrations/00000000000000_baseline.sql`.

## Por que foram aposentadas

Elas não reconstruíam o banco. Medido em 14/08/2026, aplicando-as em ordem num
Postgres 17 limpo: **246 das 556 falharam**, a primeira já na de número 37.

Não era efeito cascata de um erro isolado. Faltava coisa no histórico:

- Tabelas que existem em produção e **não são criadas por nenhuma migration, em
  nenhum commit, em nenhuma branch**: `representante`, `org_projects`,
  `cliente_clusters`. E `bem`, `matricula`, `titularidade`, `quadro_societario`
  só apareciam em fixtures de `supabase/tests/`, nunca numa migration.
- Colunas na mesma situação: `daily_standups.project_id` e `.process_id`,
  `sprint_deliverables.project_id` e `.process_id`, `sprints.project_id`.
- Produção registrava 429 migrations em `supabase_migrations.schema_migrations`,
  contra 553 arquivos em `main`.
- Boa parte é limpeza de dados de uma vez só (`DELETE FROM projects`, backfills
  que abortam com "esperados 34 processos OSG, há 0"). Irreplayáveis por
  construção, não por defeito.

Corrigir uma a uma não resolveria: não há conserto para uma coluna que nunca
existiu no histórico.

## De onde veio o baseline

Do export oficial do Lovable Cloud de 14/08/2026 (Cloud → Advanced settings →
Export Lovable Cloud data), que é um `pg_dump` em formato custom. Extraído com:

```
pg_restore --schema-only --schema=public --no-owner
```

Conferido contra produção por impressão digital md5 em 11 dimensões (tabelas,
colunas, constraints, índices, funções, policies, triggers, enums, views, RLS e
grants). As 11 batem.

## Podem ser apagadas?

Sim, o git guarda tudo. Ficam aqui só enquanto a transição é recente e alguém
ainda pode querer consultar "o que aquela migration fazia" sem ir no histórico.
