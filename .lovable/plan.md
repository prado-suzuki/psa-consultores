## Análise das duas migrações

### 1. `20260609100000_osg_gargalos_melhorias_repopulate.sql` — ✅ SEGURA

**Alteração de schema:** apenas cria a tabela **nova** `gargalo_melhorias` (N:M) com RLS, policies e GRANTs corretos para `authenticated` / `service_role`. Nenhuma coluna de tabela existente é alterada.

**Escopo dos dados:**
- `DELETE FROM public.gargalos WHERE cluster_id = '0523512c-…7a80'` — escopado por UUID OSG exato. Linhas Digital Rotina (`cluster_id IS NULL`) **não casam** e não são tocadas. ON DELETE CASCADE em `gargalo_etapas` / `gargalo_processos` / `gargalo_melhorias` só apaga junções dos gargalos OSG já apagados.
- Todos os INSERTs em `gargalos`, `gargalo_etapas`, `gargalo_processos`, `etapa_documentos`, `melhoria_acoes_td`, `melhoria_processos`, `gargalo_melhorias` usam `mapa_uuid('…')` com slug OSG ou referenciam IDs já OSG.
- Os UPDATEs em `process_improvements` filtram por `id = mapa_uuid('mel-osg-…')` (UUID derivado de slug OSG, determinístico) — só atualizam as 10 melhorias OSG.
- Os 2 INSERTs novos em `process_improvements` setam `cluster_id = OSG`.

**Anti-regressão:** bloco final mede `count(cluster_id IS NULL)` antes/depois em `gargalos` e `process_improvements` e aborta a transação se mudar. Garantia explícita de zero impacto em Digital Rotina.

### 2. `20260610100000_psa_consultores_full.sql` — ⚠️ ATENÇÃO

**Alteração de schema:** apenas `CREATE TABLE IF NOT EXISTS gargalo_melhorias` (idempotente, caso a 1ª não tenha rodado). Nenhuma coluna existente é alterada.

**INSERTs novos (todos `ON CONFLICT DO NOTHING`, com `cluster_id = b21b0b89-…ee3` PSA Consultores):**
- 1 projeto novo (P11), 78 documentos, 16 melhorias, 15 gargalos, junções (`gargalo_etapas`, `gargalo_processos`, `gargalo_melhorias`, `etapa_documentos` ponte para cascata), `projeto_justificativas`. **Nada deletado, nada sobrescrito.**

**Ponto que precisa de aprovação explícita — UPDATEs em linhas hoje "órfãs":**

```sql
-- 10 projects: cluster_id NULL → PSA UUID
UPDATE projects SET cluster_id='b21b0b89-…ee3'
WHERE cluster_id IS NULL AND name IN ('Rotina PSA', 'P2 - Automação SPED', …);

-- 27 processes: cluster_id NULL → PSA + project_id NULL → projeto PSA
UPDATE processes SET cluster_id='b21b0b89-…ee3', project_id='…'
WHERE id='…' AND cluster_id IS NULL;
```

São registros do **mapeamento Fiscal/Tax** que hoje estão com `cluster_id NULL` (ficavam "limbo" entre Digital Rotina e MAPA). A migração os reatribui formalmente ao cluster PSA Consultores.

**Impacto real no Digital Rotina:**
| Consumidor | Impacto |
|---|---|
| `EquipeDaily.tsx`, `EquipeKanban.tsx`, `EquipeSprints.tsx`, `EquipeProjetos.tsx` (leem `processes`/`projects` sem filtrar por `cluster_id`) | **Nenhum** — continuam vendo as mesmas linhas. |
| `useProcessos` / `useProjetos` (filtram `cluster_id NOT NULL` — MAPA) | Esses 27 processos + 10 projetos **passam a aparecer no MAPA** sob o cluster PSA. Intencional. |
| `tickets`, `org_tasks`, `ordem_servico`, `sprints`, `cliente`, `contribuinte` | **Não tocados.** |
| Colunas funcionais usadas pela Rotina (`name`, `description`, `code`, `status`, etc.) | **Não tocadas.** Só `cluster_id` (que era NULL) e `project_id` (que era NULL) são preenchidos. |

**Anti-regressão:** bloco final aborta se `count(processes WHERE cluster_id IS NULL)` **aumentar**. Permite (e espera) que diminua — é o efeito do backfill.

### Validação dos critérios

| Critério solicitado | Migração 1 | Migração 2 |
|---|---|---|
| Não altera **colunas** das tabelas Digital Rotina | ✅ | ✅ |
| Não **deleta** dados Digital Rotina | ✅ | ✅ |
| Não **sobrescreve** dados Digital Rotina | ✅ | ⚠️ Sobrescreve `cluster_id` e `project_id` em 27 processes + 10 projects que **hoje têm esses campos = NULL**. Demais colunas intactas. |
| Migração 1 só altera cluster OSG | ✅ | n/a |

### Decisão necessária

A migração 2 faz o backfill `cluster_id NULL → PSA UUID` em 27 processes + 10 projects. Tecnicamente são "dados do Digital Rotina" (já que cluster NULL = Rotina/legado), mas só preenche campos hoje vazios; nenhuma coluna funcional é alterada e a UI da Rotina (Daily/Kanban/Sprints/Projetos) não filtra por cluster, então continuará vendo tudo igual.

**Opções:**
- **A) Executar as duas na ordem** (recomendado, é o objetivo declarado nas próprias migrações): 1ª, depois 2ª.
- **B) Executar só a 1ª** (OSG) e segurar a 2ª se você quiser revisar o backfill PSA com mais calma.

Aguardando sua escolha (A ou B) para executar via `supabase--migration`.