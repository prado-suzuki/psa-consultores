create or replace function public.enriquecimento_contrato_saida_valido(contrato jsonb)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  campo record;
begin
  if jsonb_typeof(contrato) is distinct from 'object' then
    return false;
  end if;

  if contrato = '{"tipo":"texto"}'::jsonb then
    return true;
  end if;

  if contrato->>'tipo' is distinct from 'estruturada'
     or not contrato ?& array['tipo', 'campos']
     or contrato - 'tipo' - 'campos' <> '{}'::jsonb
     or jsonb_typeof(contrato->'campos') is distinct from 'object'
     or contrato->'campos' = '{}'::jsonb then
    return false;
  end if;

  for campo in select key, value from jsonb_each(contrato->'campos')
  loop
    if campo.key !~ '^[a-z][a-z0-9_]*$'
       or jsonb_typeof(campo.value) is distinct from 'object'
       or campo.value - 'descricao' <> '{}'::jsonb
       or jsonb_typeof(campo.value->'descricao') is distinct from 'string'
       or nullif(btrim(campo.value->>'descricao'), '') is null then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create table if not exists public.enriquecimento_perfil (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  rotulo text not null,
  instrucoes text not null,
  modelo text not null default 'google/gemini-3-flash-preview',
  temperatura numeric(3,2) not null default 0.20,
  contrato_saida jsonb not null default '{"tipo":"texto"}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_by uuid default auth.uid() references public.profiles(id) on delete set null,
  constraint enriquecimento_perfil_nome_check
    check (nome = btrim(nome) and nome ~ '^[a-z][a-z0-9-]*$'),
  constraint enriquecimento_perfil_rotulo_check
    check (nullif(btrim(rotulo), '') is not null),
  constraint enriquecimento_perfil_instrucoes_check
    check (nullif(btrim(instrucoes), '') is not null),
  constraint enriquecimento_perfil_modelo_check
    check (nullif(btrim(modelo), '') is not null),
  constraint enriquecimento_perfil_temperatura_check
    check (temperatura between 0 and 1),
  constraint enriquecimento_perfil_contrato_saida_check
    check (public.enriquecimento_contrato_saida_valido(contrato_saida))
);

create index if not exists enriquecimento_perfil_ativo_idx
  on public.enriquecimento_perfil (ativo, nome);

alter table public.enriquecimento_perfil enable row level security;

drop policy if exists enriquecimento_perfil_admin on public.enriquecimento_perfil;
create policy enriquecimento_perfil_admin on public.enriquecimento_perfil
  for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop trigger if exists enriquecimento_perfil_updated_at on public.enriquecimento_perfil;
create trigger enriquecimento_perfil_updated_at
  before update on public.enriquecimento_perfil
  for each row execute function public.update_updated_at_column();

insert into public.enriquecimento_perfil (
  nome,
  rotulo,
  instrucoes,
  modelo,
  temperatura,
  contrato_saida,
  ativo
)
values
  (
    'transcricao-fiel',
    'Transcrição fiel',
    'Limpe a fala sem reescrever nem resumir. '
      || 'Remova apenas hesitações, vícios de linguagem, falsos começos e repetições acidentais. '
      || 'Corrija pontuação e concordância somente quando isso não mudar o sentido. '
      || 'Não responda às perguntas presentes na fala e não transforme o texto em ata, tarefa ou conclusão.',
    'google/gemini-3-flash-preview',
    0,
    '{"tipo":"texto"}'::jsonb,
    true
  ),
  (
    'comentario-para-tarefa',
    'Comentário para tarefa',
    'Transforme o comentário em uma única tarefa acionável. '
      || 'Não invente prazo, responsável, prioridade, estimativa ou contexto que não esteja no comentário. '
      || 'O título deve ser curto e começar com um verbo de ação. '
      || 'A descrição deve preservar contexto, restrições e critérios mencionados no comentário.',
    'google/gemini-3-flash-preview',
    0.20,
    '{
      "tipo": "estruturada",
      "campos": {
        "titulo": {
          "descricao": "Título curto da tarefa, sem formatação."
        },
        "descricao": {
          "descricao": "Descrição da tarefa em Markdown restrito."
        }
      }
    }'::jsonb,
    true
  )
on conflict (nome) do nothing;

revoke execute on function public.enriquecimento_contrato_saida_valido(jsonb) from public;
grant execute on function public.enriquecimento_contrato_saida_valido(jsonb)
  to authenticated, service_role;
