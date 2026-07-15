Aplicar migration RLS-P1-03 (isolamento por cluster no módulo Melhorias), seguindo o mesmo padrão já usado em Processos e Gargalos.

## O que será feito

1. Criar `supabase/migrations/<timestamp>_rls_p1_03_melhorias_cluster.sql` com o SQL exato fornecido:
   - Nova função `public.melhoria_cluster_visivel(uuid)` (SECURITY DEFINER, STABLE).
   - Bloco defensivo removendo qualquer policy remanescente com `USING(true)` ou `WITH CHECK(true)` nas 5 tabelas do módulo.
   - Policies na **pai** `process_improvements` (cluster_id direto): SELECT/INSERT/UPDATE para `team_member+` no cluster; DELETE apenas `lider+`; admin bypassa.
   - Policies nas **4 filhas** (`melhoria_processos`, `melhoria_sistemas`, `melhoria_responsaveis`, `melhoria_acoes_td`): mesmo padrão, derivando o cluster via `melhoria_id` → `melhoria_cluster_visivel`.
   - Melhorias com `cluster_id NULL` (5 testes do DIFAL) ficam admin-only por decisão A do Eduardo — sem ramo de exceção.

2. Aplicar a migration.

3. Rodar a query de validação do fim do SQL — deve retornar **0 linhas**.

4. `src/integrations/supabase/types.ts` é regenerado automaticamente pós-migration (entra `melhoria_cluster_visivel`).

## Fora de escopo

Nada além da migration: sem tocar em tabelas, colunas, seeds, hooks (`useMelhorias.ts` já filtra `.not('cluster_id','is',null)` no SELECT do MAPA e continua funcionando), componentes ou docs.

## Reversibilidade

Aditivo: as policies novas substituem `USING(true)`. Rollback = restaurar as policies antigas + `DROP FUNCTION melhoria_cluster_visivel`.
