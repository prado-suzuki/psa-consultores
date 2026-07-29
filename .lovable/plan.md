
# Diagnóstico + correção do "Sem permissão" no save de OS (Patricia) — v2

## Fatos já fechados

- Toast sai de **um único ponto**: `src/hooks/useSaveClientTransaction.ts:856`, e **só** quando `error.code === '42501'` ou mensagem contém `row-level security` / `violates row` / `permission denied`. Guards de front caem em outro branch com texto diferente. **Logo é 42501 real do Postgres.**
- Pré-voos descartaram: policies de escrita de `ordem_servico`, `distribuicao_receita`, `os_produtos_contratados` (formato alvo, sem trigger); RESTRICTIVE em qualquer das 9 tabelas; GRANTs de `authenticated`; `cliente_clusters` (admin tem ramo permissivo).
- Patricia é `admin=true`, mas `resolve_user_cluster_ids` = `[Digital]`. Cliente Agro Amazônia só em `PSA Consultores`. Qualquer policy com cluster **sem escape de admin** a barra.

## Passo 1 — Captura (não destrutivo, ROLLBACK + trava de identidade + saída em temp table)

Bloco a executar. Aborta se `current_user <> authenticated` ou `auth.uid() <> Patricia` (evita falso positivo se runner rodar como postgres/service_role e bypassar RLS). Resultado vai para temp table `_res` retornada por `SELECT` antes do `ROLLBACK`. Soft-delete da OS foi para o final para não alterar estado dos testes anteriores. `audit_logs` usa `performed_by` (não `user_id`, que não existe).

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"fb81a718-124e-45e2-bab5-b0241738c7b7","role":"authenticated","aud":"authenticated"}';

CREATE TEMP TABLE _res(ord serial, step text, status text) ON COMMIT DROP;

DO $$
DECLARE n int;
BEGIN
  IF current_user <> 'authenticated' OR auth.uid() IS DISTINCT FROM 'fb81a718-124e-45e2-bab5-b0241738c7b7'::uuid THEN
    RAISE EXCEPTION 'Identidade nao aplicada: current_user=% auth.uid()=%. Abortado.', current_user, auth.uid();
  END IF;
  INSERT INTO _res(step,status) VALUES ('identidade', format('user=%s is_admin=%s', current_user, public.has_role(auth.uid(),'admin'::app_role)));

  BEGIN UPDATE public.cliente SET nome = nome WHERE id='35419187-0d64-437b-b61e-a59a20855d26';
    GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _res(step,status) VALUES ('cliente/update','OK rows='||n);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('cliente/update','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN UPDATE public.ordem_servico SET situacao = situacao WHERE id='d30e4183-dc17-4ab0-a4fe-1d35ce2daac2';
    GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _res(step,status) VALUES ('os/update','OK rows='||n);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('os/update','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN DELETE FROM public.os_produtos_contratados WHERE ordem_servico_id='d30e4183-dc17-4ab0-a4fe-1d35ce2daac2';
    GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _res(step,status) VALUES ('produtos/delete','OK rows='||n);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('produtos/delete','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN INSERT INTO public.os_produtos_contratados (ordem_servico_id, produto_segmento_id)
        SELECT ordem_servico_id, produto_segmento_id FROM public.os_produtos_contratados
        WHERE ordem_servico_id='d30e4183-dc17-4ab0-a4fe-1d35ce2daac2' LIMIT 1;
    INSERT INTO _res(step,status) VALUES ('produtos/insert','OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('produtos/insert','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN UPDATE public.distribuicao_receita SET percentual_rateio = percentual_rateio
        WHERE id='62796cf3-e97a-491f-9998-30ae024c31eb';
    GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _res(step,status) VALUES ('rateio/update','OK rows='||n);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('rateio/update','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN INSERT INTO public.distribuicao_receita (id_ordem_servico, id_centro_custo, percentual_rateio)
        SELECT id_ordem_servico, id_centro_custo, percentual_rateio FROM public.distribuicao_receita
        WHERE id='62796cf3-e97a-491f-9998-30ae024c31eb';
    INSERT INTO _res(step,status) VALUES ('rateio/insert','OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('rateio/insert','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
        VALUES ('35419187-0d64-437b-b61e-a59a20855d26','b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3');
    INSERT INTO _res(step,status) VALUES ('cliente_clusters/insert','OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('cliente_clusters/insert','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN INSERT INTO public.audit_logs (area, entity_type, entity_id, entity_name, action, performed_by)
        VALUES ('dev','ordem_servico','d30e4183-dc17-4ab0-a4fe-1d35ce2daac2','026/2026','updated', auth.uid());
    INSERT INTO _res(step,status) VALUES ('audit/insert','OK');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('audit/insert','FALHOU '||SQLSTATE||' '||SQLERRM); END;

  BEGIN UPDATE public.ordem_servico SET excluido = true WHERE id='d30e4183-dc17-4ab0-a4fe-1d35ce2daac2';
    GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO _res(step,status) VALUES ('os/soft-delete','OK rows='||n);
  EXCEPTION WHEN OTHERS THEN INSERT INTO _res(step,status) VALUES ('os/soft-delete','FALHOU '||SQLSTATE||' '||SQLERRM); END;
END $$;

SELECT ord, step, status FROM _res ORDER BY ord;
ROLLBACK;
```

**Se abortar** (identidade não aplicada): **não** contornar. Fallback = Postgres Logs filtrando SQLSTATE `42501` a partir de 2026-07-29 17:30 e trazer a mensagem (nomeia a tabela).

## Passo 2 — Correção cirúrgica (só na tabela/op apontada pelo passo 1)

- `has_role_or_higher(auth.uid(),'sublider'::app_role)` como papel base.
- **Sem** cláusula de cluster e **sem** `excluido=false` no `WITH CHECK`. `excluido=false` só no `USING` de UPDATE/DELETE.
- Se a policy que falhou já traz cluster ou `cliente_visivel_para`, **não remover** — acrescentar `has_role(auth.uid(),'admin'::app_role) OR` no início como escape.
- Não recriar policies que o pré-voo já validou.
- **Ressalva B**: escape de admin libera Patricia porque ela é admin; sublíder de outro cluster continua barrado na mesma policy — comportamento esperado do isolamento. Não registrar como "resolvido para todos os perfis".

## Passo 3 — Front (independe do passo 1)

Em `src/hooks/useSaveClientTransaction.ts`:

a) **Soft-delete das OS removidas**: trocar `.update({excluido:true}).in("id", ids)` por versão com `.select("id")`, `if (error) throw error`, e erro explícito quando `data.length < removedOsIds.length` listando ids ausentes. `logAction("deleted")` só para os retornados.
Prova: OS 026/2026 continua `excluido=false` com `updated_at` de 2026-03-24 apesar de dois `audit_logs "deleted"` hoje (17:37 e 17:38).
**Ressalva A**: `UPDATE ... RETURNING` no soft-delete pode voltar zero linhas porque a policy de SELECT de `ordem_servico` exige `excluido=false`. Se isso acontecer, o guard lança erro falso numa exclusão bem-sucedida. Validar no GATE; se o retorno vier vazio mesmo com sucesso, trocar a checagem por `count` no banco (`SELECT count(*) WHERE id IN (...) AND excluido=true`) em vez do retorno do PostgREST.

b) Mesma conferência nos demais writes de `ordem_servico` e `distribuicao_receita` que hoje ignoram `error`. **Preservar** a reconciliação linha a linha atual (protege o fix do rateio de hoje).

c) No `catch`, manter variável com passo corrente (`tabela/op`) atualizada antes de cada write e incluí-la no toast de RLS: *"Sem permissão para atualizar cliente (tabela/op). Fale com a liderança."* Manter `console.error` do objeto cru. Só a variável de passo, sem refactor de `Error{cause}`.

## Fora de escopo

- Policies de SELECT.
- Qualquer tabela que não seja a apontada no passo 1.
- `can_perform`, `rls_precheck_allowed_tables`, triggers existentes.
- **Não excluir** a OS 026/2026 por SQL — ação da usuária na tela (3 `org_projects` ativos vinculados; soft-delete sem volta pela UI).

## GATE

0. **Item extra**: confirmar que o passo 1 imprimiu a linha `identidade` com `user=authenticated`. Sem ela, resultado inválido — não serve de base para o passo 2.
1. Repetir o bloco do passo 1 pós-correção: todas as linhas OK, em especial a que falhou.
2. Como Patricia, editar OS 026/2026 e salvar: sem toast; count de OS = 3 e `distribuicao_receita` não duplica.
3. Como Patricia, remover OS 026/2026 e salvar (após confirmação com ela): `SELECT excluido, updated_at FROM ordem_servico WHERE id='d30e4183-...'` → `excluido=true`, `updated_at` recente. Validar ressalva A: se `.select("id")` voltou zero mas o update funcionou, trocar pela checagem por `count`.
4. `team_member` continua bloqueado, toast nomeando tabela/op e sem `audit "deleted"` órfão.
5. `SELECT id, name FROM org_projects WHERE ordem_servico_id='d30e4183-...'` mantém as 3 linhas. Listagem de OS de outros clientes inalterada.
