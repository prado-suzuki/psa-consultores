## CAD-01 + CAD-02: popular clientes OSG e acertar tags OSG × Tax (prod)

### Objetivo
Popular a base OSG em produção e corrigir as tags de área (OSG × Tax) hoje marcadas em bloco, usando as planilhas "Relação de Projetos - OSG" e "Relação de Clientes ativos" (Protenun = OSG, PSA Consultores = Tax). Ao final, `PSA OSG` fica apenas nos 64 clientes OSG oficiais (54 criados + 10 existentes reais).

### Escopo
- **CAD-01**: criar 54 clientes OSG inexistentes em prod, vinculados ao cluster `PSA OSG`. Ativos com `ativo=true`; finalizados/hibernando com `ativo=false` e observação padrão (código do projeto quando houver).
- **CAD-02a**: remover tag `PSA OSG` de 59 clientes não-OSG-oficiais (21 só-Tax + 38 do resíduo da marcação em bloco antiga).
- **CAD-02b**: remover tag `PSA Consultores` de 3 clientes só-OSG/Protenun (Gcb Agro, Evermat S/A, Grupo Bahia Potrich).
- Manter as duas tags em Paiol Comercial Agricola e Fribon Transportes (OSG oficiais também classificados como Tax).

### Fora de escopo (guardrails)
- Não alterar schema, RLS, policies, funções ou triggers.
- Somente `ambiente='prod'`; ignorar dev.
- Ao remover a tag OSG dos não-OSG, não tocar em nenhum outro cluster deles (Consultores, PSA Norte, Prado etc. permanecem).
- Não remover a última tag de cluster de nenhum cliente (guarda `EXISTS` de outro cluster).
- Idempotente: criação por `lower(btrim(nome))` em prod não-excluído; DELETEs por id + cluster.
- Não usar a RPC `criar_cliente_com_clusters` (valida `auth.uid()`); usar INSERT direto — trigger `trg_cliente_tem_cluster` é DEFERRED.

### Constantes
- `PSA OSG` = `0523512c-f980-4236-8a7c-53e06c9c7a80`
- `PSA Consultores` = `b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3`

### Implementação
Uma única migration `supabase/migrations/<timestamp>_cad01_cad02_osg_prod.sql`, exatamente na ordem:

1. `BEGIN;`
2. **CAD-01** — bloco `DO $$ ... $$` com loop sobre `VALUES` dos 54 registros `(nome, ativo, obs)`. Para cada nome ainda inexistente em prod não-excluído (`lower(btrim(nome))`), `INSERT INTO public.cliente (nome, ativo, observacoes, ambiente) VALUES (btrim(...), ..., 'prod')` capturando o `id`, seguido de `INSERT INTO public.cliente_clusters (cliente_id, cluster_id)` com o cluster OSG na mesma transação.
3. **CAD-02a** — `DELETE FROM public.cliente_clusters` filtrando `cluster_id = PSA OSG` + os 59 ids listados + guarda `EXISTS` garantindo outro cluster remanescente.
4. **CAD-02b** — mesmo padrão para os 3 ids + `cluster_id = PSA Consultores` + guarda.
5. `COMMIT;`

Paiol e Fribon não recebem ação (mantêm as duas tags).

### GATE (após o COMMIT)
Rodar as 5 queries do enunciado:
1. Nenhum cliente prod não-excluído sem cluster → 0 linhas.
2. Contagem de clientes prod com tag OSG → **64** (era 69; +54 criados, −59 removidos).
3. Paiol Comercial Agricola e Fribon Transportes → 2 tags cada.
4. Gcb Agro, Evermat S/A, Grupo Bahia Potrich sem `PSA Consultores` → 0 linhas.
5. Clientes de teste/fiscais (Z Osg - Teste 2, Ÿ Osg - Teste 1, Planta Brasil, Psa Consultores) sem OSG → 0 linhas.

### Riscos
Baixo: apenas dados, prod-only, idempotente, com guardas de última-tag e sem alteração de schema/RLS/triggers.
