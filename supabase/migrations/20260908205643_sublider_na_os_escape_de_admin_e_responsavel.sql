-- 20260908205643_sublider_na_os_escape_de_admin_e_responsavel.sql
-- Sprint 13 / go-live: admin volta a poder enviar solicitação, e responsável e líder
-- do projeto passam a contar como participantes.
--
-- `sublider_na_os` é a ÚNICA condição das SEIS policies de escrita de `solicitacao` e
-- `solicitacao_item` (INSERT, UPDATE e DELETE de cada uma). Mexer aqui move as seis.
--
-- O QUE ESTAVA ERRADO, medido em produção em 08/09/2026:
--
-- 1) NÃO HAVIA ESCAPE PARA ADMIN. A função exigia as três condições em AND, e a
--    terceira é participação em projeto. Um admin sem vínculo de projeto na OS era
--    recusado como qualquer outro — inclusive para consertar dado.
--
-- 2) A TERCEIRA CONDIÇÃO OLHAVA SÓ `org_project_members`, ignorando `responsible_id`
--    e `leader_id` de `org_projects`. Hoje isso não muda nada — em 134 projetos, os
--    115 responsáveis e os 132 líderes JÁ são membros, sem uma exceção sequer — mas
--    o dia em que alguém for posto como responsável sem entrar na lista de membros,
--    ele fica de fora sem motivo defensável.
--
-- 3) `_ordem_servico_id is not null` vinha ANTES de tudo, então solicitação com a
--    coluna nula era imexível por todo mundo, admin incluído. Foi essa a dívida
--    registrada no cabeçalho da 20260908134550 (GO-08), quando cinco linhas órfãs
--    tiveram de ser apagadas por SQL porque não havia caminho de tela. Agora o admin
--    passa antes da checagem de OS e consegue tratá-las pela aplicação.
--
-- O QUE NÃO MUDA: a regra do sublíder. Continua exigindo papel de sublíder ou acima
-- E participação em projeto da OS. Isso é de propósito — o pedido foi afrouxar para
-- admin, não abrir a escrita para a equipe toda.
--
-- O QUE ISTO NÃO RESOLVE, e é maior: das 51 OS com produto OSG em produção, 43 não
-- têm nenhum projeto vinculado. Nessas, ninguém além de admin envia a solicitação —
-- porque não existe projeto de que ser membro. É problema de DADO, não de policy, e
-- segue aberto para o tech lead decidir.
--
-- Idempotente: `create or replace` da função. As policies não são recriadas — elas já
-- apontam para este nome e passam a enxergar o corpo novo.

create or replace function public.sublider_na_os(_ordem_servico_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Admin primeiro, e FORA da checagem de OS nula: é o que devolve ao admin a
  -- capacidade de tratar solicitação órfã pela tela, em vez de por migration.
  select public.has_role(auth.uid(), 'admin'::app_role)
      or (
        _ordem_servico_id is not null
        and public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
        and exists (
          select 1
            from public.org_projects p
           where p.ordem_servico_id = _ordem_servico_id
             and (
               p.responsible_id = auth.uid()
               or p.leader_id = auth.uid()
               or exists (
                 select 1
                   from public.org_project_members m
                  where m.project_id = p.id
                    and m.user_id = auth.uid()
               )
             )
        )
      );
$function$;

comment on function public.sublider_na_os(uuid) is
  'Autoriza escrita em solicitacao/solicitacao_item. Admin passa sempre; os demais '
  'precisam de papel sublider ou acima E de participação (membro, responsável ou '
  'líder) em algum projeto da OS. Usada pelas seis policies de escrita das duas '
  'tabelas.';
