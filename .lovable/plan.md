# Fix: Admin barrado ao salvar OS — varredura RLS (só escape de admin) + hardening no save

## Objetivo
Eliminar o toast "Sem permissão…" que a Patricia (admin) recebe ao salvar alteração de OS. Causa dupla: (1) policies de escrita que exigem `excluido = false` no `WITH CHECK` (bloqueia soft-delete) e/ou têm cláusula de cluster sem escape de admin; (2) o save no front ignora `error` em alguns writes, mascarando falhas e gerando resíduo (rateios duplicados, audit "deleted" órfão).

Decisão do responsável: **admin não deve ter restrição em alteração de dados** — a correção é varredura, mas só afrouxa para admin. Nenhuma outra role muda.

---

## Passo 1 — Pré-voo 1 (reprodução na identidade da Patricia, não destrutivo)

Rodar o bloco exato do briefing (BEGIN … ROLLBACK) como **query ad hoc**. Se for necessário usar migration temporária, **apagar o arquivo** depois — não deixar em `supabase/migrations/`, senão o DML volta a rodar em outros ambientes.

Regras:
- Aborta se `current_user <> 'authenticated'` ou `auth.uid() <> Patricia`.
- Saída em `_res` temp table, listada com `SELECT` antes do `ROLLBACK`.
- Se abortar por identidade: **não** contornar; ir para Postgres Logs (SQLSTATE 42501 desde 2026-07-29 17:30).

Objetivo: confirmar quais steps caem em 42501 (esperado ao menos `rateio/soft-delete` e `os/soft-delete`).

## Passo 2 — Pré-voo 2 (varredura somente-leitura)

Três queries do briefing, sem modificação:
- **(A)** policies de ESCRITA com cláusula de cluster/`cliente_visivel_para` — marcar quais **não** têm ramo de admin.
- **(B)** policies UPDATE/ALL com `WITH CHECK` referenciando `excluido`.
- **(C)** relatório de resíduo em `distribuicao_receita`. Somente relatar.

Também rodar (A) com `cmd = 'SELECT'` **apenas para relatório**, sem alterar.

## Passo 3 — Correção no banco (migration única) — REGRA ÚNICA

Para cada linha de **(A)** e **(B)**, aplicar exatamente a mesma transformação: **nunca remover cláusula, nunca alterar nível de papel, nunca mexer em roles** — apenas prefixar o escape de admin, preservando a expressão original palavra por palavra:

```sql
USING (public.has_role(auth.uid(),'admin'::app_role) OR (<qual original>))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR (<with_check original>))
```

Nas policies de **(B)** o `excluido` **permanece** dentro da expressão original — o objetivo é liberar admin, **não** liberar sublider+. Se a policy for `FOR ALL`, aplicar nas duas cláusulas. Não recriar policy que já tenha ramo de admin.

**Escopo restrito — apenas estas 8 tabelas:** `cliente`, `cliente_clusters`, `ordem_servico`, `distribuicao_receita`, `os_produtos_contratados`, `contribuinte`, `inscricao_contribuinte`, `representante`.

Qualquer policy fora dessa lista que apareça em (A) ou (B) entra **só como relatório**, sem alteração — o filtro `ILIKE '%excluido%'` casa com tabelas de módulos sem relação com este bug.

**Efeito esperado por role (requisito de aceite):**
- admin: passa a alterar e excluir sem restrição nessas 8 tabelas.
- sublider, lider, team_member, client: comportamento **idêntico** ao atual, inclusive seguir barrados no soft-delete onde hoje são barrados.

Não tocar policies de SELECT. Não mexer em `can_perform`, `rls_precheck_allowed_tables`, triggers.

## Passo 4 — Hardening no front (`src/hooks/useSaveClientTransaction.ts`)

**a) Soft-delete das OS removidas.** Trocar `.update({excluido:true}).in("id", ids)` por versão com `.select("id")`; se `error` → `throw`; se `data.length < removedOsIds.length` → erro explícito listando ids ausentes; `logAction("deleted")` só para os retornados. Se o `RETURNING` voltar vazio mesmo com sucesso (a policy de SELECT de `ordem_servico` exige `excluido = false`), trocar a checagem por `count` no banco em vez do retorno do PostgREST.

**b) Mesma conferência de `error`** nos demais writes de `ordem_servico` e `distribuicao_receita` que hoje a ignoram. **Preservar** a reconciliação linha a linha atual — **não** voltar ao padrão delete+reinsert (foi ele que gerou as 4 linhas duplicadas de CC-0007).

**c) No `catch`,** manter variável com o passo corrente (`tabela/op`) atualizada antes de cada write e incluí-la no toast de RLS: *"Sem permissão para atualizar cliente (tabela/op). Fale com a liderança."* Manter `console.error` do objeto cru. Sem refactor de `Error{cause}`.

## Fora de escopo
- Policies de SELECT (só relatório).
- Policies fora das 8 tabelas listadas.
- `can_perform`, `rls_precheck_allowed_tables`, triggers existentes.
- Limpeza das linhas duplicadas de rateio de (C) — frente separada.
- Não excluir a OS 026/2026 por SQL (3 `org_projects` ativos; ação da usuária pela tela).

## GATE
1. Pré-voo 1 imprime `identidade user=authenticated`; após correção, **todas** as linhas OK, em especial `rateio/soft-delete` e `os/soft-delete`.
2. (A) e (B) re-executados: nenhuma linha das 8 tabelas com `tem_ramo_admin = false`; toda policy corrigida preserva a expressão original íntegra dentro do `OR`.
3. Patricia: abrir OS do cliente `35419187…`, remover as 3 duplicatas de CC-0007 deixando 1 a 100%, salvar — sem toast; banco fica com exatamente 1 linha ativa.
4. Patricia: em dev, criar cliente novo com 1 contribuinte, 1 representante, 1 OS com rateio + produto; editar a OS; excluir o cliente de teste pela tela. Quatro passos sem toast.
5. **Prova de não afrouxamento:** rodar o bloco do pré-voo 1 duas vezes — uma com o `sub` de um sublider, uma com o `sub` de um team_member — **antes e depois** da correção. O status de cada linha tem que ser **idêntico** nas duas rodadas. Qualquer linha que saia de `FALHOU` para `OK` para essas roles reprova a entrega e tem que ser revertida.
6. `SELECT id, name FROM org_projects WHERE ordem_servico_id='d30e4183-…'` mantém 3 linhas. Listagem de OS de outros clientes inalterada.

## Observação (registro, não pedido de mudança)
Com a regra única, sublider que editar rateio ou remover OS passa a receber **erro claro** onde hoje duplica em silêncio. Continua sem conseguir a operação — só deixa de corromper dado. Se sublider precisar dessas operações no futuro, decisão tabela por tabela, em frente separada.
