-- 20260812160000_solicitacao_rls_sublider_na_os.sql
-- A escrita de solicitacao passa a exigir sublider membro de projeto da OS.
--
-- Decisao do Bernardo: "para criar solicitacao de documento deve ter role de
-- Sublider e tambem deve fazer parte do projeto". Refinada com o Alexandre para
-- "qualquer projeto da OS que ele faca parte", e essa formulacao e melhor por um
-- motivo tecnico: ela dispensa resolver QUAL e o projeto da solicitacao. Basta
-- existir um projeto daquela OS onde a pessoa e membro, o que e um EXISTS e nao
-- uma regra de precedencia.
--
-- O que muda: as 6 politicas de ESCRITA (insert/update/delete) de `solicitacao` e
-- `solicitacao_item`.
--
-- O que NAO muda: as 4 de LEITURA. Quem ve o cliente por cluster continua vendo a
-- solicitacao na tela de onboarding da OSG; passa a ver sem poder agir. Trocar a
-- leitura tambem esconderia a solicitacao de quem hoje a lista, e isso e mudanca
-- de comportamento de tela, nao de permissao de escrita.
--
-- Conferido no banco em 12/08/2026, nao presumido:
--   - `gerar_solicitacao_os` e SECURITY DEFINER, entao a geracao a partir da OS,
--     que e o caminho principal de criacao, nao passa por estas politicas e nao e
--     afetada;
--   - has_role_or_higher(uuid, app_role) existe; org_project_members.user_id e
--     org_projects.ordem_servico_id existem; solicitacao.ordem_servico_id existe
--     e e nullable;
--   - as 6 solicitacoes sem OS foram TODAS criadas em 04/08, antes da ALE-31
--     (06/08), que fez a solicitacao nascer sempre da OS. Das 3 criadas depois
--     dela, nenhuma esta sem OS.
--
-- Medido antes de aplicar (12/08/2026):
--   - 35 usuarios podiam escrever (team_member+ com cliente visivel por cluster);
--     com a regra nova sao 11 (sublider+ e membro de projeto que tem OS);
--   - 8 das 10 solicitacoes existentes ficam sem quem as manipule, por nao haver
--     projeto na OS delas. Isso e ESPERADO e nao e regressao: a OSG ainda nao tem
--     projeto cadastrado, o ambiente esta sendo preparado, e quem cria projeto e
--     o proprio sublider.
--
-- Fica registrado e NAO resolvido: quando a OS tem mais de um projeto, o aviso na
-- thread da EDU-4 continua saindo em silencio, porque a regra dela manda nao
-- publicar em caso de ambiguidade. Sao 27 das 61 OS com projeto. Nenhum atributo
-- distingue os projetos de uma mesma OS hoje: `servico_id` esta vazio em 20 das
-- 27, e em 22 das 27 todos os projetos estao no mesmo status. O desbloqueio e
-- preencher `servico_id`, que e cadastro, nao codigo.
--
-- Reversao:
--   drop policy if exists "sublider na os can insert solicitacao"      on public.solicitacao;
--   drop policy if exists "sublider na os can update solicitacao"      on public.solicitacao;
--   drop policy if exists "sublider na os can delete solicitacao"      on public.solicitacao;
--   drop policy if exists "sublider na os can insert solicitacao_item" on public.solicitacao_item;
--   drop policy if exists "sublider na os can update solicitacao_item" on public.solicitacao_item;
--   drop policy if exists "sublider na os can delete solicitacao_item" on public.solicitacao_item;
--   drop function if exists public.sublider_na_os(uuid);
--   e recriar as 6 politicas antigas, cuja definicao esta reproduzida em
--   comentario antes de cada drop abaixo.

BEGIN;

-- ── 1) O dado antes da regra ────────────────────────────────────────────────
-- A unica solicitacao VIVA sem OS e de teste: cliente "Alessio Sansao",
-- `cliente.ambiente = 'dev'`, criada e enviada em 04/08, antes da ALE-31. O mesmo
-- cliente tem exatamente uma OS, que e a que aparece na outra solicitacao dele.
-- Amarrar deixa a linha compativel com a regra nova; deixar solta a tornaria
-- intocavel por qualquer pessoa.
--
-- As outras 5 sem OS estao encerradas e ninguem as manipula.
update public.solicitacao
   set ordem_servico_id = 'da05caa2-dfd0-4256-98be-c51339de4513'
 where id = 'd138566a-a49d-495e-8952-04ddf38e3fb0'
   and ordem_servico_id is null;

-- ── 2) A porta ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER de proposito: a funcao tem de ver TODOS os projetos da OS,
-- independente de quem pergunta. Rodando como o chamador, duas pessoas com
-- visibilidades diferentes daria respostas diferentes para a MESMA solicitacao, e
-- a permissao passaria a depender de quem olha em vez do vinculo real.
--
-- Sem revoke de anon/authenticated, ao contrario das funcoes de escrita da EDU-1:
-- esta e chamada de dentro de policy, entao o papel do chamador precisa de
-- EXECUTE, e o unico fato que ela revela e sobre o proprio chamador.
create or replace function public.sublider_na_os(_ordem_servico_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _ordem_servico_id is not null
     and public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
     and exists (
       select 1
         from public.org_project_members m
         join public.org_projects p on p.id = m.project_id
        where p.ordem_servico_id = _ordem_servico_id
          and m.user_id = auth.uid()
     );
$$;

comment on function public.sublider_na_os(uuid) is
  'Sublider ou acima que e membro de ALGUM projeto daquela ordem de servico. Porta de escrita de solicitacao e solicitacao_item. OS nula devolve false, porque sem OS nao existe projeto do qual ser membro.';

-- ── 3) solicitacao ──────────────────────────────────────────────────────────
-- Antiga: (has_role_or_higher(auth.uid(),'team_member') AND cliente_visivel_para(cliente_id))
drop policy if exists "cluster team_member can insert solicitacao" on public.solicitacao;
create policy "sublider na os can insert solicitacao"
  on public.solicitacao for insert to authenticated
  with check (public.sublider_na_os(ordem_servico_id));

-- Antiga: USING e WITH CHECK iguais ao insert acima.
drop policy if exists "cluster team_member can update solicitacao" on public.solicitacao;
create policy "sublider na os can update solicitacao"
  on public.solicitacao for update to authenticated
  using      (public.sublider_na_os(ordem_servico_id))
  with check (public.sublider_na_os(ordem_servico_id));

-- Antiga: USING igual ao insert acima.
drop policy if exists "cluster team_member can delete solicitacao" on public.solicitacao;
create policy "sublider na os can delete solicitacao"
  on public.solicitacao for delete to authenticated
  using (public.sublider_na_os(ordem_servico_id));

-- ── 4) solicitacao_item ─────────────────────────────────────────────────────
-- O item ja delegava para a solicitacao por EXISTS; troca-se apenas o criterio
-- de dentro, mantendo a forma que o arquivo original usava.
--
-- Antiga: (has_role_or_higher(auth.uid(),'team_member') AND EXISTS (SELECT 1 FROM
--          solicitacao s WHERE s.id = solicitacao_item.solicitacao_id AND
--          cliente_visivel_para(s.cliente_id)))
drop policy if exists "cluster team_member can insert solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can insert solicitacao_item"
  on public.solicitacao_item for insert to authenticated
  with check (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

drop policy if exists "cluster team_member can update solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can update solicitacao_item"
  on public.solicitacao_item for update to authenticated
  using (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)))
  with check (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

drop policy if exists "cluster team_member can delete solicitacao_item" on public.solicitacao_item;
create policy "sublider na os can delete solicitacao_item"
  on public.solicitacao_item for delete to authenticated
  using (exists (
    select 1 from public.solicitacao s
     where s.id = solicitacao_item.solicitacao_id
       and public.sublider_na_os(s.ordem_servico_id)));

COMMIT;
