
# Plano: consolidar cluster PSA Consultores em uma área única "Tax"

## Objetivo
- Criar nova área **Tax** no cluster *PSA Consultores* (`b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3`).
- Mover `Equipe Fiscal`, `Equipe Fixos`, `Equipe Pontuais` para essa área.
- Soft-delete das 5 áreas antigas e das 3 equipes restantes do cluster.
- `gestor_chamados_id` da nova área = `ricardo.migueis@psaconsultores.com.br` (`ec8c2f0e-6999-4387-8417-c617a728b428`).

## Estado atual

Áreas do cluster (todas `page_categories=['tax']`, color `#10b981`, cost_center `5570cc11…`):

| Área (id) | Equipes |
|---|---|
| `201bb999…` Área Fiscal | Equipe Fiscal |
| `fd2eab19…` Área Fixos | Equipe Fixos |
| `5c71affa…` Área Pontuais | Equipe Pontuais |
| `947fc502…` PSA Consultores | Área para Estudos e Pesquisas |
| `a76d5f03…` Trabalhos compartilhados OSG | Equipe Fiscal e OSG, Equipe Tax + Advogados |

Dependências: 76 `org_projects`, 7 `tickets`, 14 `area_servicos`, 0 `catalog_clients`.

## Etapas

### 1. Backup do estado atual
Criar tabelas de snapshot no schema `public` com prefixo `_bkp_psa_unify_20260507_` contendo o vínculo original com `estrutura_area_id` antes de qualquer UPDATE:

```sql
CREATE TABLE public._bkp_psa_unify_20260507_org_projects AS
  SELECT id, estrutura_area_id, equipe_id, name, now() AS snapshot_at
  FROM org_projects
  WHERE estrutura_area_id IN (5 ids antigos);

CREATE TABLE public._bkp_psa_unify_20260507_tickets AS
  SELECT id, estrutura_area_id, now() AS snapshot_at
  FROM tickets
  WHERE estrutura_area_id IN (5 ids antigos);

CREATE TABLE public._bkp_psa_unify_20260507_area_servicos AS
  SELECT estrutura_area_id, servico_id, now() AS snapshot_at
  FROM area_servicos
  WHERE estrutura_area_id IN (5 ids antigos);

CREATE TABLE public._bkp_psa_unify_20260507_catalog_clients AS
  SELECT id, estrutura_area_id, now() AS snapshot_at
  FROM catalog_clients
  WHERE estrutura_area_id IN (5 ids antigos);
```

Permite reverter individualmente cada vínculo se necessário. As tabelas ficam no schema `public` mas o prefixo `_bkp_` deixa claro que são auxiliares.

### 2. Inserir nova área "Tax"
`INSERT INTO estrutura_areas (cluster_id, name, color, page_categories, cost_center_id, gestor_chamados_id, is_active)` com os valores acima e `RETURNING id`.

### 3. Reapontar as 3 equipes que migram
`UPDATE estrutura_equipes SET area_id = :NEW_AREA_ID WHERE id IN ('c75c8c72…','42ba0b06…','4995f1d5…')`. Preserva `gestor_id` de cada equipe.

### 4. Reapontar dados dependentes
- `UPDATE org_projects SET estrutura_area_id = :NEW_AREA_ID WHERE estrutura_area_id IN (5 ids antigos)`.
- `UPDATE tickets SET estrutura_area_id = :NEW_AREA_ID WHERE estrutura_area_id IN (5 ids antigos)`.
- `area_servicos` (UNIQUE em `(estrutura_area_id, servico_id)`):
  - `INSERT INTO area_servicos (estrutura_area_id, servico_id) SELECT DISTINCT :NEW_AREA_ID, servico_id FROM area_servicos WHERE estrutura_area_id IN (5 ids) ON CONFLICT DO NOTHING;`
  - `DELETE FROM area_servicos WHERE estrutura_area_id IN (5 ids antigos);`
- `catalog_clients`: 0 linhas, no-op.

### 5. Soft-delete das equipes que não migram
`UPDATE estrutura_equipes SET is_active = false WHERE id IN ('32bc9000…','108fbff5…','9d5e35e9…')`. Membros (`estrutura_equipe_membros`) ficam mantidos — equipe inativa não concede mais acesso via estrutura.

### 6. Soft-delete das 5 áreas antigas
`UPDATE estrutura_areas SET is_active = false WHERE id IN (5 ids antigos)`.

### 7. Validação pós-execução
- `SELECT count(*) FROM org_projects WHERE estrutura_area_id IN (5 ids)` → 0.
- `SELECT count(*) FROM tickets WHERE estrutura_area_id IN (5 ids)` → 0.
- `SELECT count(*) FROM estrutura_equipes WHERE area_id = :NEW_AREA_ID AND is_active` → 3.
- `SELECT count(*) FROM area_servicos WHERE estrutura_area_id = :NEW_AREA_ID` → distintos das 5 áreas.

## Impacto no frontend
Nenhum arquivo precisa ser alterado:
- `useEstruturaAreas('tax')` / `useAllActiveAreas` passam a retornar apenas a nova "Tax".
- `useEstruturaEquipesByCategory('tax')` lista as 3 equipes sob "Tax".
- `useProjectMemberAreas` recalcula automaticamente.
- Áreas antigas com `is_active=false` continuam resolvíveis por id em logs/auditoria.

## Riscos
- Permissões via estrutura para membros das equipes desativadas são removidas (fica somente o que houver em `user_page_access` explícito).
- Operação executada em uma única chamada (transação) para garantir atomicidade entre backup, INSERT da nova área, UPDATEs e soft-deletes.

## Reversão
Em caso de problema, restaurar a partir das tabelas `_bkp_psa_unify_20260507_*` (UPDATE de volta), reativar as 5 áreas e 3 equipes (`is_active=true`) e remapear as 3 equipes migradas para suas áreas originais.
