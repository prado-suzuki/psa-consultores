-- Exclusão de PER/DCOMP: sublíder passa a poder, o recorte por cluster passa a
-- valer, e apagar um PER vira UM comando.
--
-- O sintoma relatado em 08/09/2026 foi "clico em excluir, aparece que concluiu, e
-- o PER continua na lista". Não era bug de tela: a política de DELETE pedia
-- `lider`, quem clicou era `sublider`, e a recusa da RLS no Postgres não volta
-- erro — volta ZERO linhas. O app anunciava sucesso. Mesmo diagnóstico da
-- `20260908153459_titularidade_delete_team_member.sql`, outra tabela.
--
-- Três mudanças, e cada uma resolve uma coisa diferente:
--
-- 1) `sublider` em vez de `lider` nas três tabelas. A régua estava incoerente
--    dentro da MESMA operação de negócio: `distribuicao_dcomp` já pedia
--    `sublider` para excluir, enquanto `per`, `per_situacao` e `dcomp` pediam
--    `lider`. Como o app apagava a filha antes da mãe, um sublíder conseguia
--    destruir as distribuições de um DCOMP e não conseguia apagar o DCOMP —
--    perda de dado com aviso de sucesso. As quatro passam a pedir o mesmo papel.
--
-- 2) Recorte por contribuinte no DELETE, igual ao que o SELECT já faz. Hoje o
--    DELETE só olha papel: um líder de outro cluster pode apagar um PER que a
--    tela dele nem mostra, bastando saber o número. A visibilidade aqui é por
--    cluster (`cliente_visivel_para`), não por nível de papel, então "papel mais
--    alto" nunca foi sinônimo de "enxerga o cliente". `distribuicao_dcomp` já
--    tinha esse recorte nas três escritas; as outras três ficam iguais a ela.
--
-- 3) `on delete cascade` nas duas FKs que penduram o PER. Sem elas, apagar um PER
--    exige quatro requisições em sequência, sem transação: se a terceira falha, o
--    banco fica com DCOMP apagado e PER de pé. Com elas, é um DELETE só, atômico,
--    e a cascata chega às distribuições pela FK que já era `cascade`.
--
-- O que NÃO muda, de propósito: `dcomp.nr_dcomp_ret` e `per.nr_proc_ret`, as duas
-- FKs de retificação, continuam sem cascata. Ali a exclusão DEVE ser barrada com
-- erro — apagar o processo original porque alguém pediu para apagar o retificador
-- (ou o contrário) seria dano silencioso, que é justamente o que esta migration
-- está desfazendo.

-- ---------------------------------------------------------------------------
-- 1 + 2. Políticas de DELETE
-- ---------------------------------------------------------------------------

drop policy if exists rls_per_delete on public.per;

create policy rls_per_delete
  on public.per
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.can_view_contribuinte(auth.uid(), per.id_contribuinte)
    )
  );

drop policy if exists rls_per_situacao_delete on public.per_situacao;

create policy rls_per_situacao_delete
  on public.per_situacao
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or exists (
        select 1
          from public.per p
         where p.nr_per = per_situacao.nr_proc_per
           and public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
      )
    )
  );

drop policy if exists rls_dcomp_delete on public.dcomp;

create policy rls_dcomp_delete
  on public.dcomp
  for delete
  to authenticated
  using (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or exists (
        select 1
          from public.per p
         where p.nr_per = dcomp.nr_per_orig
           and public.can_view_contribuinte(auth.uid(), p.id_contribuinte)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Cascata das filhas do PER
-- ---------------------------------------------------------------------------

alter table public.per_situacao drop constraint if exists per_situacao_nr_proc_per_fkey;

alter table public.per_situacao
  add constraint per_situacao_nr_proc_per_fkey
  foreign key (nr_proc_per) references public.per(nr_per) on delete cascade;

alter table public.dcomp drop constraint if exists dcomp_nr_per_orig_fkey;

alter table public.dcomp
  add constraint dcomp_nr_per_orig_fkey
  foreign key (nr_per_orig) references public.per(nr_per) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. Catálogo do precheck: tirar `per` e `dcomp`, que ele não consegue atender
-- ---------------------------------------------------------------------------
--
-- `can_perform` identifica a linha com `where id = $1`, e nenhuma das duas tem
-- coluna `id` — as chaves são `nr_per` e `nr_documento`. A chamada morre com
-- 42703 (coluna inexistente), e o helper do front traduz isso para "permissão
-- negada / grant_missing": recusa pelo motivo errado. Hoje ninguém chama (o tipo
-- `PrecheckTable` do front não lista as duas), então isto é armadilha guardada
-- para o próximo que confiar no catálogo.

delete from public.rls_precheck_allowed_tables
 where table_name in ('per', 'dcomp');
