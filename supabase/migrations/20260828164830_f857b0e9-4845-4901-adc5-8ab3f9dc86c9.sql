-- audit_logs: gravar o próprio rastro não pode depender de papel.
-- A política antiga exigia has_role_or_higher(auth.uid(),'team_member'), então
-- quem tem papel abaixo disso (client no portal, marketing nas novidades, ou
-- usuário ainda sem linha em user_roles) batia em "new row violates row-level
-- security policy for table audit_logs": ou a ação era abortada (fluxos que
-- usam logActionOrThrow) ou acontecia sem deixar histórico.
-- Quem pode fazer a ação já é decidido pelo RLS da tabela alvo; o log é efeito
-- colateral e deve sempre caber. A leitura continua restrita a team_member+.

drop policy if exists rls_audit_logs_insert on public.audit_logs;

create policy rls_audit_logs_insert
  on public.audit_logs
  for insert
  to authenticated
  with check (performed_by = auth.uid());