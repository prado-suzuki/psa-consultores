## RLS-P3-01 — mover 4 tabelas `_bkp_psa_unify_20260507_*` para o schema `archive`

### Pré-check (já executado)
- FKs apontando para as 4 → **0 linhas** ✅
- Views/regras dependentes → **0 linhas** ✅

Sem dependências. Move é seguro.

### Migration
Criar `supabase/migrations/rls_p3_01_archive_bkp_psa_unify.sql` com:

```sql
CREATE SCHEMA IF NOT EXISTS archive;
ALTER TABLE public._bkp_psa_unify_20260507_area_servicos   SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_catalog_clients SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_org_projects    SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_tickets         SET SCHEMA archive;
```

Aplicar via tool de migration.

### Validação pós-migration
```sql
SELECT schemaname, tablename FROM pg_tables
WHERE tablename ~ '^_bkp_psa_unify_20260507_' ORDER BY schemaname;
```
Esperado: 0 em `public`, 4 em `archive`.

### Fora de escopo
- Não dropar tabelas.
- Não mexer em grants, RLS, ou qualquer outro objeto.
- Não atualizar `docs/rls/Divida_Tecnica_RLS_Eduardo.md` nesta migration (posso marcar o P3 como concluído em passo separado, se pedir).
