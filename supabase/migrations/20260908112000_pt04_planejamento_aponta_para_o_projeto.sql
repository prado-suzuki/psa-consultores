-- PT-04: o planejamento passa a dizer de qual projeto ele é.
--
-- POR QUE, e o problema que isto conserta:
--
-- Hoje `wp_estudo` se prende a uma ORDEM DE SERVIÇO, e uma OS tem vários
-- projetos. O Agro Amazônia, por exemplo, tem Planejamento Tributário,
-- Recuperação de Créditos e Levantamento de Créditos na mesma OS. Ninguém sabia
-- a qual deles o papel de trabalho pertencia, e o enunciado da PT-04 contornava
-- isso mandando avisar TODOS os projetos da OS.
--
-- Decisão de 08/09/2026, do Bernardo: em vez de adivinhar, o analista do TAX
-- escolhe o projeto na hora de subir o WP, e o aviso vai só para ele. Deixa de
-- ser contorno e vira dado.
--
-- **Não há estado nem conclusão.** A ideia anterior, de guardar um workflow com
-- abertura e conclusão, foi descartada na mesma conversa: o gatilho do aviso é a
-- revisão ser carregada, que é um fato que já acontece, e não uma transição que
-- alguém precisaria lembrar de marcar.
--
-- O QUE ESTA MIGRATION NÃO FAZ: não cria a função que avisa. Ela vem em
-- migration própria, depois de a Patricia validar os textos.

-- ─────────────────────────────────────────────────────────────────────────────
-- A coluna
-- ─────────────────────────────────────────────────────────────────────────────

-- **Aceita nulo, e é de propósito.** Os planejamentos que já existem foram
-- criados antes desta regra e não têm projeto. Tornar obrigatório agora exigiria
-- ou apagar o que existe, ou inventar um vínculo. A tela pede o projeto quando
-- ele falta, e é assim que o vazio se resolve, um por um, por quem sabe.
alter table public.wp_estudo
  add column if not exists projeto_id uuid references public.org_projects(id) on delete set null;

comment on column public.wp_estudo.projeto_id is
  'O projeto da OS a que este planejamento pertence, escolhido pelo analista ao '
  'subir o papel de trabalho. É para ele que vai o aviso de nova revisão. Nulo '
  'nos planejamentos criados antes de 08/09/2026.';

-- A busca que a função de aviso faz é "qual projeto avisar deste planejamento",
-- e a da tela é "este projeto já tem planejamento".
create index if not exists wp_estudo_projeto_idx
  on public.wp_estudo (projeto_id)
  where projeto_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- A integridade que a chave estrangeira sozinha não garante
-- ─────────────────────────────────────────────────────────────────────────────

-- A chave estrangeira garante que o projeto EXISTE. Não garante que ele é da
-- MESMA OS do planejamento, e é justamente isso que importa: um WP apontando
-- para o projeto de outro cliente mandaria o aviso para quem não tem nada com
-- aquilo, e o erro só apareceria quando alguém estranhasse a notificação.
--
-- Não dá para fazer com CHECK, que não enxerga outra tabela. Daí o gatilho.
create or replace function public.wp_estudo_projeto_da_mesma_os()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_os_do_projeto uuid;
begin
  if new.projeto_id is null then
    return new;
  end if;

  select p.ordem_servico_id into v_os_do_projeto
  from public.org_projects p
  where p.id = new.projeto_id;

  if v_os_do_projeto is distinct from new.ordem_servico_id then
    raise exception
      'O projeto escolhido não pertence à ordem de serviço deste planejamento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.wp_estudo_projeto_da_mesma_os() is
  'Recusa vincular o planejamento a um projeto de outra OS. A chave estrangeira '
  'garante que o projeto existe; este gatilho garante que ele é o certo.';

drop trigger if exists trg_wp_estudo_projeto_da_mesma_os on public.wp_estudo;

create trigger trg_wp_estudo_projeto_da_mesma_os
  before insert or update of projeto_id, ordem_servico_id on public.wp_estudo
  for each row
  execute function public.wp_estudo_projeto_da_mesma_os();

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_falhas text[] := '{}';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wp_estudo' and column_name = 'projeto_id'
  ) then
    v_falhas := v_falhas || 'a coluna projeto_id não foi criada';
  end if;

  -- Obrigatória seria destrutiva com os planejamentos que já existem.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wp_estudo'
      and column_name = 'projeto_id' and is_nullable = 'NO'
  ) then
    v_falhas := v_falhas || 'projeto_id não pode ser NOT NULL';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_wp_estudo_projeto_da_mesma_os' and not tgisinternal
  ) then
    v_falhas := v_falhas || 'o gatilho da OS não foi criado';
  end if;

  if not exists (select 1 from pg_indexes where indexname = 'wp_estudo_projeto_idx') then
    v_falhas := v_falhas || 'o índice de projeto não foi criado';
  end if;

  if array_length(v_falhas, 1) > 0 then
    raise exception 'GATE PT-04: %', array_to_string(v_falhas, '; ');
  end if;
end
$$;
