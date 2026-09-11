-- Desambigua o nome do bloco de administração e desfaz a colisão que ele causou
--
-- Substitui a `20260902173110`, que eu escrevi e apliquei sem consultar e que
-- ainda deixava dois problemas: a colisão continuava existindo (só o dano tinha
-- sido desfeito) e o índice que ela criava não cobria o caso.
--
-- Arquivo NOVO, e não emenda na `20260901230122` nem na `20260902123000`: as duas
-- já rodaram no sandbox, e editá-las faria os dois bancos rodarem arquivos
-- diferentes. Decisão do usuário em 02/09.
--
-- ── O QUE ACONTECEU ─────────────────────────────────────────────────────────
--
-- A `20260901230122` renomeou `Composse — Cláusula: administração e poderes` para
-- `Cláusula — Administração e poderes`. Esse nome JÁ EXISTIA no catálogo
-- societário, e `tmpl_bloco` não tem UNIQUE em `nome`: o banco aceitou dois
-- blocos homônimos, um `composse-rural` e um `contrato-social`.
--
-- A `20260902123000` então procurou o bloco assim:
--
--     select id into v_bloco from public.tmpl_bloco where nome = r.nome;
--
-- `select ... into` com mais de uma linha, em plpgsql, pega a PRIMEIRA e NÃO
-- reclama. Pegou o bloco do CONTRATO SOCIAL e gravou nele, como versão nova e
-- `atual`, o texto da administração da COMPOSSE. Os dois Contratos Sociais (Agro
-- e Participações) usam esse bloco: a cláusula de administração dos dois passou a
-- dizer "a *COMPOSSE* será administrada… por seu *COMPOSSUIDOR*".
--
-- Alcance conferido por consulta: UM bloco. As outras duas duplicatas do catálogo
-- são internas ao societário ("… — ajuste do documento") e não estão no mapa da
-- transcrição.
--
-- ── A CAUSA, E POR QUE O CONSERTO É RENOMEAR ────────────────────────────────
--
-- A `20260901230122` JÁ USA a convenção de desambiguação por sufixo — ela mesma
-- criou `Capítulo — Disposições gerais (parceria)` / `(composse)` e
-- `Anexo Único (parceria)` / `(composse)`. Eu simplesmente não a apliquei a este
-- nome. Renomear para `Cláusula — Administração e poderes (composse)` tira a
-- ambiguidade da ORIGEM, em vez de consertar o efeito dela para sempre.
--
-- ── COMO ESTA MIGRATION RODA NOS DOIS BANCOS ────────────────────────────────
--
-- Ela não pressupõe estado: cada passo aceita qualquer ponto de partida.
--
--   · SANDBOX hoje — o dano já foi desfeito pela 20260902173110 (bloco societário
--     na versão anterior, bloco rural com o texto certo, Considerando IV com o
--     numeral, índice criado). Aqui sobra a RENOMEAÇÃO e o DROP do índice.
--   · PRODUÇÃO depois — o lote roda em ordem: a 230122 cria a colisão, a 123000
--     grava o texto rural no bloco societário, e esta desfaz. O texto certo é
--     COPIADO da versão corrompida antes de apagá-la, para não ser redigitado.
--
-- Idempotente em todos os passos: `in (…)` aceita os dois nomes possíveis, a
-- versão nova só entra se o conteúdo diferir, e o `drop index` usa `if exists`.

-- ---------------------------------------------------------------------------
-- 1. O bloco rural ganha o sufixo do documento
-- ---------------------------------------------------------------------------
-- Aceita os DOIS nomes de partida: o de origem (banco que ainda não rodou a
-- 230122) e o intermediário (banco que já rodou). `categoria` trava o update no
-- bloco rural — sem isso ele renomearia o homônimo societário.
update public.tmpl_bloco
   set nome = 'Cláusula — Administração e poderes (composse)'
 where categoria = 'composse-rural'
   and nome in (
     'Composse — Cláusula: administração e poderes',
     'Cláusula — Administração e poderes'
   );

-- ---------------------------------------------------------------------------
-- 2. Desfaz o dano no bloco societário, devolvendo o texto ao bloco certo
-- ---------------------------------------------------------------------------
-- Varre por CONTEÚDO, e não por nome: o que identifica o dano é um bloco de fora
-- do rural com texto de composse dentro. Assim o passo funciona mesmo que o nome
-- já tenha mudado, e não depende de eu ter previsto o nome certo.
do $$
declare
  r          record;
  v_rural    uuid;
  v_texto    text;
  v_proxima  integer;
  v_desfeitos integer := 0;
begin
  select id into v_rural from public.tmpl_bloco
   where nome = 'Cláusula — Administração e poderes (composse)'
     and categoria = 'composse-rural';

  for r in
    select v.id as versao_id, v.bloco_id, v.conteudo
      from public.tmpl_bloco_versao v
      join public.tmpl_bloco b on b.id = v.bloco_id
     where b.categoria not in ('parceria-rural','composse-rural')
       and v.conteudo like 'A *COMPOSSE* será administrada%'
  loop
    v_texto := r.conteudo;

    -- (a) o bloco RURAL recebe o texto, se ainda não o tiver.
    if v_rural is not null and not exists (
      select 1 from public.tmpl_bloco_versao
       where bloco_id = v_rural and atual and conteudo = v_texto
    ) then
      select coalesce(max(numero_versao), 0) + 1 into v_proxima
        from public.tmpl_bloco_versao where bloco_id = v_rural;
      update public.tmpl_bloco_versao set atual = false where bloco_id = v_rural and atual;
      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
      values (v_rural, v_proxima, v_texto, true,
              'Texto transcrito do instrumento assinado — as nove alíneas de poderes da '
              'Cláusula Décima Primeira. Recuperado do bloco homônimo do Contrato Social, '
              'onde a transcrição o gravou por colisão de nome.');
    end if;

    -- (b) a versão intrusa sai. Apagada, e não só desmarcada: versão que contém o
    -- texto de OUTRO documento não é histórico, é corrupção — deixá-la ofereceria
    -- à Biblioteca um "restaurar versão" que quebra o Contrato Social.
    delete from public.tmpl_bloco_versao where id = r.versao_id;

    -- (c) o bloco volta à última versão dele mesmo.
    if not exists (
      select 1 from public.tmpl_bloco_versao where bloco_id = r.bloco_id and atual
    ) then
      update public.tmpl_bloco_versao set atual = true
       where id = (
         select id from public.tmpl_bloco_versao
          where bloco_id = r.bloco_id
          order by numero_versao desc limit 1
       );
    end if;

    v_desfeitos := v_desfeitos + 1;
  end loop;

  raise notice 'Colisão: % versão(ões) intrusa(s) desfeita(s).', v_desfeitos;
end $$;

-- ---------------------------------------------------------------------------
-- 3. O numeral do Considerando IV
-- ---------------------------------------------------------------------------
-- Os cinco Considerandos do composse escrevem o numeral no PRÓPRIO texto (*I)*,
-- *II)*…) porque não é numeração de capítulo e o motor não a gera. A transcrição
-- reescreveu o IV para corrigir a citação legal (é "Seção VII, artigos 50 ao
-- artigo 64", e não "artigo 13") e deixou o `*IV)*` de fora: o preâmbulo saía
-- I), II), III), sem numeral, V).
--
-- Sem versão nova: o que falta é um prefixo que nunca devia ter saído, e empilhar
-- uma versão por isso encheria o histórico de ruído em vez de contar uma decisão.
update public.tmpl_bloco_versao v
   set conteudo = '*IV)* ' || v.conteudo
  from public.tmpl_bloco b
 where b.id = v.bloco_id
   and b.nome = 'Considerando IV — Tributação na pessoa física'
   and v.atual
   and v.conteudo not like '*IV)*%';

-- ---------------------------------------------------------------------------
-- 4. Sai o índice que não protegia nada
-- ---------------------------------------------------------------------------
-- A `20260902173110` criou `uq_tmpl_bloco_nome_rural` como unique parcial em
-- (nome) WHERE categoria in ('parceria-rural','composse-rural'). Ele impede dois
-- blocos RURAIS homônimos — e a colisão era rural × societário, que ele não
-- cobre. Prova: o índice foi criado com sucesso e os dois blocos homônimos
-- continuaram lá.
--
-- Não há índice que resolva: um UNIQUE global em (nome) recusaria ser criado,
-- porque o catálogo societário já tem dois pares de homônimos internos legítimos
-- ("… — ajuste do documento"). A proteção real é o passo 1 (a desambiguação, que
-- tira a ambiguidade da origem) mais a disciplina de buscar bloco por
-- nome + categoria. Índice que não cobre o caso é pior que nenhum: dá segurança
-- falsa a quem lê o schema.
drop index if exists public.uq_tmpl_bloco_nome_rural;

-- ---------------------------------------------------------------------------
-- 5. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_corrompido integer;
  v_colisao    integer;
  v_sem_atual  integer;
  v_sem_numero integer;
  v_rural_ok   integer;
begin
  -- Nenhum bloco de fora do rural com texto rural dentro.
  select count(*) into v_corrompido
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id
   where b.categoria not in ('parceria-rural','composse-rural')
     and (v.conteudo like '%*COMPOSSE*%' or v.conteudo like '%PARCEIRA OUTORGANTE%');
  if v_corrompido > 0 then
    raise exception '% versão(ões) de bloco NÃO rural com texto rural dentro.', v_corrompido;
  end if;

  -- Nenhum nome rural repetido fora do rural: é a colisão, na origem.
  select count(*) into v_colisao
    from public.tmpl_bloco r
    join public.tmpl_bloco o on o.nome = r.nome
   where r.categoria in ('parceria-rural','composse-rural')
     and o.categoria not in ('parceria-rural','composse-rural');
  if v_colisao > 0 then
    raise exception '% nome(s) de bloco rural colidindo com bloco de fora do rural.', v_colisao;
  end if;

  -- O bloco rural existe com o nome novo e com o texto das nove alíneas.
  select count(*) into v_rural_ok
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.nome = 'Cláusula — Administração e poderes (composse)'
     and v.conteudo like '%*i)* Outorgar procurações%';
  if v_rural_ok <> 1 then
    raise exception 'O bloco de administração da composse não está com as nove alíneas (achei %).', v_rural_ok;
  end if;

  -- Todo bloco do catálogo com exatamente uma versão atual.
  select count(*) into v_sem_atual from (
    select b.id from public.tmpl_bloco b
      join public.tmpl_bloco_versao v on v.bloco_id = b.id
     group by b.id
    having count(*) filter (where v.atual) <> 1
  ) t;
  if v_sem_atual > 0 then
    raise exception '% bloco(s) sem exatamente uma versão atual.', v_sem_atual;
  end if;

  -- Os cinco Considerandos com o numeral romano no início.
  select count(*) into v_sem_numero
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.nome like 'Considerando %'
     and v.conteudo !~ '^\*[IVX]+\)\*';
  if v_sem_numero > 0 then
    raise exception '% Considerando(s) sem o numeral no início do texto.', v_sem_numero;
  end if;

  raise notice 'Desambiguação feita, colisão desfeita, Considerando IV numerado, índice inútil removido.';
end $$;
