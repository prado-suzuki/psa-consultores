-- Dois subtítulos de capítulo da parceria estavam truncados
--
-- ── O QUE ESTAVA ERRADO ─────────────────────────────────────────────────────
--
-- Depois de aplicar a `20260902200358`, o diff entre o documento GERADO e o
-- instrumento assinado ficou pequeno o bastante para as divergências longas
-- aparecerem — e duas eram palavra faltando no título de capítulo:
--
--   Capítulo VI   assinado: DO DIREITO DE PREFERÊNCIA NOS CASOS DE ALIENAÇÃO
--                           E/OU RENOVAÇÃO **DA PARCERIA**
--                 bloco   : Do Direito de Preferência nos Casos de Alienação
--                           e/ou Renovação
--
--   Capítulo VII  assinado: DA FUNÇÃO SOCIAL E DA DEVOLUÇÃO DOS BENS
--                           **CEDIDOS EM PARCERIA**
--                 bloco   : Da Função Social e da Devolução dos Bens
--
-- Não é estilo: são quatro palavras que o título assinado tem e o bloco não.
-- "dos Bens" sem "Cedidos em Parceria" muda o alcance do capítulo — a devolução
-- é dos bens CEDIDOS, não de bens em geral.
--
-- A caixa continua Title Case, que é o padrão do subtítulo em toda a casa (27
-- capítulos nos dois Contratos Sociais registrados). O que muda é só o texto.
--
-- ── POR QUE ARQUIVO NOVO ────────────────────────────────────────────────────
--
-- A `20260902200358` já rodou no sandbox. Emendá-la faria os dois bancos rodarem
-- arquivos diferentes — a regra que o usuário fixou em 02/09 depois do episódio
-- da colisão de nome.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS, nenhum DDL. VAI PARA PRODUÇÃO, junto com a `20260902200358`: é o
-- mesmo catálogo de modelos.
--
-- Idempotente: só grava versão nova se o conteúdo diferir do vigente.

create or replace function pg_temp.nova_versao(
  p_nome      text,
  p_categoria text,
  p_conteudo  text,
  p_changelog text
) returns void language plpgsql as $fn$
declare
  v_bloco   uuid;
  v_quantos integer;
  v_proxima integer;
begin
  -- Busca por nome + CATEGORIA, nunca por nome só: foi a busca por nome que
  -- gravou o texto da composse dentro do Contrato Social em 02/09 (ver
  -- 20260902175625).
  select count(*) into v_quantos
    from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;
  if v_quantos <> 1 then
    raise exception 'esperava 1 bloco "%" na categoria %, achei %', p_nome, p_categoria, v_quantos;
  end if;

  select id into v_bloco
    from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;

  if exists (
    select 1 from public.tmpl_bloco_versao
     where bloco_id = v_bloco and atual and conteudo = p_conteudo
  ) then
    return;
  end if;

  select coalesce(max(numero_versao), 0) + 1 into v_proxima
    from public.tmpl_bloco_versao where bloco_id = v_bloco;

  update public.tmpl_bloco_versao set atual = false where bloco_id = v_bloco and atual;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
  values (v_bloco, v_proxima, p_conteudo, true, p_changelog);
end $fn$;

select pg_temp.nova_versao(
  'Capítulo — Do direito de preferência',
  'parceria-rural',
  'Do Direito de Preferência nos Casos de Alienação e/ou Renovação da Parceria',
  'Volta "da Parceria", que o título assinado tem.'
);

select pg_temp.nova_versao(
  'Capítulo — Da função social e da devolução dos bens',
  'parceria-rural',
  'Da Função Social e da Devolução dos Bens Cedidos em Parceria',
  'Volta "Cedidos em Parceria": a devolução é dos bens cedidos, não de bens em geral.'
);

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_curto integer;
begin
  select count(*) into v_curto
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.categoria = 'parceria-rural'
     and b.tipo = 'capitulo'
     and (
       (b.nome = 'Capítulo — Do direito de preferência' and v.conteudo not like '%da Parceria')
       or
       (b.nome = 'Capítulo — Da função social e da devolução dos bens'
        and v.conteudo not like '%Cedidos em Parceria')
     );
  if v_curto > 0 then
    raise exception '% subtítulo(s) de capítulo ainda truncado(s).', v_curto;
  end if;

  raise notice 'Subtítulos de capítulo por inteiro.';
end $$;
