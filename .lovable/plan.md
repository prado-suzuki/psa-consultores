## Pré-voo (executado, somente leitura)

**Policies de escrita já estão no formato pretendido** (sublider+, sem `excluido` no WITH CHECK):

- `ordem_servico` — INSERT/UPDATE/DELETE: `has_role_or_higher(auth.uid(),'sublider')`. UPDATE/DELETE têm `excluido=false` só no USING. ✔ igual ao spec.
- `distribuicao_receita` — mesmo padrão. ✔
- `os_produtos_contratados` — INSERT/UPDATE/DELETE: `has_role_or_higher(...,'sublider')`. Sem coluna `excluido`. ✔
- `cliente_clusters` — `admin_manage_cliente_clusters` (ALL, admin) + `sublider_or_higher_manage_own_cluster_links` (ALL, sublider+ E `cluster_id ∈ resolve_user_cluster_ids(uid)`). Existe também `admin_full_access_cliente_clusters` com `roles = {public}` — anômalo, fora do escopo.

**Triggers de escrita nas 3 tabelas da OS:** nenhum (`pg_trigger` retornou vazio, ignorando internos).

**OS 026/2026:** `excluido=false`, `updated_at=2026-03-24 18:16:04Z` — soft-delete de fato não pegou (confirma o defeito do front).

**Papel da Patricia:** `is_admin=true`, `is_sublider=true`.

**`rls_precheck_allowed_tables`:** `distribuicao_receita` **já está** registrada (update+delete). `ordem_servico` também. **Faltam apenas** `os_produtos_contratados` e `cliente_clusters`.

### Consequência para o plano

Como as policies já batem com o alvo, a migration de RLS vira uma **reasserção idempotente** — não muda comportamento observável do banco para admin/sublider. O toast 42501 da Patricia (admin) provavelmente **não** vem das policies de escrita da OS/rateio/produtos. Suspeitos remanescentes:

1. `cliente_clusters` INSERT quando o save tenta vincular um cluster **fora** do set da Patricia — mas admin passa pela policy `admin_manage_cliente_clusters`, então só falharia se `has_role(uid,'admin')` estivesse retornando false em runtime (JWT stale, refresh de sessão) ou se a policy `admin_full_access_cliente_clusters` com `roles={public}` estiver interagindo mal. Manter fora de escopo conforme instrução, mas registrar.
2. O erro chega cru porque o `catch` genérico não nomeia tabela/operação — a correção do front (item 3/4) resolve isso e passa a mostrar qual write falhou no próximo salvamento.

Portanto o plano abaixo mantém as 4 frentes solicitadas, apenas explicitando que a frente 1 é hardening idempotente e a real captura do erro virá pelas frentes 3 e 4.

---

## Plano de execução

### 1. Migration de RLS (idempotente, mesmo formato de 20260714174809)

Nova migration em `supabase/migrations/` com, para cada policy alvo, `DROP POLICY IF EXISTS ... CREATE POLICY ...` (sem RESTRICTIVE encontrado no pré-voo — nada a remover além das próprias policies homônimas):

- `ordem_servico`: recriar `rls_ordem_servico_insert/update/delete` com `TO authenticated`, USING `excluido = false AND has_role_or_higher(auth.uid(),'sublider')` (UPDATE/DELETE), WITH CHECK `has_role_or_higher(auth.uid(),'sublider')` (INSERT/UPDATE), sem cláusula de cluster.
- `distribuicao_receita`: idem estrutura, mesmas cláusulas.
- `os_produtos_contratados`: idem, sem `excluido`.

Não tocar em: policies de SELECT, `cliente_clusters` (fora de escopo — anomalia `roles={public}` fica anotada para outra frente), `cliente`, `contribuinte`, `representante`, `inscricao_contribuinte`, `org_projects`, `org_tasks`, `can_perform`, triggers existentes.

### 2. Registrar tabelas em `rls_precheck_allowed_tables`

Migration com `INSERT ... ON CONFLICT DO UPDATE` para:

- `os_produtos_contratados` → `ARRAY['update','delete']`
- `cliente_clusters` → `ARRAY['update','delete']`

`distribuicao_receita` já está registrada — não reinserir.

### 3. Front — `src/hooks/useSaveClientTransaction.ts`

- Soft-delete de OSs removidas: trocar `.update({excluido:true}).in("id", ids)` por versão com `.select("id")`, checar `if (error) throw error`, e falhar com erro explícito quando `data.length < removedOsIds.length` (listar os IDs que não voltaram). Só emitir `logAction("deleted", ...)` para as OSs efetivamente retornadas.
- Mesma conferência (`select("id")` + `throw` + comparação de contagem) nos demais writes de `ordem_servico` e `distribuicao_receita` que hoje ignoram `error` (linhas 265, 552-568). Preservar reconciliação linha-a-linha atual — não voltar ao padrão delete+reinsert.

### 4. Front — mensagem de erro nomeando tabela e operação

No `catch` da transação, quando o erro tem `code === '42501'` ou `message` contém "row-level security", enriquecer o toast com `(tabela/op)` derivados do contexto do write que falhou. Estratégia:

- Cada write passa a lançar um `Error` customizado com `.cause = { table, op }`.
- O `catch` central formata: `"Sem permissão para <op> em <tabela>. Fale com a liderança."`.
- Manter `console.error` do objeto Postgres cru para debug.

Não alterar copy dos toasts fora de casos RLS.

---

## GATE (validação após implementação)

1. Como admin (Patricia), editar OS 026/2026 e salvar sem alterações estruturais: sem toast de permissão; `SELECT count(*) FROM os_produtos_contratados WHERE ordem_servico_id='d30e4183...'` continua = 3; `distribuicao_receita` da OS não duplica.
2. Como admin, remover a OS 026/2026 e salvar: `SELECT excluido, updated_at FROM ordem_servico WHERE id='d30e4183-...'` retorna `excluido=true` e `updated_at` recente. Reabrir tela não a reativa (USING bloqueia).
3. Como sublider (com Agro no cluster): cenários 1 e 2 funcionam. Como team_member: bloqueado, sem audit `deleted` gravado.
4. Forçar falha (usuário sem permissão numa das 3 tabelas): toast nomeia tabela/op; `audit_logs` não recebe `deleted` órfão.
5. `SELECT id, nome FROM org_projects WHERE ordem_servico_id='d30e4183-...'` mantém as 3 linhas. Listagem de OS de outros clientes não muda.

Se após a frente 1 a Patricia **ainda** ver 42501, a frente 4 vai mostrar exatamente qual tabela/op — provavelmente `cliente_clusters/insert`, e aí abrimos frente separada para tratar as anomalias daquela tabela (fora do escopo desta).
