-- Movimentação de quotas: fonte única do quadro societário.
--
-- `capital_integralizacao` deixa de ser registro de aporte e passa a ser o livro
-- de movimentos de quota (aporte, cessão, doação, redução), e por isso muda de
-- nome para `movimentacao_quotas`. O quadro societário de qualquer PJ passa a
-- ser o acumulado desses movimentos, lido pela view `v_quadro_societario`.
--
-- Antes desta migration havia duas fontes e nenhuma servia aos dois casos: a
-- empresa Proprietária (PR) tinha os sócios DERIVADOS no render, dos titulares
-- das matrículas, e a Controladora (CN) tinha os sócios LIDOS de
-- `quadro_societario`. A derivação responde "quem entrou com o quê", não "quem
-- tem quantas quotas hoje": as duas coisas coincidem na constituição e divergem
-- na primeira cessão.
--
-- `quadro_societario` NÃO é dropada aqui, de propósito. Ela para de ser lida e
-- fica intocada por um ciclo, como rede de segurança. A remoção dela e a das
-- duas colunas legadas (`socio_pessoa_id`, `empresa_destino_pessoa_id`) são uma
-- migration posterior, só depois do corte validado em uso real.
--
-- Idempotente: vai ser aplicada por dois caminhos (CLI no sandbox, Lovable em
-- produção) e precisa poder rodar duas vezes sem estragar nada.

-- ---------------------------------------------------------------------------
-- 1. Renomear a tabela, e junto o trigger, as policies e a constraint de PK,
--    para nenhum nome ficar descrevendo o modelo antigo.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.movimentacao_quotas') is null
     and to_regclass('public.capital_integralizacao') is not null then
    alter table public.capital_integralizacao rename to movimentacao_quotas;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_trigger
              where tgrelid = 'public.movimentacao_quotas'::regclass
                and tgname = 'trg_capital_integralizacao_updated_at') then
    alter trigger trg_capital_integralizacao_updated_at
      on public.movimentacao_quotas rename to trg_movimentacao_quotas_updated_at;
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.movimentacao_quotas'::regclass
                and conname = 'capital_integralizacao_pkey') then
    alter table public.movimentacao_quotas
      rename constraint capital_integralizacao_pkey to movimentacao_quotas_pkey;
  end if;

  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'movimentacao_quotas'
                and policyname = 'osg_cluster_select_capital_integralizacao') then
    alter policy "osg_cluster_select_capital_integralizacao"
      on public.movimentacao_quotas rename to "osg_cluster_select_movimentacao_quotas";
  end if;

  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'movimentacao_quotas'
                and policyname = 'team_member+ can insert capital_integralizacao') then
    alter policy "team_member+ can insert capital_integralizacao"
      on public.movimentacao_quotas rename to "team_member+ can insert movimentacao_quotas";
  end if;

  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'movimentacao_quotas'
                and policyname = 'team_member+ can update capital_integralizacao') then
    alter policy "team_member+ can update capital_integralizacao"
      on public.movimentacao_quotas rename to "team_member+ can update movimentacao_quotas";
  end if;

  if exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'movimentacao_quotas'
                and policyname = 'admin can delete capital_integralizacao') then
    alter policy "admin can delete capital_integralizacao"
      on public.movimentacao_quotas rename to "admin can delete movimentacao_quotas";
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. As colunas do movimento.
-- ---------------------------------------------------------------------------
alter table public.movimentacao_quotas
  add column if not exists tipo                text,
  add column if not exists empresa_pessoa_id   uuid references public.pessoa(id),
  add column if not exists origem_pessoa_id    uuid references public.pessoa(id),
  add column if not exists destino_pessoa_id   uuid references public.pessoa(id),
  add column if not exists quotas              bigint,
  add column if not exists data_movimento      date,
  add column if not exists documento_gerado_id uuid references public.documento_gerado(id);

-- `bem_id` some do aporte em moeda corrente e de todo movimento que não é
-- aporte. Precisa ser afrouxado ANTES do backfill da etapa 4, que insere linhas
-- vindas do quadro societário, onde bem não existe.
alter table public.movimentacao_quotas alter column bem_id drop not null;

-- ---------------------------------------------------------------------------
-- 3. Backfill das linhas que já existiam: são todas aporte de bem.
--    `quotas` vem do quadro societário da mesma empresa e do mesmo sócio, que
--    registra o mesmo fato no outro formato e bate um a um. O fallback pelo
--    valor de capital só existe por segurança: conferido que não há linha sem
--    par no quadro, nem par (empresa, sócio) duplicado, nem valor nulo.
-- ---------------------------------------------------------------------------
update public.movimentacao_quotas mq
   set tipo              = 'aporte',
       empresa_pessoa_id = mq.empresa_destino_pessoa_id,
       destino_pessoa_id = mq.socio_pessoa_id,
       quotas            = coalesce(
                             (select q.quotas from public.quadro_societario q
                               where q.empresa_pessoa_id = mq.empresa_destino_pessoa_id
                                 and q.socio_pessoa_id   = mq.socio_pessoa_id),
                             round(mq.vlr_capital_arredondado)::bigint)
 where mq.tipo is null;

-- ---------------------------------------------------------------------------
-- 4. Importar o quadro societário das empresas que ainda não têm movimentação,
--    como aporte de constituição. Quem já tem movimento fica de fora pelo
--    `not exists`: o fato já está gravado, importar de novo duplicaria.
--
--    As colunas legadas continuam preenchidas em espelho porque ainda são NOT
--    NULL; elas caem na migration de limpeza, depois do corte validado.
--
--    `created_at` vem do quadro, não de now(): preserva a ordem de digitação,
--    que é a ordem em que os sócios saem no preâmbulo do contrato, e evita o
--    empate que um insert em lote produziria (now() é o timestamp da transação,
--    igual para todas as linhas).
-- ---------------------------------------------------------------------------
insert into public.movimentacao_quotas
  (cliente_id, tipo, empresa_pessoa_id, destino_pessoa_id, quotas,
   vlr_capital_arredondado, pct_capital,
   socio_pessoa_id, empresa_destino_pessoa_id,
   created_at, created_by, updated_at, updated_by)
select e.cliente_id, 'aporte', q.empresa_pessoa_id, q.socio_pessoa_id, q.quotas,
       q.vlr_total, q.percentual,
       q.socio_pessoa_id, q.empresa_pessoa_id,
       q.created_at, q.created_by, q.updated_at, q.updated_by
  from public.quadro_societario q
  join public.pessoa e on e.id = q.empresa_pessoa_id
 where not exists (
   select 1 from public.movimentacao_quotas mq
    where mq.empresa_pessoa_id = q.empresa_pessoa_id
 );

-- ---------------------------------------------------------------------------
-- 5. Apertar o que agora tem valor em toda linha.
-- ---------------------------------------------------------------------------
alter table public.movimentacao_quotas
  alter column tipo              set not null,
  alter column empresa_pessoa_id set not null,
  alter column quotas            set not null;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_tipo_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_tipo_check
        check (tipo in ('aporte', 'cessao', 'doacao', 'reducao'));
  end if;

  -- Movimento sem lado nenhum não é movimento: no aporte as quotas nascem
  -- (origem nula) e na redução elas são canceladas (destino nulo), mas os dois
  -- nulos ao mesmo tempo seriam uma linha que não move nada.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_lados_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_lados_check
        check (origem_pessoa_id is not null or destino_pessoa_id is not null);
  end if;
end $$;

create index if not exists idx_movimentacao_quotas_empresa
  on public.movimentacao_quotas (empresa_pessoa_id);
create index if not exists idx_movimentacao_quotas_documento
  on public.movimentacao_quotas (documento_gerado_id);

-- ---------------------------------------------------------------------------
-- 6. O ponto de leitura único.
-- ---------------------------------------------------------------------------
drop view if exists public.v_quadro_societario;

create view public.v_quadro_societario
  with (security_invoker = 'on') as
select mov.empresa_pessoa_id,
       emp.cliente_id,
       mov.pessoa_id,
       sum(mov.quotas)::bigint                          as quotas,
       sum(mov.valor)                                   as vlr_total,
       min(mov.created_at)                              as ordem,
       array_agg(mov.movimento_id order by mov.created_at) as movimento_ids
  from (
    select empresa_pessoa_id,
           destino_pessoa_id as pessoa_id,
           quotas,
           coalesce(vlr_capital_arredondado, 0) as valor,
           created_at,
           id as movimento_id
      from public.movimentacao_quotas
     where destino_pessoa_id is not null
    union all
    select empresa_pessoa_id,
           origem_pessoa_id,
           -quotas,
           -coalesce(vlr_capital_arredondado, 0),
           created_at,
           id
      from public.movimentacao_quotas
     where origem_pessoa_id is not null
  ) mov
  join public.pessoa emp on emp.id = mov.empresa_pessoa_id
 group by mov.empresa_pessoa_id, emp.cliente_id, mov.pessoa_id
having sum(mov.quotas) <> 0;

grant select on public.v_quadro_societario to authenticated;

comment on view public.v_quadro_societario is
  'Quadro societário de cada PJ como acumulado dos movimentos de quota: entradas menos saídas, saldo zero fora do quadro. Visibilidade = RLS de movimentacao_quotas e de pessoa (view security_invoker). `ordem` é o created_at do PRIMEIRO movimento do sócio, e existe para a ordem dos sócios no preâmbulo do contrato ser determinística. `movimento_ids` são as linhas que compõem o saldo, e alimentam a notificação de mudança de variável da tela Gerar.';

-- ---------------------------------------------------------------------------
-- 7. As colunas de valor nasceram para descrever um aporte e viram armadilha
--    num livro de movimentos. Documentar o que cada uma significa agora.
-- ---------------------------------------------------------------------------
comment on table public.movimentacao_quotas is
  'Livro de movimentos de quota de cada PJ: uma linha por movimento, com tipo, origem, destino, quantidade e data. Fonte única do quadro societário, que se lê pela view v_quadro_societario. Aporte: origem nula, as quotas nascem. Cessão e doação: origem e destino preenchidos, o capital não muda. Redução: destino nulo, as quotas são canceladas.';

comment on column public.movimentacao_quotas.tipo is
  'aporte | cessao | doacao | reducao.';
comment on column public.movimentacao_quotas.empresa_pessoa_id is
  'A PJ cujas quotas se movem.';
comment on column public.movimentacao_quotas.origem_pessoa_id is
  'Quem cede. Nulo no aporte, onde as quotas nascem.';
comment on column public.movimentacao_quotas.destino_pessoa_id is
  'Quem recebe. Nulo na redução, onde as quotas são canceladas.';
comment on column public.movimentacao_quotas.bem_id is
  'O que foi aportado. Nulo fora do aporte, e também no aporte em moeda corrente.';
comment on column public.movimentacao_quotas.documento_gerado_id is
  'O ato que formalizou o movimento, quando existe.';
comment on column public.movimentacao_quotas.vlr_capital_arredondado is
  'Valor de CAPITAL das quotas movidas, nunca o preço pago. Numa cessão acima do par, gravar o preço aqui corrompe o vlr_total do quadro, que é a soma desta coluna.';
comment on column public.movimentacao_quotas.pct_capital is
  'Só faz sentido em tipo = aporte. Percentual de um movimento não soma ao longo do tempo, e a view não o agrega: quem quiser o percentual do quadro calcula de quotas.';
comment on column public.movimentacao_quotas.pct_vlr_mercado is
  'Só faz sentido em tipo = aporte. Ver pct_capital.';
comment on column public.movimentacao_quotas.pct_vlr_contabil is
  'Só faz sentido em tipo = aporte. Ver pct_capital.';
comment on column public.movimentacao_quotas.vlr_mercado is
  'Descreve o bem aportado. Nulo fora do aporte.';
comment on column public.movimentacao_quotas.vlr_contabil is
  'Descreve o bem aportado. Nulo fora do aporte.';
comment on column public.movimentacao_quotas.reserva_capital is
  'Descreve o bem aportado. Nulo fora do aporte.';
comment on column public.movimentacao_quotas.socio_pessoa_id is
  'LEGADO do modelo de aporte, espelha destino_pessoa_id. Sai na migration de limpeza.';
comment on column public.movimentacao_quotas.empresa_destino_pessoa_id is
  'LEGADO do modelo de aporte, espelha empresa_pessoa_id. Sai na migration de limpeza.';
