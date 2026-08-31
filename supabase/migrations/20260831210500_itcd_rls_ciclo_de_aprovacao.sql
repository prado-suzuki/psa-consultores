-- O CICLO DE APROVAÇÃO PASSA A VALER NA RLS, e não só na tela.
--
-- A simulação se apresenta como RETRATO CONGELADO: abrir é ler, e o que foi ao cliente
-- continua sendo o que foi. A policy não sustentava isso. Três furos, todos alcançáveis
-- pelo PostgREST com o token de um `team_member`:
--
--  1. INSERT sem restrição de status: dava para criar a linha JÁ `aprovada`, pulando o
--     portão que existe para o UPDATE. Aprovar deixa de ser decisão de sublíder.
--
--  2. UPDATE só olhava a linha NOVA: sair de `aprovada` para `gerada` passava, porque o
--     `with check` testa o valor novo. Ou seja, desaprovar era livre — o contrário de
--     aprovar, que é guardado.
--
--  3. As FILHAS não olhavam o pai: `for all` com checagem de papel e nada mais. Dava
--     para alterar ou excluir doador, donatário, GIA, usufruto e concessão de uma
--     simulação aprovada. O retrato mudava por baixo do que o cliente já tinha visto.
--
-- O DELETE também muda, e por outro motivo: ele exigia `lider` enquanto o INSERT aceita
-- `team_member`, e é isso que fazia o rollback da gravação parcial ser recusado
-- justamente para quem tinha acabado de criar a linha. Quem criou passa a poder apagar
-- o que ainda não foi aprovado.

-- ── O status do pai, para as filhas consultarem ───────────────────────────────
-- Espelha `cliente_id_de_itcd_simulacao`, que já existe e serve o SELECT das filhas.
-- `security definer` porque a policy da filha precisa ler o pai mesmo quando a policy
-- do pai não deixaria — e o que sai daqui é um enum de status, não dado de cliente.
create or replace function public.status_de_itcd_simulacao(p_simulacao_id uuid)
returns public.itcd_simulacao_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.itcd_simulacao where id = p_simulacao_id
$$;

revoke all on function public.status_de_itcd_simulacao(uuid) from public;
grant execute on function public.status_de_itcd_simulacao(uuid) to authenticated;

-- ── O PAI ─────────────────────────────────────────────────────────────────────
drop policy if exists "team_member+ can insert itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can insert itcd_simulacao"
  on public.itcd_simulacao for insert to authenticated
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    -- Aprovada não se cria: se aprova, e aprovar é de sublíder para cima.
    and status <> 'aprovada'::public.itcd_simulacao_status
  );

drop policy if exists "team_member+ can update itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can update itcd_simulacao"
  on public.itcd_simulacao for update to authenticated
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    -- A LINHA JÁ APROVADA é do sublíder para cima, e isto cobre DESAPROVAR: a guarda
    -- olha o status ANTIGO, que é o que faltava.
    and (
      status <> 'aprovada'::public.itcd_simulacao_status
      or has_role_or_higher(auth.uid(), 'sublider'::app_role)
    )
  )
  with check (
    status <> 'aprovada'::public.itcd_simulacao_status
    or has_role_or_higher(auth.uid(), 'sublider'::app_role)
  );

drop policy if exists "lider+ can delete itcd_simulacao" on public.itcd_simulacao;
create policy "quem criou apaga o que nao foi aprovado; lider+ apaga qualquer uma"
  on public.itcd_simulacao for delete to authenticated
  using (
    has_role_or_higher(auth.uid(), 'lider'::app_role)
    or (
      created_by = auth.uid()
      and status <> 'aprovada'::public.itcd_simulacao_status
    )
  );

-- ── AS FILHAS: seguem o pai, e param quando ele é aprovado ────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao_doador',
                           'itcd_simulacao_donatario',
                           'itcd_simulacao_gia',
                           'itcd_simulacao_usufruto',
                           'itcd_simulacao_concessao']
  loop
    execute format('drop policy if exists %I on public.%I',
                   'team_member+ can write ' || t, t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
        using (
          has_role_or_higher(auth.uid(), 'team_member'::app_role)
          and status_de_itcd_simulacao(simulacao_id)
              <> 'aprovada'::public.itcd_simulacao_status
        )
        with check (
          has_role_or_higher(auth.uid(), 'team_member'::app_role)
          and status_de_itcd_simulacao(simulacao_id)
              <> 'aprovada'::public.itcd_simulacao_status
        )
    $f$, 'team_member+ can write ' || t, t);
  end loop;
end $$;

-- O SELECT das filhas NÃO muda: retrato aprovado é para ler, e é o estado em que ele
-- mais se lê. O que trava é a escrita.
