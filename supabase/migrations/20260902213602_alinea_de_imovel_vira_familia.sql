-- A alínea de imóvel deixa de ser bloco repetidor e vira FAMÍLIA dentro de uma seção
--
-- ── O PROBLEMA QUE ISSO RESOLVE ─────────────────────────────────────────────
--
-- A última alínea da lista de imóveis terminava em ";" onde o instrumento
-- assinado usa "." — três ocorrências (Cláusula Primeira da parceria, Anexo da
-- parceria, Anexo do composse). Como bloco REPETIDOR, cada instância é um bloco
-- independente e nenhuma sabe que é a última: o ";" estava dentro do texto.
--
-- ── POR QUE SEÇÃO, E NÃO UM CAMPO "É O ÚLTIMO?" ────────────────────────────
--
-- Porque a casa já resolve isso, e resolve melhor. O bloco `Capital Social -
-- Agro` do Contrato Social faz assim:
--
--   … cada uma, sendo: {{#integralizacoes sep="; " fim="; e "}}{{ … }}
--   {{/integralizacoes}}, estando o capital social totalmente subscrito…
--
-- O item NÃO carrega pontuação. O ";" e o "; e" são JUNTURAS que o motor põe
-- ENTRE os itens, e o que fecha a frase fica FORA da seção. Por construção o
-- último item não recebe juntura — o problema deixa de existir em vez de ser
-- consertado. Um campo `ultimo`/`naoUltimo` funcionaria, mas seria mecanismo
-- paralelo ao que já existe.
--
-- ── POR QUE FAMÍLIA, E NÃO TEXTO COLADO NOS TRÊS HOSPEDEIROS ───────────────
--
-- Converter a alínea em seção, ingenuamente, colaria a descrição de ~700
-- caracteres dentro de TRÊS blocos hospedeiros — hoje ela vive em dois, um deles
-- compartilhado entre os dois documentos. Triplicar convida exatamente o erro
-- que aconteceu três vezes em 02/09/2026: corrigir a redação num lugar e
-- esquecer os outros (as aspas retas em cinco blocos, o Considerando I, e o
-- separador do preâmbulo do composse que já havia sido corrigido na parceria).
--
-- `{{familia nome="…"}}` é o mecanismo da casa para isso: a variante continua
-- sendo um bloco de verdade — com versão, histórico, override e entrada no
-- snapshot — e o texto é inserido DENTRO do hospedeiro, resolvido a cada
-- passagem do laço. É o que `familia.ts` descreve e o que o Contrato Social usa
-- em `Descrição de imóvel`.
--
-- ── DUAS FAMÍLIAS, UMA VARIANTE CADA ───────────────────────────────────────
--
-- A diferença entre a alínea do CORPO e a do ANEXO da parceria (confrontações e
-- perímetro) não é dado do imóvel: é o MESMO imóvel, com as mesmas
-- confrontações, descrito de forma curta no corpo e completa no anexo. Seletor
-- de variante lê o escopo do item, não o hospedeiro — então não há como uma
-- família só escolher entre as duas. Duas famílias, cada uma com a sua variante
-- padrão (seletor vazio), dizem a verdade sobre o que decide a escolha: o LUGAR.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS: `tmpl_bloco` (duas cabeças novas e as colunas de família nas duas
-- variantes), `tmpl_bloco_versao` (versão nova nos três hospedeiros e nas duas
-- variantes) e `tmpl_documento_bloco` (os três vínculos da alínea saem).
-- Nenhum DDL. VAI PARA PRODUÇÃO — é o mesmo catálogo de modelos.
--
-- ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
--
-- Cada passo confere o estado antes de agir: cabeça só nasce se não existir,
-- versão nova só entra se o conteúdo diferir, `familia_id` é idempotente por
-- natureza, e o `delete` do vínculo não reclama de linha ausente. Reaplicar não
-- muda nada.

-- ---------------------------------------------------------------------------
-- 0. Ferramentas
-- ---------------------------------------------------------------------------
create or replace function pg_temp.nova_versao(
  p_nome text, p_categoria text, p_conteudo text, p_changelog text
) returns void language plpgsql as $fn$
declare
  v_bloco uuid; v_quantos integer; v_proxima integer;
begin
  -- nome + CATEGORIA, nunca nome só: foi a busca por nome que gravou o texto da
  -- composse dentro do Contrato Social em 02/09 (ver 20260902175625).
  select count(*) into v_quantos from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;
  if v_quantos <> 1 then
    raise exception 'esperava 1 bloco "%" na categoria %, achei %', p_nome, p_categoria, v_quantos;
  end if;

  select id into v_bloco from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;

  if exists (select 1 from public.tmpl_bloco_versao
              where bloco_id = v_bloco and atual and conteudo = p_conteudo) then
    return;
  end if;

  select coalesce(max(numero_versao), 0) + 1 into v_proxima
    from public.tmpl_bloco_versao where bloco_id = v_bloco;
  update public.tmpl_bloco_versao set atual = false where bloco_id = v_bloco and atual;
  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
  values (v_bloco, v_proxima, p_conteudo, true, p_changelog);
end $fn$;

/*
 * Liga uma variante a uma cabeça de família, criando a cabeça se preciso.
 *
 * A CABEÇA não tem versão e não entra em documento nenhum: ela existe só para
 * dar NOME à família, porque é o nome que o autor do modelo escreve em
 * {{familia nome="…"}} e é por ele que o registro do render é indexado (ver
 * `montarRegistroFamilias`). Mesma forma da cabeça "Descrição de imóvel", que já
 * está no catálogo — conferida linha por linha antes de escrever isto.
 */
create or replace function pg_temp.vira_variante(
  p_cabeca text, p_variante text, p_categoria text, p_rotulo text
) returns void language plpgsql as $fn$
declare
  -- `v_quantos` é INTEGER e existe separado de `v_variante`: reaproveitar a
  -- variável uuid para receber o count(*) derruba a migration com
  -- "invalid input syntax for type uuid".
  v_cabeca uuid; v_variante uuid; v_quantos integer;
begin
  select id into v_cabeca from public.tmpl_bloco
   where nome = p_cabeca and categoria = p_categoria;
  if v_cabeca is null then
    insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
    values (p_cabeca, p_categoria, 'livre',
            'Cabeça de família: dá nome ao trecho que os hospedeiros incluem com '
            '{{familia nome="' || p_cabeca || '"}}. Não tem versão e não entra em documento.')
    returning id into v_cabeca;
  end if;

  select count(*) into v_quantos from public.tmpl_bloco
   where nome = p_variante and categoria = p_categoria;
  if v_quantos <> 1 then
    raise exception 'esperava 1 bloco "%" na categoria %, achei %', p_variante, p_categoria, v_quantos;
  end if;
  select id into v_variante from public.tmpl_bloco
   where nome = p_variante and categoria = p_categoria;

  update public.tmpl_bloco
     set familia_id       = v_cabeca,
         variante_ordem   = 1,
         -- Seletor VAZIO = variante padrão, casa sempre. Não há caso a
         -- distinguir: quem escolhe entre as duas famílias é o hospedeiro.
         variante_seletor = '{}'::jsonb,
         variante_rotulo  = p_rotulo,
         -- Deixa de repetir: agora quem itera é a seção do hospedeiro.
         repete_colecao   = null
   where id = v_variante;

  -- O vínculo com os documentos sai: a variante não é mais bloco do documento,
  -- é trecho incluído por dentro de outro bloco.
  delete from public.tmpl_documento_bloco where bloco_id = v_variante;
end $fn$;


-- ---------------------------------------------------------------------------
-- 1. As duas variantes: sem a letra e sem o ";"
-- ---------------------------------------------------------------------------
-- A LETRA sai do texto e vai para o hospedeiro: ela é posição na lista, não
-- descrição do imóvel — e assim a variante serve também a um contexto sem
-- alíneas. O ";" sai porque agora é juntura da seção.
select pg_temp.nova_versao(
  'Alínea — Imóvel cedido',
  'parceria-rural',
  '*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de ' ||
  '{{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, ' ||
  '*de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, ' ||
  'Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*' ||
  '{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}' ||
  '{{#imovel.folha}}, folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}' ||
  '{{#imovel.cartorio}} do {{ imovel.cartorio }}' ||
  '{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}' ||
  '{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}' ||
  '{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}}',
  'Vira variante de família: a letra da alínea e o ";" final passam para o hospedeiro (a juntura da seção).'
);

select pg_temp.nova_versao(
  'Alínea — Imóvel cedido com limites e perímetro',
  'parceria-rural',
  '*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de ' ||
  '{{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, ' ||
  '*de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, ' ||
  'Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*' ||
  '{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}' ||
  '{{#imovel.folha}}, folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}' ||
  '{{#imovel.cartorio}} do {{ imovel.cartorio }}' ||
  '{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}' ||
  '{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}' ||
  '{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}}' ||
  '{{#imovel.confrontacoes}}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}' ||
  '{{#imovel.georefPerimetro}}. Elementos do Perímetro: {{#vertices sep="; " fim="; "}}' ||
  '{{ vertice.codVertice }}-{{ vertice.codVante }}, {{ vertice.distancia }} metros {{ vertice.azimute }}' ||
  '{{#vertice.confrontacoes}} {{ vertice.confrontacoes }}{{/vertice.confrontacoes}}{{/vertices}}' ||
  'constante na cláusula primeira{{/imovel.georefPerimetro}}',
  'Vira variante de família: a letra da alínea e o ";" final passam para o hospedeiro (a juntura da seção).'
);

select pg_temp.vira_variante(
  'Alínea de imóvel cedido',
  'Alínea — Imóvel cedido',
  'parceria-rural',
  'Descrição curta (corpo do contrato e Anexo do composse)'
);

select pg_temp.vira_variante(
  'Alínea de imóvel cedido com limites e perímetro',
  'Alínea — Imóvel cedido com limites e perímetro',
  'parceria-rural',
  'Descrição com confrontações e perímetro (Anexo da parceria)'
);


-- ---------------------------------------------------------------------------
-- 2. Os três hospedeiros ganham a seção
-- ---------------------------------------------------------------------------
-- `sep=";\n\n"` — escape LITERAL `\n`, desfeito pelo motor em `desescapar`
-- (render.ts). Salto de linha cru aqui quebraria a tag da coleção.
--
-- O "." final fica FORA da seção: é o que fecha a frase depois do último item, e
-- é justamente ele que a lista não tinha.
select pg_temp.nova_versao(
  'Cláusula — Áreas cedidas em parceria',
  'parceria-rural',
  'As partes, por este instrumento contratual, constituem parceria rural para exploração ' ||
  '{{ instrumento.naturezaMinuscula }} em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, ' ||
  'cedendo a *PARCEIRA OUTORGANTE* em favor dos *PARCEIROS OUTORGADOS* os imóveis de sua posse e/ou ' ||
  'propriedade, descritos nas alíneas “{{ instrumento.primeiraAlinea }}” à “{{ instrumento.ultimaAlinea }}” ' ||
  'a seguir descritas, com os seus limites e confrontações dispostos no *ANEXO ÚNICO* deste instrumento:' ||
  E'\n\n' ||
  '{{#imoveisDoAnexo sep=";\n\n"}}*{{ imovel.alinea }})* {{familia nome="Alínea de imóvel cedido"}}' ||
  '{{/imoveisDoAnexo}}.',
  'A lista de imóveis passa a ser seção com família: a última alínea termina em "." como no assinado.'
);

select pg_temp.nova_versao(
  'Anexo Único (parceria)',
  'parceria-rural',
  '*~ANEXO ÚNICO~*' || E'\n\n' ||
  'Descrição das áreas objeto do *INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO ' ||
  '{{ instrumento.natureza }}*, pactuado entre *{{ instrumento.proprietarioComum }}* e ' ||
  '{{#exploradores sep=", " fim=" e "}}*{{ explorador.nome }}*{{/exploradores}} em ' ||
  '{{ instrumento.dataAssinaturaExtenso }}, sendo:' || E'\n\n' ||
  '{{#imoveisDoAnexo sep=";\n\n"}}*{{ imovel.alinea }})* ' ||
  '{{familia nome="Alínea de imóvel cedido com limites e perímetro"}}{{/imoveisDoAnexo}}.',
  'A lista de imóveis passa a ser seção com família: a última alínea termina em "." como no assinado.'
);

select pg_temp.nova_versao(
  'Anexo Único (composse)',
  'composse-rural',
  '*~ANEXO ÚNICO~*' || E'\n\n' ||
  'Descrição das áreas objeto do *Instrumento Particular de Constituição de Composse Rural ' ||
  '_Pro Indiviso_* firmado por {{#compossuidores sep=", " fim=" e "}}*{{ compossuidor.nome }}*' ||
  '{{/compossuidores}} em {{ instrumento.dataAssinaturaExtenso }}, sendo:' || E'\n\n' ||
  '{{#imoveisDoAnexo sep=";\n\n"}}*{{ imovel.alinea }})* {{familia nome="Alínea de imóvel cedido"}}' ||
  '{{/imoveisDoAnexo}}.',
  'A lista de imóveis passa a ser seção com família: a última alínea termina em "." como no assinado.'
);


-- ---------------------------------------------------------------------------
-- 3. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_cabecas    integer;
  v_variantes  integer;
  v_soltas     integer;
  v_hosp       integer;
  v_repete     integer;
  v_ponto      integer;
begin
  -- As duas cabeças existem, sem versão e fora de documento.
  select count(*) into v_cabecas
    from public.tmpl_bloco b
   where b.nome in ('Alínea de imóvel cedido', 'Alínea de imóvel cedido com limites e perímetro')
     and b.familia_id is null
     and not exists (select 1 from public.tmpl_bloco_versao v where v.bloco_id = b.id)
     and not exists (select 1 from public.tmpl_documento_bloco d where d.bloco_id = b.id);
  if v_cabecas <> 2 then
    raise exception 'esperava 2 cabeças de família limpas, achei %', v_cabecas;
  end if;

  -- Cada cabeça com exatamente uma variante, com versão atual e seletor vazio.
  select count(*) into v_variantes
    from public.tmpl_bloco cab
    join public.tmpl_bloco var on var.familia_id = cab.id
    join public.tmpl_bloco_versao v on v.bloco_id = var.id and v.atual
   where cab.nome in ('Alínea de imóvel cedido', 'Alínea de imóvel cedido com limites e perímetro')
     and var.variante_seletor = '{}'::jsonb
     and var.variante_ordem = 1;
  if v_variantes <> 2 then
    raise exception 'esperava 2 variantes ligadas e publicadas, achei %', v_variantes;
  end if;

  -- Nenhuma variante sobrou como bloco de documento.
  select count(*) into v_soltas
    from public.tmpl_documento_bloco db
    join public.tmpl_bloco b on b.id = db.bloco_id
   where b.nome like 'Alínea — Imóvel cedido%';
  if v_soltas > 0 then
    raise exception '% vínculo(s) de documento sobraram na alínea.', v_soltas;
  end if;

  -- Nenhuma variante ainda declarando repetição.
  select count(*) into v_repete
    from public.tmpl_bloco b
   where b.nome like 'Alínea — Imóvel cedido%' and b.repete_colecao is not null;
  if v_repete > 0 then
    raise exception '% variante(s) ainda com repete_colecao.', v_repete;
  end if;

  -- Os três hospedeiros incluem a família E fecham com ponto fora da seção.
  select count(*) into v_hosp
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.nome in ('Cláusula — Áreas cedidas em parceria', 'Anexo Único (parceria)', 'Anexo Único (composse)')
     and v.conteudo like '%{{familia nome="Alínea de imóvel cedido%'
     and v.conteudo like '%{{/imoveisDoAnexo}}.%';
  if v_hosp <> 3 then
    raise exception 'esperava 3 hospedeiros com família e ponto final, achei %', v_hosp;
  end if;

  -- Nenhum salto de linha cru dentro de sep/fim (o defeito de 02/09).
  select count(*) into v_ponto
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.categoria in ('parceria-rural','composse-rural')
     and v.conteudo ~ ('\{\{#[^}]*(sep|fim)="[^"]*' || chr(10));
  if v_ponto > 0 then
    raise exception '% bloco(s) com salto de linha cru dentro de sep/fim.', v_ponto;
  end if;

  raise notice 'Alínea virou família; a lista fecha com ponto na última.';
end $$;
