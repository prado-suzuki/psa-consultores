
# Refino v5 — Ajustes finais sobre o v4 (seções afetadas)

Substitui pontualmente as seções indicadas do v4. As demais partes do v4 permanecem válidas.

---

## 1. Resumo executivo (ajuste sobre §1 do v4)

Mantém-se a v4. Reforços:

- A view `public.profiles_safe` passa a ter `security_invoker = false` **e** `security_barrier = true`. A segurança vem do **filtro de autorização embutido** (`WHERE has_role_or_higher(auth.uid(), 'team_member'::app_role)`) somado à **projeção exclusiva de colunas não-sensíveis** (`id, first_name, last_name`). Não descrever a proteção como "curto-circuito por linha".
- Implantação em três passos distintos para evitar janela em que o portal fica sem nome do atendente: **Migration A** (RPCs), **deploy do frontend** (portal passa a consumir as RPCs), **Migration B** (redefinição da view).

## 4. Decisão D2.2 (ajuste)

- **D2.2 (revisada)** — **preferir manter o owner atual** de `public.profiles_safe`. Só executar `ALTER VIEW ... OWNER TO postgres` se:
  1. o owner atual **não** tem `BYPASSRLS`, **e**
  2. o novo owner é permitido pelo ambiente Supabase (executar o `ALTER OWNER` em uma migration de teste antes; se falhar, abortar).
  
  Verificação:
  ```
  SELECT c.relowner::regrole AS owner, r.rolbypassrls
  FROM pg_class c
  JOIN pg_roles r ON r.oid = c.relowner
  WHERE c.oid = 'public.profiles_safe'::regclass;
  ```
  Se `rolbypassrls = true`, **não** trocar owner. Se `false`, avaliar (D2.4) qual role usar sem quebrar o deploy.

- **Nova D2.4** — caso a troca de owner seja necessária mas rejeitada pelo ambiente, o fallback é o plano v3 (RPCs + DROP VIEW).

## 6.2 Redefinir `public.profiles_safe` (substitui §6.2 do v4)

- **Objetivo**: preservar consumidores internos e bloquear enumeração por `client`, com a barreira posicionada na projeção da view antes que o planner promova predicados do consumidor para dentro dela.
- **Alteração prevista (desenho)**:
  ```
  CREATE OR REPLACE VIEW public.profiles_safe
  WITH (
    security_invoker = false,
    security_barrier = true
  ) AS
    SELECT p.id, p.first_name, p.last_name
    FROM public.profiles p
    WHERE public.has_role_or_higher(auth.uid(), 'team_member'::app_role);

  -- Owner: manter o atual se ele já tiver BYPASSRLS (ver D2.2).
  -- Só executar ALTER VIEW ... OWNER TO ... se estritamente necessário e permitido.

  REVOKE ALL ON public.profiles_safe FROM PUBLIC;
  REVOKE ALL ON public.profiles_safe FROM anon;
  GRANT  SELECT ON public.profiles_safe TO authenticated;
  GRANT  SELECT ON public.profiles_safe TO service_role;
  ```
- **Justificativa dos flags**:
  - `security_invoker = false`: a view executa com privilégios do owner, que pode ler `public.profiles`.
  - `security_barrier = true`: impede que predicados fornecidos pelo consumidor sejam empurrados para dentro da view antes do `WHERE` de autorização e antes que a projeção elimine colunas sensíveis. Não é o `WHERE` sozinho que garante a proteção — é a combinação **projeção restrita + filtro de papel + barreira**.
- **Objetos**: view `public.profiles_safe`.
- **Dependências**: 6.1 e D2.1..D2.4 resolvidos. **Só entra em Migration B** — nunca antes do deploy do frontend (§13).
- **Teste positivo**:
  - `team_member`, `lider`, `admin`: `SELECT count(*) FROM public.profiles_safe` = N.
  - `anon`: `permission denied`.
- **Teste negativo**:
  - `client`: 0 linhas.
  - `authenticated` sem `auth.uid()` válido: 0 linhas.
  - Se `pg_class.relforcerowsecurity('profiles') = true`, plano bloqueado (D2.1).
- **Risco**: baixo se 6.1 e D2.2 confirmados.

## 6.3 Endurecer `get_internal_users`

Sem mudanças em relação ao v4. Vai na Migration A junto com as RPCs do portal.

## 6.4 / 6.5 RPCs do portal

Sem mudanças em relação ao v4. Ambas na Migration A.

## 13. Estratégia de aplicação (substitui §13 do v4)

Três passos separados e ordenados. Cada passo é aprovado independentemente.

1. **Migration A — `rls_tarefa1_rpcs.sql`**
   - `CREATE OR REPLACE FUNCTION public.get_internal_users()` com guarda (§6.3).
   - `CREATE FUNCTION public.get_ticket_atendentes(uuid[])` (§6.4).
   - `CREATE FUNCTION public.get_clusters_do_cliente_atual()` (§6.5).
   - Padrão de segurança (§8 do v3/v4): `SET search_path = public`, `REVOKE ... FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`, guarda `auth.uid() IS NOT NULL`.
   - **Não** toca em `profiles_safe`.
   - Aprovada + aplicada.

2. **Deploy frontend** (sem migration)
   - `src/hooks/useTickets.ts` — trocar o embed em `useMyTickets` (linha 86) por chamada em lote a `get_ticket_atendentes`. Mapear o resultado para preservar `assigned_agent: { first_name, last_name } | null`. Nenhuma outra chamada em `useTickets.ts` muda.
   - `src/hooks/useTicketNotifications.ts` — refatorar apenas se confirmado como portal (§18 do v4 pergunta pendente). Caso interno, permanece em `profiles_safe`.
   - `src/hooks/useClienteClusters.ts` — consumir `get_clusters_do_cliente_atual`, preservando `{ clusters, clienteId }`.
   - Publicar em produção. Nesse ponto, os selects atuais em `profiles_safe` do portal (embed) **ainda funcionam** porque a view **ainda não foi redefinida**; não há janela sem atendente.

3. **Migration B — `rls_tarefa1_profiles_safe.sql`**
   - `CREATE OR REPLACE VIEW public.profiles_safe ...` (§6.2), grants ajustados. Se necessário e permitido, `ALTER VIEW ... OWNER TO ...` (D2.2).
   - Aplicar somente depois do deploy do passo 2 estar em produção e verificado (matriz §10.1 do v4).
   - Se a view for eventualmente removida (não é o caso aqui), a validação é `to_regclass('public.profiles_safe') IS NULL`.

Depois de B, seguem Migrations 2a (`rls_tarefa2_cliente_isolamento.sql`) e 2b (`rls_tarefa2_centros_custo.sql`) do v3/v4, cada uma isolada.

Validação por migration: `supabase db lint` no CLI; se indisponível, Database Linter/Advisors — registrar a limitação no documento único.

## 14. Estratégia forward-only (ajuste sobre §14 do v4)

Adição: antes da **Migration B**, capturar a definição atual da view com `pg_get_viewdef('public.profiles_safe'::regclass, true)` e os `reloptions` de `pg_class`, e **incluir esse texto como comentário** dentro da própria Migration B para permitir reconstituição via migration corretiva futura. Reconstrução de policies continua via `pg_get_expr(polqual, polrelid)` / `pg_get_expr(polwithcheck, polrelid)` sobre `pg_policy`.

## 17. Critérios objetivos de pronto (ajuste sobre §17 do v4)

- Adicionar: `pg_class.reloptions` de `public.profiles_safe` inclui **ambos** `security_invoker=false` e `security_barrier=true`.
- Adicionar: histórico de deploy demonstra que **Migration A** e **deploy frontend** foram concluídos **antes** de **Migration B** (sem janela em que a view estivesse redefinida sem que o portal já tivesse migrado).
- Remover qualquer critério que descreva a proteção como "curto-circuito por linha".

## 19. Sequência final de execução (substitui §19 do v4)

1. **Fase 0 — Gate**: D1..D8 + D2.1..D2.4.
2. **Fase 1a — Migration A** (RPCs) conforme §13.
3. **Fase 1b — Deploy frontend** (3 hooks do portal) conforme §13.
4. **Fase 1c — Migration B** (redefinição de `profiles_safe` com `security_invoker=false, security_barrier=true`, grants ajustados, owner só se necessário e permitido).
5. **Fase 2a — `cliente.SELECT` por cluster** (§7.1 do v3).
6. **Fase 2b — `centros_custo` → team_member+** (§7.2 do v3).
7. **Fase 3 — Regressão** portal + internos (§12 do v3). Cobrir explicitamente que `Desempenho*`, `Equipe*`, `Kanban`, `Sprints`, `Reports` continuam populando via `profiles_safe`.
8. **Fase 4 — `contatos`**: bloqueada por D1.
9. **Fase 5 (fora deste plano)** — Escrita em `cliente` (§11 do v3).

---

**Notas de descrição**: ao comunicar o desenho, dizer que a proteção da view vem de (i) **filtro de autorização** com `has_role_or_higher(auth.uid(), 'team_member')`, (ii) **projeção exclusiva** de `id, first_name, last_name`, e (iii) **`security_barrier = true`** para evitar predicate pushdown do consumidor. Não usar "curto-circuito por linha".
