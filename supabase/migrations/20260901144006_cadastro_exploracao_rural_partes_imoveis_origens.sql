-- Cadastro de exploração rural: N partes, N imóveis, origem por imóvel (AGR-01)
--
-- Migration A do plano em `docs/osg/cadastro-exploracao-rural-modelagem.md`.
-- Fecha o achado #1 do levantamento da ALE-3: `exploracao_rural` descreve UM
-- imóvel, UM explorador e UM outorgante, mas o contrato real não é assim —
-- o `[BV-COM]` reúne 15 imóveis de 6 origens numa composse só, e o `[BV-PAR]`
-- tem 3 outorgados numa parceria só.
--
-- **Esta migration é puramente ADITIVA e afrouxante** — cria tabela, cria
-- coluna, derruba CHECK. Nenhuma coluna sai aqui. É de propósito: pela regra
-- dura do AGENTS.md, produção recebe a coluna ANTES de o código que a usa
-- chegar na `main`, e para remoção a ordem se inverte. As 12 colunas legadas
-- saem na migration irmã `20260901144839_exploracao_rural_remove_colunas_legadas.sql`,
-- que tem pré-condição de código. Aplicar esta aqui em produção a qualquer
-- momento é inofensivo.
--
-- O que esta migration NÃO faz, de propósito:
--   * `documento_gerado.exploracao_rural_id` e o ajuste do índice
--     `uq_documento_gerado_head_sem_pj` — camada de GERAÇÃO, vai na Migration B
--     (AGR-02), junto do seed de `tmpl_documento`/`tmpl_bloco`.
--   * foro, testemunhas e número de vias — não são cadastro do instrumento.
--     Moram em `documento_gerado.snapshot_dados`, versionados por minuta
--     (achados #4/#5 do relatório 13).
--   * mecanismo de auditoria — neste repo auditoria é de aplicação: quem grava
--     é o `logAction` de `useAuditLog.ts`, chamado pelo hook de domínio depois
--     da escrita (molde: `useDiagnosticoPatrimonial.ts`). Não há trigger.
--
-- Seguro derrubar coluna legada sem etapa de convivência: conferido em
-- 01/09/2026 que `exploracao_rural` tem 0 linhas e 0 views dependentes. Não há
-- conteúdo a preservar.
--
-- Idempotente de ponta a ponta (`if not exists` / `if exists` /
-- `create or replace` / `drop policy if exists`), porque este arquivo é
-- aplicado por dois caminhos: `supabase db push` no sandbox e, depois, à mão
-- em produção pelo chat do Lovable.

-- ---------------------------------------------------------------------------
-- 1. Helper de cluster para as tabelas filhas
-- ---------------------------------------------------------------------------
-- As três tabelas novas não carregam `cliente_id` (ele é do instrumento), então
-- a RLS resolve o cluster por aqui. Molde copiado de `cliente_id_de_matricula`:
-- `sql`, `stable`, `security definer`, `search_path` fixo.
create or replace function public.cliente_id_de_exploracao_rural(_exploracao_rural_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select er.cliente_id
    from public.exploracao_rural er
   where er.id = _exploracao_rural_id;
$$;

comment on function public.cliente_id_de_exploracao_rural(uuid) is
  'Cluster do instrumento rural, para a RLS das tabelas filhas (parte/imóvel/origem externa), que não têm cliente_id próprio.';

-- ---------------------------------------------------------------------------
-- 2. `exploracao_rural`: colunas do instrumento
-- ---------------------------------------------------------------------------

-- 2.1 CHECKs legados que citam coluna que vai sair. Dropados explicitamente
-- antes do DROP COLUMN — o Postgres derrubaria junto, mas deixar explícito
-- evita que a segunda aplicação (produção, à mão) pare num erro obscuro.
alter table public.exploracao_rural drop constraint if exists chk_expr_imovel;
alter table public.exploracao_rural drop constraint if exists chk_expr_explorador;
alter table public.exploracao_rural drop constraint if exists chk_expr_outorgante;

-- 2.2 Colunas novas.
alter table public.exploracao_rural
  -- Vigência: o `[AgroAliança]` foi assinado em 20/03/2026 e vigora "a partir
  -- de 16 de setembro de 2.026". Vazia, a vigência conta da assinatura, como o
  -- modelo oficial diz; preenchida, o texto sai "a partir de <data>".
  add column if not exists data_inicio_vigencia date,
  add column if not exists vigencia_prorrogavel boolean not null default false,

  -- Parceria: o corte outorgante × explorador da Cláusula Quinta.
  -- `[MMS-PAR]` reparte 30/70. Na composse os frutos seguem a fração de cada
  -- compossuidor (`exploracao_rural_parte.fracao`), não estas duas colunas.
  add column if not exists percentual_outorgante numeric,
  add column if not exists percentual_explorador numeric,

  -- Troca AGROPECUÁRIA/AGRÍCOLA em 3 trechos do texto (título, vigência,
  -- capítulo de atividades). Default `true` porque agropecuária é o caso comum
  -- nos contratos lidos.
  add column if not exists inclui_pecuaria boolean not null default true,

  -- Texto livre, e não catálogo fechado: o relatório 10 mostrou a lista de 14
  -- culturas do `.docx` oficial divergindo da lista de 8 do contrato assinado.
  -- É campo por cliente.
  add column if not exists culturas text,

  -- Cláusulas "DA ANUÊNCIA" (14ª a 17ª do `[BV-PAR]`/`[BV-COM]`).
  add column if not exists permite_penhor boolean not null default false,
  -- Modalidade da pecuária: elege a variante do parágrafo de "frutos" (família de
  -- blocos). É DADO do cadastro, e não escolha na tela Gerar, porque o resolvedor
  -- de variante lê o contexto — não existe seletor de variante na tela, e não deve
  -- existir: qual pecuária o cliente pratica é fato da operação, não do documento.
  add column if not exists modalidade_pecuaria text,

  -- Indivisão (composse). Quantidade e unidade SEPARADAS, nunca texto livre:
  -- a composse do Franciosi saiu com "prazo de 10 (dez) anos… renovando-se o
  -- prazo de 03 (três) anos" porque o "3 anos" sobrou do template dentro de um
  -- campo de texto e ninguém viu.
  add column if not exists prazo_indivisao_quantidade integer,
  add column if not exists prazo_indivisao_unidade text,
  add column if not exists indivisao_prorrogavel boolean,
  add column if not exists indivisao_aviso_quantidade integer,
  add column if not exists indivisao_aviso_unidade text,

  -- Governança da composse: `[BV-COM]` autoriza atos por maioria dos
  -- percentuais; `[ROS-COM]` nomeia 2 compossuidores fixos. Sem regra padrão
  -- única entre os dois exemplos reais, então é escolha do instrumento.
  -- NÃO existe coluna de "age isoladamente ou em conjunto": isso é derivado da
  -- contagem de `papel = 'administrador_nomeado'` em `exploracao_rural_parte`
  -- (1 → isoladamente; 2+ → em conjunto). Prova: o Termo Aditivo do `[ROS-COM]`
  -- troca a mesma cláusula de "em conjunto por Dilceu e Catia" para
  -- "isoladamente pela compossuidora Catia" só porque Dilceu saiu da composse.
  add column if not exists regra_administracao text,

  -- Liquidação de haveres: `[BV-COM]` usa 60 parcelas mensais; `[ROS-COM]`, 10
  -- anuais — ambos corrigidos pelo INPC.
  add column if not exists liquidacao_periodicidade text,
  add column if not exists liquidacao_numero_parcelas integer,

  -- Referências de arquivo (Documentos do Cliente). Não são citadas em nenhum
  -- bloco do texto do contrato — são lastro do cadastro.
  add column if not exists estudo_fiscal_documento_id uuid,
  add column if not exists documento_comprobatorio_id uuid;

-- 2.3 FKs das duas referências de arquivo (fora do ADD COLUMN para poderem ser
-- idempotentes).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.exploracao_rural'::regclass
       and conname = 'exploracao_rural_estudo_fiscal_documento_id_fkey'
  ) then
    alter table public.exploracao_rural
      add constraint exploracao_rural_estudo_fiscal_documento_id_fkey
      foreign key (estudo_fiscal_documento_id)
      references public.documento_arquivo(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.exploracao_rural'::regclass
       and conname = 'exploracao_rural_documento_comprobatorio_id_fkey'
  ) then
    alter table public.exploracao_rural
      add constraint exploracao_rural_documento_comprobatorio_id_fkey
      foreign key (documento_comprobatorio_id)
      references public.documento_arquivo(id) on delete set null;
  end if;
end $$;

-- 2.4 Domínio dos campos de texto tabelado. `text` + CHECK em vez de enum novo:
-- são vocabulários pequenos e ainda em homologação com a OSG, e um enum criado
-- agora custaria `ALTER TYPE` a cada ajuste de redação.
alter table public.exploracao_rural
  drop constraint if exists chk_expr_prazo_indivisao_unidade,
  drop constraint if exists chk_expr_indivisao_aviso_unidade,
  drop constraint if exists chk_expr_regra_administracao,
  drop constraint if exists chk_expr_modalidade_pecuaria,
  drop constraint if exists chk_expr_liquidacao_periodicidade,
  drop constraint if exists chk_expr_percentuais_faixa;

alter table public.exploracao_rural
  add constraint chk_expr_prazo_indivisao_unidade
    check (prazo_indivisao_unidade is null or prazo_indivisao_unidade in ('dias','meses','anos')),
  add constraint chk_expr_indivisao_aviso_unidade
    check (indivisao_aviso_unidade is null or indivisao_aviso_unidade in ('dias','meses','anos')),
  add constraint chk_expr_regra_administracao
    check (regra_administracao is null or regra_administracao in ('maioria','nomeados')),
  add constraint chk_expr_modalidade_pecuaria
    check (modalidade_pecuaria is null
           or modalidade_pecuaria in ('cria','recria_engorda','ciclo_completo')),
  add constraint chk_expr_liquidacao_periodicidade
    check (liquidacao_periodicidade is null or liquidacao_periodicidade in ('mensal','anual')),
  -- Faixa, não soma: que outorgante + explorador feche 100% é regra do
  -- instrumento e vai na validação da aplicação, onde dá para devolver mensagem
  -- útil. Aqui só se barra valor impossível.
  add constraint chk_expr_percentuais_faixa
    check (
      (percentual_outorgante is null or percentual_outorgante between 0 and 100)
      and (percentual_explorador is null or percentual_explorador between 0 and 100)
    );

-- 2.5 As 12 colunas legadas NÃO saem aqui. Elas saem na migration irmã,
-- `20260901144839_exploracao_rural_remove_colunas_legadas.sql`, que só pode ser
-- aplicada em produção DEPOIS que o código que as lê chegar na `main`. Motivo no
-- cabeçalho dela.

-- ---------------------------------------------------------------------------
-- 3. `exploracao_rural_origem_externa`
-- ---------------------------------------------------------------------------
-- Criada ANTES de `exploracao_rural_imovel`, que a referencia.
--
-- Por que tabela própria, e não objeto embutido em cada imóvel (como estava no
-- rascunho da ALE-3): o `[BV-COM]` tem 15 imóveis para 6 origens — os itens
-- (a)-(f) vêm todos da mesma Agro Aliança. Embutida, a mesma razão social,
-- NIRE, capital e lista de administradores seria digitada seis vezes, e as seis
-- cópias divergiriam na primeira correção.
create table if not exists public.exploracao_rural_origem_externa (
  id                                      uuid primary key default gen_random_uuid(),
  exploracao_rural_id                     uuid not null references public.exploracao_rural(id) on delete cascade,
  titulo_instrumento                      text,
  data_assinatura                         date,
  outorgante_pessoa_id                    uuid references public.pessoa(id) on delete set null,
  outorgante_capital_social_na_assinatura numeric,
  outorgante_representante                text,
  created_at                              timestamptz not null default now(),
  created_by                              uuid default auth.uid(),
  updated_at                              timestamptz not null default now(),
  updated_by                              uuid default auth.uid()
);

-- A tabela pode JÁ EXISTIR com a forma anterior (foi assim que ela nasceu no
-- sandbox: nome, CNPJ, NIRE, município e UF do outorgante como texto). O
-- `create table if not exists` acima não altera tabela existente, então as duas
-- formas convergem aqui — e o bloco é inócuo num banco novo, onde a tabela já
-- nasce certa.
--
-- Dropar as cinco colunas de texto não perde dado: o outorgante passa a ser
-- `pessoa`, e o que elas guardavam é justamente a duplicata que a FK elimina.
alter table public.exploracao_rural_origem_externa
  add column if not exists outorgante_pessoa_id uuid,
  add column if not exists outorgante_representante text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'exploracao_rural_origem_externa_outorgante_pessoa_id_fkey'
       and conrelid = 'public.exploracao_rural_origem_externa'::regclass
  ) then
    alter table public.exploracao_rural_origem_externa
      add constraint exploracao_rural_origem_externa_outorgante_pessoa_id_fkey
      foreign key (outorgante_pessoa_id) references public.pessoa(id) on delete set null;
  end if;
end $$;

alter table public.exploracao_rural_origem_externa
  drop column if exists outorgante_nome,
  drop column if exists outorgante_cpf_cnpj,
  drop column if exists outorgante_municipio,
  drop column if exists outorgante_uf,
  drop column if exists outorgante_nire,
  drop column if exists outorgante_administradores;

comment on table public.exploracao_rural_origem_externa is
  'Instrumento de origem da posse dos imóveis (Considerando V da composse). Um por instrumento, não por imóvel: quinze imóveis podem vir da mesma parceria anterior, e embutir a origem em cada um faria as quinze cópias divergirem na primeira correção.';
comment on column public.exploracao_rural_origem_externa.outorgante_pessoa_id is
  'Quem cedeu a posse, como PESSOA — mesma decisão de exploracao_rural.outorgante_pessoa_id. Guardar nome/CNPJ/NIRE em texto criaria a mesma empresa duas vezes no banco, sem ligação, e obrigaria a um segundo escritor de qualificação: a mesma PJ sairia com uma redação no preâmbulo e outra no Considerando V. Terceiro que não é cliente também é `pessoa` — o cadastro de pessoas é o dossiê do cliente, não a lista de clientes.';
comment on column public.exploracao_rural_origem_externa.outorgante_capital_social_na_assinatura is
  'Valor HISTÓRICO, na data daquele contrato anterior — é o único dado do outorgante que `pessoa` não guarda, e por isso o único que fica aqui. Anulável por evidência: o achado E do relatório 14 mostra a própria banca emitindo Considerando V sem capital social.';
comment on column public.exploracao_rural_origem_externa.outorgante_representante is
  'Quem assinou PELA pessoa jurídica naquele instrumento. Campo da relação, não da pessoa (o mesmo papel que `representante` tem na lista de sócios): quem representou a empresa em 2022 pode não ser quem a representa hoje.';

-- ---------------------------------------------------------------------------
-- 4. `exploracao_rural_parte`
-- ---------------------------------------------------------------------------
-- UMA tabela com discriminador, não três. O precedente da casa é a
-- `titularidade` (`tipo` + `fracao` anulável), e há razão de negócio: no
-- `[ROS-COM]` os dois administradores nomeados SÃO compossuidores — a mesma
-- pessoa acumula papéis. Com uma tabela isso são duas linhas; com três, ela
-- vive em duas e some de uma quando alguém esquecer.
create table if not exists public.exploracao_rural_parte (
  id                  uuid primary key default gen_random_uuid(),
  exploracao_rural_id uuid not null references public.exploracao_rural(id) on delete cascade,
  pessoa_id           uuid not null references public.pessoa(id),
  papel               text not null,
  fracao              numeric,
  ordem               integer not null default 0,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid(),
  constraint uq_exploracao_rural_parte unique (exploracao_rural_id, pessoa_id, papel)
);

-- CHECKs à parte para serem idempotentes numa tabela que pode já existir.
alter table public.exploracao_rural_parte
  drop constraint if exists chk_exploracao_rural_parte_papel,
  drop constraint if exists chk_exploracao_rural_parte_fracao_so_compossuidor,
  drop constraint if exists chk_exploracao_rural_parte_fracao_faixa;

alter table public.exploracao_rural_parte
  add constraint chk_exploracao_rural_parte_papel
    check (papel in ('explorador','compossuidor','administrador_nomeado')),
  -- Fração é do compossuidor. Explorador não tem fração individual (o corte é
  -- entre o lado outorgante e o lado explorador, confirmado em 19/08/2026);
  -- administrador nomeado, muito menos.
  add constraint chk_exploracao_rural_parte_fracao_so_compossuidor
    check (papel = 'compossuidor' or fracao is null),
  add constraint chk_exploracao_rural_parte_fracao_faixa
    check (fracao is null or fracao between 0 and 100);

comment on table public.exploracao_rural_parte is
  'Quem é parte do instrumento e em que papel. O outorgante NÃO entra aqui — ele é coluna (exploracao_rural.outorgante_pessoa_id), porque a OSG confirmou que é sempre único e coluna sustenta essa invariante.';
comment on column public.exploracao_rural_parte.papel is
  'explorador | compossuidor | administrador_nomeado. A mesma pessoa pode ter mais de um papel no mesmo instrumento (uma linha por papel) — no [ROS-COM] os administradores nomeados são compossuidores.';
comment on column public.exploracao_rural_parte.fracao is
  'Percentual do compossuidor (0-100). Que as frações fechem 100% é regra ENTRE LINHAS: não cabe em CHECK, vai na RPC transacional, onde dá para devolver mensagem útil.';
comment on column public.exploracao_rural_parte.ordem is
  'Não é enfeite: o nome da composse é o 1º compossuidor listado seguido de "E OUTROS", e a ordem das assinaturas segue a ordem das partes.';

-- ---------------------------------------------------------------------------
-- 5. `exploracao_rural_imovel`
-- ---------------------------------------------------------------------------
-- O item do Anexo Único. A origem é POR IMÓVEL, não pelo instrumento: o
-- `[BV-COM]` tem 6 origens distintas numa composse só.
create table if not exists public.exploracao_rural_imovel (
  id                           uuid primary key default gen_random_uuid(),
  exploracao_rural_id          uuid not null references public.exploracao_rural(id) on delete cascade,
  matricula_id                 uuid not null references public.matricula(id),
  area_explorada               numeric,
  area_unidade                 text not null default 'ha',
  ordem                        integer not null default 0,
  origem_tipo                  text,
  origem_exploracao_rural_id   uuid references public.exploracao_rural(id) on delete set null,
  origem_externa_id            uuid references public.exploracao_rural_origem_externa(id) on delete set null,
  origem_contraparte_pessoa_id uuid references public.pessoa(id) on delete set null,
  created_at                   timestamptz not null default now(),
  created_by                   uuid default auth.uid(),
  updated_at                   timestamptz not null default now(),
  updated_by                   uuid default auth.uid(),
  constraint uq_exploracao_rural_imovel unique (exploracao_rural_id, matricula_id)
);

alter table public.exploracao_rural_imovel
  drop constraint if exists chk_exploracao_rural_imovel_origem_tipo,
  drop constraint if exists chk_exploracao_rural_imovel_origem_exclusiva,
  drop constraint if exists chk_exploracao_rural_imovel_origem_nao_circular,
  drop constraint if exists chk_exploracao_rural_imovel_area_positiva;

alter table public.exploracao_rural_imovel
  -- Vocabulário em minúscula, espelhando a grafia do enum `osg_tipo_exploracao`
  -- que já existe (arrendamento | parceria | …). Deliberadamente NÃO se reusa
  -- aquele enum: 'heranca' e 'outro' não são tipos de instrumento válidos para
  -- `exploracao_rural.tipo_exploracao`, e acrescentá-los lá ofereceria "herança"
  -- como tipo de exploração. A tela mapeia para os rótulos do contrato.
  add constraint chk_exploracao_rural_imovel_origem_tipo
    check (origem_tipo is null or origem_tipo in ('parceria','arrendamento','propria','heranca','outro')),
  -- Origem interna (outro instrumento já cadastrado) e externa (outorgante que
  -- não é cliente da PSA) são mutuamente exclusivas.
  add constraint chk_exploracao_rural_imovel_origem_exclusiva
    check (origem_exploracao_rural_id is null or origem_externa_id is null),
  add constraint chk_exploracao_rural_imovel_origem_nao_circular
    check (origem_exploracao_rural_id is null or origem_exploracao_rural_id <> exploracao_rural_id),
  add constraint chk_exploracao_rural_imovel_area_positiva
    check (area_explorada is null or area_explorada > 0);

comment on table public.exploracao_rural_imovel is
  'Item do Anexo Único: um imóvel do instrumento, com a área cedida e a origem daquele imóvel específico.';
comment on column public.exploracao_rural_imovel.area_explorada is
  'Área cedida NESTE instrumento. NÃO se confunde com matricula.area_explorada, que descreve o imóvel (achado #2 do relatório 13): no Anexo do [BV-COM] a área cedida é sempre menor que a área total da mesma linha — 234 ha cedidos de um imóvel de 295,86 ha. Que não ultrapasse a área da matrícula é validação de aplicação, porque CHECK não enxerga outra tabela.';
comment on column public.exploracao_rural_imovel.origem_contraparte_pessoa_id is
  'Achado F do relatório 14: nos itens (g)-(k) do [BV-COM] a contraparte da origem é UMA compossuidora nomeada, não o grupo.';

-- ---------------------------------------------------------------------------
-- 6. Índices
-- ---------------------------------------------------------------------------
-- As UNIQUE de cada tabela já cobrem o prefixo `exploracao_rural_id`; estes são
-- os caminhos de leitura que faltavam (e FK sem índice é armadilha no DELETE).
create index if not exists idx_exploracao_rural_parte_pessoa
  on public.exploracao_rural_parte (pessoa_id);
create index if not exists idx_exploracao_rural_parte_papel
  on public.exploracao_rural_parte (exploracao_rural_id, papel);

create index if not exists idx_exploracao_rural_imovel_matricula
  on public.exploracao_rural_imovel (matricula_id);
create index if not exists idx_exploracao_rural_imovel_origem_interna
  on public.exploracao_rural_imovel (origem_exploracao_rural_id)
  where origem_exploracao_rural_id is not null;
create index if not exists idx_exploracao_rural_imovel_origem_externa
  on public.exploracao_rural_imovel (origem_externa_id)
  where origem_externa_id is not null;
create index if not exists idx_exploracao_rural_imovel_origem_contraparte
  on public.exploracao_rural_imovel (origem_contraparte_pessoa_id)
  where origem_contraparte_pessoa_id is not null;

create index if not exists idx_exploracao_rural_origem_externa_instrumento
  on public.exploracao_rural_origem_externa (exploracao_rural_id);

create index if not exists idx_exploracao_rural_estudo_fiscal
  on public.exploracao_rural (estudo_fiscal_documento_id)
  where estudo_fiscal_documento_id is not null;
create index if not exists idx_exploracao_rural_documento_comprobatorio
  on public.exploracao_rural (documento_comprobatorio_id)
  where documento_comprobatorio_id is not null;

-- ---------------------------------------------------------------------------
-- 7. Triggers de autoria
-- ---------------------------------------------------------------------------
-- `set_updated_by()` grava `updated_by` E `updated_at` — é o molde de
-- `titularidade`/`matricula`, e por isso nenhuma das três precisa de um
-- trigger separado de touch.
drop trigger if exists trg_set_updated_by on public.exploracao_rural_parte;
create trigger trg_set_updated_by
  before update on public.exploracao_rural_parte
  for each row execute function public.set_updated_by();

drop trigger if exists trg_set_updated_by on public.exploracao_rural_imovel;
create trigger trg_set_updated_by
  before update on public.exploracao_rural_imovel
  for each row execute function public.set_updated_by();

drop trigger if exists trg_set_updated_by on public.exploracao_rural_origem_externa;
create trigger trg_set_updated_by
  before update on public.exploracao_rural_origem_externa
  for each row execute function public.set_updated_by();

-- De carona, uma correção: a `exploracao_rural` tinha só o touch de
-- `updated_at` (`trg_expr_updated_at` → `checklist_touch_updated_at`), sem
-- gravar `updated_by` — a coluna existe e nunca era preenchida no UPDATE.
-- `set_updated_by()` faz as duas coisas, então o trigger antigo fica redundante
-- e sai.
drop trigger if exists trg_expr_updated_at on public.exploracao_rural;
drop trigger if exists trg_set_updated_by on public.exploracao_rural;
create trigger trg_set_updated_by
  before update on public.exploracao_rural
  for each row execute function public.set_updated_by();

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
-- Copia o padrão da própria `exploracao_rural`, que checa cluster nas QUATRO
-- operações — e NÃO o da `titularidade`, que resolve cluster só no SELECT e no
-- INSERT/UPDATE/DELETE checa apenas o papel, deixando um team_member de outro
-- cluster escrever nela.
--
-- DELETE explícito em toda junção: as junções do MAPA nasceram com RLS sem
-- policy de DELETE, e o sintoma foi duplicate key ao revincular e remoção que
-- falhava em silêncio.
alter table public.exploracao_rural_parte          enable row level security;
alter table public.exploracao_rural_imovel         enable row level security;
alter table public.exploracao_rural_origem_externa enable row level security;

-- 8.1 `exploracao_rural_parte`
drop policy if exists "cluster can view exploracao_rural_parte"        on public.exploracao_rural_parte;
drop policy if exists "cluster team_member insert exploracao_rural_parte" on public.exploracao_rural_parte;
drop policy if exists "cluster team_member update exploracao_rural_parte" on public.exploracao_rural_parte;
drop policy if exists "cluster team_member delete exploracao_rural_parte" on public.exploracao_rural_parte;

create policy "cluster can view exploracao_rural_parte"
  on public.exploracao_rural_parte for select
  using (cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id)));

create policy "cluster team_member insert exploracao_rural_parte"
  on public.exploracao_rural_parte for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member update exploracao_rural_parte"
  on public.exploracao_rural_parte for update
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  )
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member delete exploracao_rural_parte"
  on public.exploracao_rural_parte for delete
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

-- 8.2 `exploracao_rural_imovel`
drop policy if exists "cluster can view exploracao_rural_imovel"        on public.exploracao_rural_imovel;
drop policy if exists "cluster team_member insert exploracao_rural_imovel" on public.exploracao_rural_imovel;
drop policy if exists "cluster team_member update exploracao_rural_imovel" on public.exploracao_rural_imovel;
drop policy if exists "cluster team_member delete exploracao_rural_imovel" on public.exploracao_rural_imovel;

create policy "cluster can view exploracao_rural_imovel"
  on public.exploracao_rural_imovel for select
  using (cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id)));

create policy "cluster team_member insert exploracao_rural_imovel"
  on public.exploracao_rural_imovel for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member update exploracao_rural_imovel"
  on public.exploracao_rural_imovel for update
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  )
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member delete exploracao_rural_imovel"
  on public.exploracao_rural_imovel for delete
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

-- 8.3 `exploracao_rural_origem_externa`
drop policy if exists "cluster can view exploracao_rural_origem_externa"        on public.exploracao_rural_origem_externa;
drop policy if exists "cluster team_member insert exploracao_rural_origem_externa" on public.exploracao_rural_origem_externa;
drop policy if exists "cluster team_member update exploracao_rural_origem_externa" on public.exploracao_rural_origem_externa;
drop policy if exists "cluster team_member delete exploracao_rural_origem_externa" on public.exploracao_rural_origem_externa;

create policy "cluster can view exploracao_rural_origem_externa"
  on public.exploracao_rural_origem_externa for select
  using (cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id)));

create policy "cluster team_member insert exploracao_rural_origem_externa"
  on public.exploracao_rural_origem_externa for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member update exploracao_rural_origem_externa"
  on public.exploracao_rural_origem_externa for update
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  )
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );

create policy "cluster team_member delete exploracao_rural_origem_externa"
  on public.exploracao_rural_origem_externa for delete
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id_de_exploracao_rural(exploracao_rural_id))
  );
