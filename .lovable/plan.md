## Objetivo

Isolar por cluster as **6 tabelas do módulo Processos** — as 4 filhas listadas na dívida (`documentos_processo`, `etapa_documentos`, `etapa_responsaveis`, `etapa_sistemas`) mais os pais `processes` e `process_stages` — para que membros comuns não leiam/alterem/apaguem linhas de outro cluster. Admin continua vendo tudo.

## Estado atual (verificado no banco)

- Nenhuma dessas 6 tabelas tem mais `USING(true)` — todas já usam `has_role_or_higher('team_member')` para SELECT/UPDATE (e `lider` para DELETE em `processes`/`process_stages`).
- **Nenhuma delas isola por cluster.** Um consultor Tax lê processos e etapas OSG e vice-versa.
- `documentos_processo` tem `cluster_id` direto. Os 3 `etapa_*` linkam ao cluster via `etapa_id → process_stages.process_id → processes.cluster_id`.

## Migration única

### 1. Novo helper SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.process_stages ps
        JOIN public.processes p ON p.id = ps.process_id
        WHERE ps.id = _etapa_id
          AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;
```

Reutiliza `resolve_user_cluster_ids` (já existe).

### 2. Novas policies (DROP + CREATE de cada policy afetada)

Piso de papel:
- **SELECT/UPDATE/INSERT:** `team_member+`
- **DELETE:** `lider+` (endurece `documentos_processo`/`etapa_*`, hoje frouxos em team_member)

Expressão de cluster por tabela:

| Tabela | Cláusula |
|---|---|
| `processes` | `cluster_id = ANY(resolve_user_cluster_ids(auth.uid()))` |
| `process_stages` | `EXISTS (SELECT 1 FROM processes p WHERE p.id = process_stages.process_id AND p.cluster_id = ANY(resolve_user_cluster_ids(auth.uid())))` |
| `documentos_processo` | `cluster_id = ANY(resolve_user_cluster_ids(auth.uid()))` |
| `etapa_documentos` / `etapa_responsaveis` / `etapa_sistemas` | `process_stage_cluster_visivel(etapa_id)` |

Cada policy fica no formato:

```sql
CREATE POLICY <nome> ON public.<tabela> FOR <cmd> TO authenticated
USING  (has_role(auth.uid(),'admin') OR (has_role_or_higher(auth.uid(),'<piso>') AND <clausula_cluster>))
WITH CHECK (has_role(auth.uid(),'admin') OR (has_role_or_higher(auth.uid(),'<piso>') AND <clausula_cluster>));  -- só para INSERT/UPDATE
```

INSERT recebe `WITH CHECK` com a mesma cláusula, para bloquear "criar linha em cluster que não é seu".

### 3. Validação embutida no fim da migration

Query DO-block que roda `SET LOCAL role authenticated; SET LOCAL request.jwt.claim.sub = ...` para dois usuários (um Tax, um OSG) e confere que cada um vê apenas linhas do próprio cluster. Se falhar, aborta.

## Pronto quando

1. ✅ Nenhuma policy dessas 6 tabelas tem `qual='true'` (já ok).
2. ✅ Membro do cluster Tax faz `SELECT` nas 6 tabelas e recebe 0 linhas de OSG (e vice-versa).
3. ✅ Admin continua vendo tudo.
4. ✅ DELETE nas 4 filhas passa a exigir `lider+`, alinhado com o pai.
5. Atualizar `docs/rls/Divida_Tecnica_RLS_Eduardo.md` marcando o bloco "Módulo Processos" como resolvido.

## Riscos e mitigação

- **Órfãos de cluster** (linhas com `cluster_id NULL` em `documentos_processo` ou `processes`): admin lê; team_member não. Verificar quantidade antes de aplicar; se houver massa relevante, backfill separado.
- **Performance dos EXISTS em `etapa_*`**: `process_stages.id` e `processes.id` já são PK, então o join é seek. Sem índice novo.
- **Ordem de DROP/CREATE**: fazer tudo dentro de uma transação; se algo falhar, rollback deixa o estado atual intacto.

## Fora de escopo

- Módulos Gargalos, Melhorias, Sistemas e Justificativas — cada um vira migration própria seguindo o mesmo padrão.
- Mexer em INSERT que hoje seja usado por triggers/edge functions com `service_role` (não afetado: `service_role` bypassa RLS).