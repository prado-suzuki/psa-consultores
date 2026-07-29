# Correção estrutural: policies admin dedicadas em 8 tabelas

## Objetivo
Encerrar o 42501 do admin (Patricia) no save de OS de forma estrutural: em vez de continuar afrouxando expressões existentes uma a uma (e descobrir o próximo bloqueio no próximo save — o último foi o SELECT reaplicado como implicit WITH CHECK do RETURNING), o admin ganha 4 policies PERMISSIVE dedicadas por tabela, incondicionais. As policies atuais permanecem intocadas e continuam regendo sublider/lider/team_member/client.

## Escopo — 8 tabelas
`cliente`, `cliente_clusters`, `ordem_servico`, `distribuicao_receita`, `os_produtos_contratados`, `contribuinte`, `inscricao_contribuinte`, `representante`.

## Migration única (reexecutável)

Para cada tabela acima, dropar-se-existir e criar 4 policies nomeadas `admin_full_<tabela>_<cmd>`:

```sql
DROP POLICY IF EXISTS admin_full_<t>_select ON public.<t>;
CREATE POLICY admin_full_<t>_select ON public.<t>
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS admin_full_<t>_insert ON public.<t>;
CREATE POLICY admin_full_<t>_insert ON public.<t>
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS admin_full_<t>_update ON public.<t>;
CREATE POLICY admin_full_<t>_update ON public.<t>
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS admin_full_<t>_delete ON public.<t>;
CREATE POLICY admin_full_<t>_delete ON public.<t>
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
```

Total: **32 policies novas** (8 tabelas × 4 comandos). Todas PERMISSIVE, `TO authenticated`, nunca `public`.

## Limpeza pontual em `ordem_servico`

No mesmo arquivo de migration, remover resquícios de investigação, se existirem:
```sql
DROP POLICY IF EXISTS debug_admin_uncond ON public.ordem_servico;
DROP POLICY IF EXISTS rls_ordem_servico_update_admin ON public.ordem_servico;
```
Motivo: `debug_admin_uncond` era `USING(true) WITH CHECK(true)` para qualquer authenticated (inclusive `client`) — não pode ficar.

## Regras absolutas
- **Não alterar/recriar/remover** nenhuma policy existente das 8 tabelas nem de outra (exceto os 2 DROPs de debug acima).
- Nada RESTRICTIVE.
- Nunca `TO public`; sempre `TO authenticated`.
- Não mexer em `can_perform`, `rls_precheck_allowed_tables`, triggers, nem no front.

## GATE (verificações pós-migration)

1. `SELECT policyname, cmd, permissive, roles FROM pg_policies WHERE schemaname='public' AND tablename IN (...) ORDER BY tablename, cmd;` — 32 policies novas visíveis como PERMISSIVE/authenticated; policies antigas com nome/cmd/qual/with_check inalterados.
2. Patricia salva OS 035/2026 do cliente `35419187…` removendo 3 duplicatas de rateio → sem toast, 1 linha ativa.
3. Patricia: fluxo full CRUD em cliente de teste (criar, editar OS, excluir) — 4 passos sem toast.
4. Team_member e sublider de outro cluster: comportamento idêntico ao anterior à migration.
5. `pg_policies` de `ordem_servico` sem `debug_admin_uncond` nem `rls_ordem_servico_update_admin`.

## Efeito colateral conhecido e aceito
Admin com SELECT incondicional passa a enxergar linhas `excluido = true` em queries que não filtrem. Front já filtra `excluido = false` em todas as telas relevantes; a única exceção é o gerador de número de OS, onde contar apagadas é benéfico (evita reaproveitar número).

## Fora de escopo
- Qualquer mudança no front (`useSaveClientTransaction.ts` fica como está).
- Limpeza dos dados residuais de `distribuicao_receita` (frente separada).
- Policies fora dessas 8 tabelas.
