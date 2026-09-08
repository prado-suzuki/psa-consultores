-- Remover titular de matrícula/bem passa a exigir team_member, não líder.
--
-- O sintoma era "não consigo deletar titular": o botão confirmava, a lista
-- recarregava e o titular continuava lá. Não era bug de tela — era a política
-- de DELETE pedindo `lider`, e a recusa da RLS no Postgres não volta erro,
-- volta ZERO linhas. O app anunciava sucesso e refazia a leitura, que trazia
-- a linha de novo.
--
-- Por que baixar para `team_member` em vez de só consertar o aviso: a mesma
-- pessoa que não podia excluir JÁ podia inserir (`team_member+ can insert
-- titularidade`) e JÁ podia repontar o titular de uma linha existente
-- (`team_member+ can update titularidade`). Update + insert é delete com
-- passos extras, então a trava de exclusão não protegia nada — só obrigava a
-- corrigir errado. As três escritas da mesma tabela filha passam a pedir o
-- mesmo papel.
--
-- O que NÃO muda: `bem`, `matricula`, `pessoa` e `impedimento` seguem exigindo
-- `lider` para excluir. Ali a exclusão apaga a entidade e o que pende dela em
-- cascata, e o papel mais alto é a intenção, não um resquício.
--
-- O recorte por cluster continua sendo a política de SELECT
-- (`osg_cluster_select_titularidade`): quem não vê o cliente não acha a linha
-- para excluir.

drop policy if exists "lider+ can delete titularidade" on public.titularidade;
drop policy if exists "team_member+ can delete titularidade" on public.titularidade;

create policy "team_member+ can delete titularidade"
  on public.titularidade
  for delete
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));
