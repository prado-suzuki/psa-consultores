
-- Table: ppr_regras_ciclo
create table ppr_regras_ciclo (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid references ciclos_avaliacao(id) on delete cascade,
  faixa_minima numeric not null,
  faixa_maxima numeric,
  classificacao text check (classificacao in ('supera','atende','atende_parcialmente','abaixo')) not null,
  multiplicador_bonus numeric not null default 1.0,
  descricao_publica text,
  created_at timestamptz default now()
);

alter table ppr_regras_ciclo enable row level security;
create policy "Autenticados visualizam regras PPR"
  on ppr_regras_ciclo for select using (auth.role() = 'authenticated');
create policy "Admin e lider gerenciam regras PPR"
  on ppr_regras_ciclo for all using (auth.role() = 'authenticated');

-- Table: comentarios_avaliacao
create table comentarios_avaliacao (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid references ciclos_avaliacao(id) on delete cascade,
  autor_id uuid not null,
  destinatario_id uuid,
  tipo text check (tipo in ('lider_para_membro','membro_resposta','membro_ponto_vista')) not null,
  conteudo text not null,
  visivel_para_membro boolean default true,
  lido boolean default false,
  lido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table comentarios_avaliacao enable row level security;

create policy "Membro ve comentarios destinados a ele"
  on comentarios_avaliacao for select
  using (
    (auth.uid() = destinatario_id and visivel_para_membro = true)
    or auth.uid() = autor_id
    or exists (
      select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','lider')
    )
  );

create policy "Autenticados inserem comentarios"
  on comentarios_avaliacao for insert
  with check (auth.role() = 'authenticated');

create policy "Autor edita proprio comentario"
  on comentarios_avaliacao for update
  using (auth.uid() = autor_id);

-- Table: relatorios_gerados
create table relatorios_gerados (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid references ciclos_avaliacao(id) on delete set null,
  membro_id uuid,
  tipo text check (tipo in ('avaliacao_completa','resumo_executivo','recomendacao_bonus','historico_evolucao')) not null,
  conteudo_ia text,
  gerado_por uuid,
  gerado_em timestamptz default now(),
  status text check (status in ('gerando','pronto','erro')) default 'gerando'
);

alter table relatorios_gerados enable row level security;
create policy "Admin e lider acessam relatorios"
  on relatorios_gerados for all using (auth.role() = 'authenticated');
