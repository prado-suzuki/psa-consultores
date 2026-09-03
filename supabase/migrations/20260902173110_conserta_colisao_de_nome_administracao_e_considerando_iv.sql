-- Conserta dois danos que a transcrição (20260902123000) causou
--
-- ── DANO 1: A CLÁUSULA DE ADMINISTRAÇÃO DO CONTRATO SOCIAL FOI SOBRESCRITA ──
--
-- A `20260901230122` renomeou `Composse — Cláusula: administração e poderes` para
-- `Cláusula — Administração e poderes`. Esse nome JÁ EXISTIA no catálogo
-- societário, e o mapa de renomeação criou uma colisão que ninguém viu: dois
-- `tmpl_bloco` com o mesmo nome e categorias diferentes (`composse-rural` e
-- `contrato-social`). `tmpl_bloco` não tem UNIQUE em `nome`, então o banco aceitou.
--
-- Aí a transcrição escorregou nela. Ela procurava assim:
--
--     select id into v_bloco from public.tmpl_bloco where nome = r.nome;
--
-- `select ... into` com mais de uma linha, em plpgsql, pega a PRIMEIRA e NÃO
-- reclama. Pegou o bloco do CONTRATO SOCIAL e gravou nele, como versão 4 e
-- `atual`, o texto da administração da COMPOSSE. Os dois Contratos Sociais (Agro
-- e Participações) usam esse bloco: a cláusula de administração dos dois passou a
-- falar de "*COMPOSSE* será administrada… por seu *COMPOSSUIDOR*".
--
-- Alcance conferido: UM bloco. A consulta por nomes repetidos entre categorias
-- devolve só este caso — as outras duas duplicatas do catálogo são internas ao
-- societário ("… — ajuste do documento") e não estão no mapa da transcrição.
--
-- O conserto, e por que a versão 4 é APAGADA e não só desmarcada: histórico serve
-- para mostrar como o texto evoluiu. Uma versão que contém o texto de OUTRO
-- documento não é evolução, é corrupção — deixá-la no histórico ofereceria à
-- Biblioteca um "restaurar versão" que quebra o contrato. O texto certo é
-- COPIADO de lá para o bloco rural antes de apagar, para não ser redigitado.
--
-- ── DANO 2: O CONSIDERANDO IV PERDEU O NUMERAL ──────────────────────────────
--
-- Os cinco Considerandos do composse escrevem o numeral no PRÓPRIO texto (*I)*,
-- *II)*…), porque não é numeração de capítulo e o motor não a gera. A transcrição
-- reescreveu o IV para corrigir a citação legal (é "Seção VII, artigos 50 ao
-- artigo 64", não "artigo 13") e, ao fazer isso, deixou o `*IV)*` de fora. O
-- preâmbulo saía I), II), III), sem numeral, V).
--
-- ── E A BLINDAGEM ───────────────────────────────────────────────────────────
--
-- No fim, um índice único parcial em (nome) para os blocos rurais convivendo com
-- o resto: ele não impede o societário de ter homônimos internos (que já tem),
-- mas impede um bloco rural de nascer com nome que já existe fora — que é a
-- condição exata que produziu este dano.
--
-- Idempotente: cada passo confere o estado antes de agir.

-- ---------------------------------------------------------------------------
-- 1. Devolve o texto certo a cada bloco
-- ---------------------------------------------------------------------------
do $$
declare
  v_societario uuid;
  v_rural      uuid;
  v_texto      text;
  v_proxima    integer;
begin
  select id into v_societario from public.tmpl_bloco
   where nome = 'Cláusula — Administração e poderes' and categoria = 'contrato-social';
  select id into v_rural from public.tmpl_bloco
   where nome = 'Cláusula — Administração e poderes' and categoria = 'composse-rural';

  if v_societario is null or v_rural is null then
    raise notice 'Colisão não encontrada (societário=% rural=%) — nada a consertar.',
      v_societario, v_rural;
    return;
  end if;

  -- O texto da composse, de onde ele foi gravado por engano.
  select conteudo into v_texto
    from public.tmpl_bloco_versao
   where bloco_id = v_societario
     and conteudo like 'A *COMPOSSE* será administrada%';

  if v_texto is not null then
    -- (a) o bloco RURAL recebe o texto, como versão nova.
    if not exists (
      select 1 from public.tmpl_bloco_versao
       where bloco_id = v_rural and atual and conteudo = v_texto
    ) then
      select coalesce(max(numero_versao), 0) + 1 into v_proxima
        from public.tmpl_bloco_versao where bloco_id = v_rural;

      update public.tmpl_bloco_versao set atual = false where bloco_id = v_rural and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
      values (v_rural, v_proxima, v_texto, true,
              'Texto transcrito do instrumento assinado — as nove alíneas de poderes da '
              'Cláusula Décima Primeira. Chegou aqui por esta migration porque a transcrição '
              'o gravou no bloco homônimo do Contrato Social (colisão de nome).');
    end if;

    -- (b) o bloco SOCIETÁRIO volta à última versão dele mesmo.
    delete from public.tmpl_bloco_versao
     where bloco_id = v_societario and conteudo like 'A *COMPOSSE* será administrada%';

    if not exists (
      select 1 from public.tmpl_bloco_versao where bloco_id = v_societario and atual
    ) then
      update public.tmpl_bloco_versao set atual = true
       where id = (
         select id from public.tmpl_bloco_versao
          where bloco_id = v_societario
          order by numero_versao desc limit 1
       );
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. O numeral do Considerando IV
-- ---------------------------------------------------------------------------
-- Sem versão nova: a transcrição já criou a versão 2 deste bloco há minutos, e o
-- que falta é um prefixo que nunca devia ter saído. Empilhar uma versão 3 por
-- isso encheria o histórico de ruído em vez de contar uma decisão.
update public.tmpl_bloco_versao v
   set conteudo = '*IV)* ' || v.conteudo
  from public.tmpl_bloco b
 where b.id = v.bloco_id
   and b.nome = 'Considerando IV — Tributação na pessoa física'
   and v.atual
   and v.conteudo not like '*IV)*%';

-- ---------------------------------------------------------------------------
-- 3. Blindagem: bloco rural não pode nascer homônimo de bloco de fora
-- ---------------------------------------------------------------------------
-- Índice PARCIAL, e não UNIQUE na tabela: o catálogo societário já tem homônimos
-- internos legítimos ("… — ajuste do documento" aparece duas vezes), e um UNIQUE
-- global recusaria dado que já existe. O que se proíbe é a condição que causou o
-- dano — um nome rural que também exista fora do rural.
create unique index if not exists uq_tmpl_bloco_nome_rural
  on public.tmpl_bloco (nome)
  where categoria in ('parceria-rural','composse-rural');

-- ---------------------------------------------------------------------------
-- 4. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_corrompido integer;
  v_sem_atual  integer;
  v_sem_numero integer;
begin
  -- Nenhum bloco de fora do rural pode ter texto rural.
  select count(*) into v_corrompido
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id
   where b.categoria not in ('parceria-rural','composse-rural')
     and (v.conteudo like '%*COMPOSSE*%' or v.conteudo like '%PARCEIRA OUTORGANTE%');
  if v_corrompido > 0 then
    raise exception '% versão(ões) de bloco NÃO rural com texto rural dentro.', v_corrompido;
  end if;

  -- Todo bloco do catálogo tem exatamente uma versão atual.
  select count(*) into v_sem_atual from (
    select b.id from public.tmpl_bloco b
      join public.tmpl_bloco_versao v on v.bloco_id = b.id
     group by b.id
    having count(*) filter (where v.atual) <> 1
  ) t;
  if v_sem_atual > 0 then
    raise exception '% bloco(s) sem exatamente uma versão atual.', v_sem_atual;
  end if;

  -- Os cinco Considerandos com o numeral no texto.
  select count(*) into v_sem_numero
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.nome like 'Considerando %'
     -- Regex, e não LIKE: o numeral é romano (I, II, III, IV, V) e o `*I%)*` da
     -- primeira tentativa recusava o próprio Considerando V, que está certo.
     and v.conteudo !~ '^\*[IVX]+\)\*';
  if v_sem_numero > 0 then
    raise exception '% Considerando(s) sem o numeral no início do texto.', v_sem_numero;
  end if;

  raise notice 'Colisão desfeita, Considerando IV numerado, índice de unicidade rural criado.';
end $$;
