
# Pré-checagem genérica de RLS via RPC única — com extração de role exigida

## Ideia

Uma única função `can_perform(tabela, operação, id)` que:

1. Testa se o usuário atual conseguiria executar a operação (subtransação + rollback).
2. Quando bloqueia, **inspeciona as policies da tabela** para a operação e tenta extrair a role mínima exigida (`has_role_or_higher(auth.uid(), 'X')` ou `has_role(auth.uid(), 'X')`).
3. Devolve um JSON estruturado — o frontend monta mensagens com **templates genéricos**, sem mapa por tabela.

## Contrato de retorno

```jsonc
{
  "allowed": false,
  "reason": "rls_blocked" | "grant_missing" | "trigger_blocked" | "row_not_found",
  "required_role": "lider" | "sublider" | "admin" | null,
  "message": null | "<mensagem da trigger, quando reason=trigger_blocked>"
}
```

## Como funciona

### 1. Execução de teste em subtransação

`SECURITY INVOKER` — RLS é avaliada como o usuário real.

```text
can_perform(p_table text, p_op text, p_id uuid) RETURNS jsonb
  - valida p_table contra allowlist
  - valida p_op ∈ {'update','delete'}
  BEGIN
    EXECUTE 'DELETE FROM <t> WHERE id=$1' USING p_id    -- ou UPDATE noop
    GET DIAGNOSTICS v_rows = ROW_COUNT
    RAISE EXCEPTION 'PRECHECK_OK' USING DETAIL = v_rows::text
  EXCEPTION
    WHEN SQLSTATE 'P0001' AND SQLERRM='PRECHECK_OK' THEN
       se v_rows>0 → { allowed:true }
       se v_rows=0 → reason='rls_blocked', preenche required_role (passo 2)
                     (se a linha realmente não existe, reason='row_not_found')
    WHEN insufficient_privilege THEN
       { allowed:false, reason:'grant_missing' }
    WHEN raise_exception THEN
       { allowed:false, reason:'trigger_blocked', message:SQLERRM }
  END
```

Subtransação garante zero efeito colateral.

### 2. Extração da role exigida

Quando `reason='rls_blocked'`, consulta `pg_policies`:

```sql
SELECT qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename=p_table
  AND cmd IN (UPPER(p_op), 'ALL');
```

Concatena `qual || ' ' || with_check` de todas as policies aplicáveis e roda um regex:

```text
has_role_or_higher\s*\(\s*auth\.uid\(\)\s*,\s*'([a-z_]+)'
has_role\s*\(\s*auth\.uid\(\)\s*,\s*'([a-z_]+)'
```

Coleta todas as roles encontradas e devolve a **menor** segundo a hierarquia
`team_member < sublider < lider < admin`. Se não casar nada, `required_role=null`.

### 3. Diferenciar `rls_blocked` de `row_not_found`

Antes do teste, um `SELECT 1 FROM <t> WHERE id=$1` com `SECURITY DEFINER` (helper interno) checa se a linha existe de fato. Se não existir, retorna `row_not_found` em vez de `rls_blocked` — evita mensagem de permissão enganosa.

## Limitações honestas

- Regex cobre só os helpers `has_role` / `has_role_or_higher` — que são o padrão do projeto. Policies que usam `is_project_member`, `is_area_member` etc. caem em `required_role=null` (frontend usa fallback genérico).
- Cobre **UPDATE e DELETE por id**. INSERT e UPDATE com `WITH CHECK` sobre novos valores ficam para v2.
- Custo: lock momentâneo na linha durante o teste — aceitável para UX de botão.

## Estrutura proposta

### 1. Migração SQL

- Tabela `public.rls_precheck_allowed_tables (table_name text PK, allowed_ops text[])`.
- **Seed inicial:**
  - `('tools', ARRAY['update','delete'])`
  - `('tool_area_access', ARRAY['update','delete'])`
- Função `public.can_perform(p_table text, p_op text, p_id uuid) RETURNS jsonb`.
- `GRANT EXECUTE ... TO authenticated`.

### 2. Hook genérico

`src/hooks/useRlsPrecheck.ts`:

```ts
type PrecheckResult = {
  allowed: boolean;
  reason?: 'rls_blocked' | 'grant_missing' | 'trigger_blocked' | 'row_not_found';
  required_role?: 'team_member' | 'sublider' | 'lider' | 'admin' | null;
  message?: string | null;
};

async function canPerform(table, op, id): Promise<PrecheckResult>
```

### 3. Tradutor genérico (sem mapa por tabela)

`src/lib/rlsMessages.ts` — uma função pura, ~15 linhas:

```ts
const ROLE_LABEL = {
  team_member: 'Membro de equipe',
  sublider:    'Sublíder',
  lider:       'Líder',
  admin:       'Admin',
};

export function rlsMessage(r: PrecheckResult): string {
  if (r.reason === 'trigger_blocked' && r.message) return r.message;
  if (r.reason === 'grant_missing')   return 'Operação não permitida para o seu perfil.';
  if (r.reason === 'row_not_found')   return 'Registro não encontrado ou já removido.';
  if (r.reason === 'rls_blocked' && r.required_role) {
    return `Você precisa do papel "${ROLE_LABEL[r.required_role]}" ou superior para realizar essa ação.`;
  }
  return 'Você não tem permissão para realizar essa ação.';
}
```

### 4. Integração no piloto

Em deletes/updates de `tools` e `tool_area_access` (atualmente em `NovaFerramenta.tsx` e `DetalheFerramenta.tsx` — idealmente encapsular em `useToolsMutations.ts`):

```ts
const pre = await canPerform('tools', 'delete', id);
if (!pre.allowed) throw new Error(rlsMessage(pre));
// segue o delete normal
```

## Plano de rollout

1. Migração: allowlist + `can_perform` + grants + seed (`tools`, `tool_area_access`).
2. `useRlsPrecheck` + `rlsMessages.ts` (genérico).
3. Aplicar nos pontos de update/delete de `tools` e `tool_area_access`.
4. Validar UX e expandir allowlist depois.

## Trade-off vs. mapa por tabela

| Critério | Mapa por tabela | Template genérico via `required_role` |
|---|---|---|
| Manutenção | nova entrada por tabela/op | zero |
| Precisão da mensagem | redação humana fina | "papel X ou superior" — preciso, mas neutro |
| Cobertura de policies não-role | precisa de redação manual | fallback genérico automático |
| Triggers com mensagem custom | ignoradas | repassadas via `message` |
