## Validação das duas migrações

### 1. `20260606200000_osg_v5_fix_enums.sql` — ✅ Seguro

**Risco para Digital Rotina: nenhum.**

- Todas as 6 UPDATEs estão envolvidas em `BEGIN/COMMIT` e travadas em `cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'` (cluster OSG do MAPA).
- Validação inicial aborta a transação se o cluster OSG não existir (`RAISE EXCEPTION`).
- As tabelas afetadas (`processes`, `process_stages`, `projects`, `documentos_processo`, `gargalos`, `process_improvements`) são do módulo **MAPA**, não do módulo **Digital Rotina**.
- Confirmei no banco: `gargalos` com `cluster_id <> OSG` = **0 linhas**. Nenhum dado fora do escopo é tocado.
- Os mapeamentos enum→valor aceito batem com os tipos TS em `src/types.ts` (`FrequenciaProcesso`, `ProjetoStatus`, `MelhoriaStatus`, `EstruturacaoDoc`, etc.).

**Observação menor (não bloqueante):** O patch de `process_stages.execution` filtra por `process_id IN (SELECT id FROM processes WHERE cluster_id = OSG)`. Funciona, mas se houver etapa TO-BE com `process_id` apontando para um processo de outro cluster (cenário improvável), ela não seria normalizada. Para OSG isso é inócuo.

---

### 2. `20260607100000_gargalo_etapas.sql` — ✅ Seguro

**Risco para Digital Rotina: nenhum.**

**Validações feitas:**

| Item | Status |
|------|--------|
| `cascata_evento_etapas` / `cascata_eventos` referenciadas em código de runtime | ❌ Não. Só aparecem em migrações antigas e em `src/integrations/supabase/types.ts` (autogerado — será regenerado). `CascataPage.tsx` já consome `gargalo_etapas`. |
| FK composta `(etapa_id, scenario) → process_stages(id, scenario)` | ✅ Confirmado: existe constraint `process_stages_id_scenario_key UNIQUE (id, scenario)`. |
| `gargalo_etapas` já referenciada no frontend | ✅ `src/hooks/useGargalos.ts` e `src/types.ts` (`GargaloEtapaRef`). A tabela é pré-requisito do código atual. |
| RLS + GRANTs | ⚠️ RLS habilitada com policies para `team_member`/`admin`. **Não há `GRANT` explícito** para `authenticated`/`service_role`. Pelas regras do projeto, toda tabela `public` nova deveria incluir `GRANT SELECT, INSERT, UPDATE, DELETE ON public.gargalo_etapas TO authenticated; GRANT ALL TO service_role;`. Sem isso, PostgREST pode devolver erro de permissão mesmo com RLS passando. |
| DROP CASCADE das cascatas legadas | ⚠️ Perde 5+20 linhas em `cascata_eventos` / `cascata_evento_etapas`. Confirmado que nada em runtime lê essas tabelas — perda intencional, conforme a refatoração. |

**Digital Rotina:** módulo totalmente independente (tabelas `tickets`, `org_tasks`, `ordem_servico`, `cliente`, etc.). Nenhuma das tabelas tocadas (`cascata_*`, `gargalo_etapas`, `process_stages`) tem relação com o módulo Digital.

---

### Recomendação antes de rodar

Adicionar ao final da migração `20260607100000_gargalo_etapas.sql`, antes do `COMMIT`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gargalo_etapas TO authenticated;
GRANT ALL ON public.gargalo_etapas TO service_role;
```

Com esse ajuste, ambas as migrações estão prontas para aplicar sem impacto em Digital Rotina.

Quer que eu adicione o bloco de GRANT na migração?
