-- O CAPÍTULO DA ADMINISTRAÇÃO COM CONSELHO E DIRETORIA
--
-- Frente D de docs/planos/ac-de-governanca-no-contrato-social.md. Depende das
-- frentes A, B e C, que já estão na branch: a alçada em peças, a condicional por
-- grupo de papel e a chave `governanca_por_orgaos` / `administracao_simples`.
--
-- ── DE ONDE VEM A REDAÇÃO ───────────────────────────────────────────────────
--
-- Do modelo da casa "VF_Contrato Social - Governança com conselho", que é o
-- capítulo IV inteiro (cláusulas sexta a vigésima), conferido contra os seis
-- contratos registrados do acervo "AC Participações · Governança registrada".
-- Nada aqui foi inventado: o que mudou foi trocar por placeholder o que o
-- cadastro responde (nome do órgão, mínimo, máximo, mandato) e deixar fixo o
-- que os seis contratos escrevem IGUAL (reeleição admitida, um voto por membro,
-- voto de desempate do presidente, instalação com maioria absoluta dos membros
-- em exercício, convocação com dez dias de antecedência).
--
-- DUAS DIVERGÊNCIAS DELIBERADAS em relação ao modelo, as duas por impossibilidade
-- e as duas marcadas para revisão jurídica:
--
--  1. O modelo cita as alíneas pela letra ("as alçadas previstas nas alíneas
--     'f', 'k', 'm', 'n' e 'o'"). A letra é calculada na geração, depois do
--     descarte, e depende da matriz de cada cliente: não há como escrevê-la no
--     bloco. O parágrafo passou a falar das alçadas "previstas nesta cláusula",
--     sem enumerar.
--  2. O modelo dá ao Conselho e à Diretoria uma lista fixa de competências. Aqui
--     ela vem da Matriz de Alçadas do cliente, por um bloco repetidor: é a razão
--     de ser da frente.
--
-- ── O QUE O CADASTRO PRECISA TER ────────────────────────────────────────────
--
-- As cláusulas de composição e de regime são por ÓRGÃO NOMEADO
-- (`conselhoAdministracao` e `diretoria`, os papéis do binding), como no modelo
-- da casa, que é um contrato de Conselho MAIS Diretoria. Cliente que tenha só um
-- dos dois não gera o capítulo sem que alguém escolha um órgão para o binding
-- vazio. A cláusula de COMPETÊNCIA não tem esse limite: ela repete sobre
-- `orgaosComCompetencia` e serve a quantos órgãos o cliente tiver.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS: `tmpl_bloco`, `tmpl_bloco_versao`, `tmpl_bloco_flag` e
-- `tmpl_documento_bloco`. Nenhum DDL, `types.ts` intocado. VAI PARA PRODUÇÃO.
-- Como a migration da Frente C, ela entra em produção DEPOIS do código: os
-- blocos pendem de flags que só o código sabe acender.
--
-- ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
--
-- Bloco só nasce se não existir, versão só entra se o bloco não tiver nenhuma,
-- vínculo tem `on conflict do nothing`, e o posicionamento confere se o
-- primeiro bloco já está no documento antes de empurrar as ordens.
--
-- ── REVISÃO JURÍDICA PENDENTE ───────────────────────────────────────────────
--
-- Como nas fatias da doação: a redação está transcrita, a conferência com a
-- consultoria não. A prova de aceite é gerar o contrato do Zamo e comparar
-- alínea a alínea com o registrado.

-- ---------------------------------------------------------------------------
-- 0. Ferramentas
-- ---------------------------------------------------------------------------

/* Cria o bloco e a versão 1 dele, uma vez. */
create or replace function pg_temp.bloco(
  p_id uuid, p_nome text, p_tipo text, p_conteudo text,
  p_ancora text default null, p_repete text default null
) returns void language plpgsql as $fn$
begin
  insert into public.tmpl_bloco (id, nome, categoria, descricao, tipo, ancora, repete_colecao, ativo)
  values (p_id, p_nome, 'contrato-social',
          'Capítulo da Administração com Conselho e Diretoria (governança).',
          p_tipo, p_ancora, p_repete, true)
  on conflict (id) do nothing;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  select p_id, 1, true, p_conteudo,
         'Redação inicial do capítulo de governança, do modelo da casa; revisão jurídica pendente.'
   where not exists (
     select 1 from public.tmpl_bloco_versao v where v.bloco_id = p_id
   );
end $fn$;

/* Uma variante da família da alínea. A cabeça não tem versão e não entra em documento. */
create or replace function pg_temp.variante(
  p_id uuid, p_cabeca uuid, p_nome text, p_rotulo text, p_ordem integer,
  p_seletor jsonb, p_conteudo text
) returns void language plpgsql as $fn$
begin
  insert into public.tmpl_bloco (
    id, nome, categoria, descricao, tipo, ativo,
    familia_id, variante_ordem, variante_rotulo, variante_seletor
  )
  values (p_id, p_nome, 'contrato-social',
          'Uma redação de alínea de competência, eleita por célula da Matriz.',
          'livre', true, p_cabeca, p_ordem, p_rotulo, p_seletor)
  on conflict (id) do nothing;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  select p_id, 1, true, p_conteudo,
         'Redação inicial da alínea de competência; revisão jurídica pendente.'
   where not exists (
     select 1 from public.tmpl_bloco_versao v where v.bloco_id = p_id
   );
end $fn$;

/* Liga uma flag a um bloco. */
create or replace function pg_temp.exige(p_bloco uuid, p_flag text)
returns void language plpgsql as $fn$
declare
  v_flag uuid;
begin
  select id into v_flag from public.tmpl_flag where nome = p_flag;
  if v_flag is null then
    raise exception 'flag % ausente: a migration da Frente C não rodou neste banco', p_flag;
  end if;
  insert into public.tmpl_bloco_flag (bloco_id, flag_id)
  values (p_bloco, v_flag)
  on conflict (bloco_id, flag_id) do nothing;
end $fn$;

/*
 * Põe uma fila de blocos logo depois de um bloco-âncora, em CADA documento
 * societário.
 *
 * A âncora é procurada pelo NOME do bloco dentro daquele documento, e a posição
 * é calculada ali: são dois documentos `tipo = 'societario'` (Agro e
 * Participações) e eles não têm os mesmos blocos nem as mesmas ordens. A frente
 * da doação aprendeu isso do jeito difícil — uma migration ancorada num UUID que
 * só existia num dos dois deixou o outro sem os blocos, em silêncio.
 */
create or replace function pg_temp.enfileirar(p_ancora text, p_blocos uuid[])
returns void language plpgsql as $fn$
declare
  documento record;
  v_ordem integer;
  i integer;
begin
  for documento in select id, nome from public.tmpl_documento where tipo = 'societario' loop
    -- Já enfileirado: não empurra ordem nenhuma de novo.
    if exists (
      select 1 from public.tmpl_documento_bloco
       where documento_id = documento.id and bloco_id = p_blocos[1]
    ) then
      continue;
    end if;

    select vinculo.ordem into v_ordem
      from public.tmpl_documento_bloco vinculo
      join public.tmpl_bloco b on b.id = vinculo.bloco_id
     where vinculo.documento_id = documento.id and b.nome = p_ancora;

    if v_ordem is null then
      raise exception 'âncora "%" não existe no documento "%"', p_ancora, documento.nome;
    end if;

    update public.tmpl_documento_bloco
       set ordem = ordem + array_length(p_blocos, 1), updated_at = now()
     where documento_id = documento.id and ordem > v_ordem;

    for i in 1 .. array_length(p_blocos, 1) loop
      insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
      values (documento.id, p_blocos[i], v_ordem + i, false)
      on conflict (documento_id, bloco_id) do nothing;
    end loop;
  end loop;
end $fn$;

-- ---------------------------------------------------------------------------
-- 1. O cabeçalho do capítulo ganha âncora
-- ---------------------------------------------------------------------------
-- "Capítulo — Administração" é COMPARTILHADO pelos dois regramentos (ver a
-- migration da Frente C) e continua sem flag. A âncora existe para a resolução
-- da AC citar o capítulo inteiro: `{{ refs.capituloAdministracao }}` devolve
-- "Capítulo IV", que é como o Zamo escreve ("altera-se todo o regramento do
-- capítulo da Administração"). Citar pelo capítulo é robusto a órgão
-- descartado; citar por intervalo de cláusulas não é.
update public.tmpl_bloco
   set ancora = 'capituloAdministracao', updated_at = now()
 where nome = 'Capítulo — Administração'
   and categoria = 'contrato-social'
   and ancora is distinct from 'capituloAdministracao';

-- ---------------------------------------------------------------------------
-- 2. A família da alínea de competência
-- ---------------------------------------------------------------------------
-- A cabeça só dá NOME à família: é por ele que o hospedeiro a inclui, com
-- {{familia nome="Alínea de competência"}} dentro do laço {{#competencias}}.
-- Ela não tem versão e não entra em documento nenhum.
insert into public.tmpl_bloco (id, nome, categoria, tipo, descricao, ativo)
values (
  '3a573ccb-dfe8-4fb7-948c-e9459f379491'::uuid,
  'Alínea de competência',
  'contrato-social',
  'livre',
  'Cabeça de família: dá nome ao trecho que a cláusula de competência inclui com '
  '{{familia nome="Alínea de competência"}}. Não tem versão e não entra em documento.',
  true
)
on conflict (id) do nothing;

-- As oito redações. O seletor lê o escopo do ITEM (a célula da Matriz), e o
-- desempate é por `variante_ordem`, menor ganha: por isso a faixa vem antes do
-- teto sozinho, e o padrão (seletor vazio, casa sempre) vem por último.
--
-- Todas as condições são CONDICIONAIS derivadas, nunca campo base: condicional
-- existe sempre (vale 'sim' ou ''), enquanto campo base some quando o cadastro
-- não o tem, e o que some vira "classificação ausente" na cara do consultor.
do $$
declare
  cabeca uuid := '3a573ccb-dfe8-4fb7-948c-e9459f379491'::uuid;
  -- O miolo que se repete em todas: o verbo do papel, a atividade e o que o
  -- cadastro detalhou.
  abertura text := '{{ competencia.papeisInfinitivo }} {{ competencia.atividadeMinuscula }}'
    || '{{#competencia.temDetalhamento}}, {{ competencia.detalhamento }}{{/competencia.temDetalhamento}}';
  -- A cauda da escada, que se lê AO CONTRÁRIO nos dois lados: quem tem destino
  -- submete o que foge da política, quem não tem autoriza.
  cauda text := '{{#competencia.sobe}}, submetendo {{ competencia.sobeParaAo }} '
    || '{{ competencia.sobePara }} o que exceder este limite'
    || '{{#competencia.foraDaPolitica}}, inclusive os atos não previstos nas políticas e na '
    || 'matriz de alçadas{{/competencia.foraDaPolitica}}{{/competencia.sobe}}'
    || '{{#competencia.naoSobe}}{{#competencia.foraDaPolitica}}, competindo-lhe ainda autorizar '
    || 'os atos não previstos nas políticas e na matriz de alçadas'
    || '{{/competencia.foraDaPolitica}}{{/competencia.naoSobe}}';
begin
  perform pg_temp.variante(
    '142113bf-fd20-4717-8c96-482154c438ad'::uuid, cabeca,
    'Alínea de competência: faixa em reais', 'Faixa (piso e teto) em reais', 1,
    '{"competencia.temFaixa": "sim", "competencia.emMoeda": "sim"}'::jsonb,
    abertura
      || ', em valor superior a R$ {{ competencia.alcadaPiso }} '
      || '({{ competencia.alcadaPisoExtenso }}) e até R$ {{ competencia.alcadaValor }} '
      || '({{ competencia.alcadaExtenso }})'
      || cauda
  );

  perform pg_temp.variante(
    'b8a0e58b-81ae-4d14-a8ce-6a36a8252305'::uuid, cabeca,
    'Alínea de competência: faixa em percentual', 'Faixa (piso e teto) em percentual', 2,
    '{"competencia.temFaixa": "sim", "competencia.emPercentual": "sim"}'::jsonb,
    abertura
      || ', em valor superior a {{ competencia.alcadaPiso }}% '
      || '({{ competencia.alcadaPisoPercentualExtenso }}) e até {{ competencia.alcadaValor }}% '
      || '({{ competencia.alcadaPercentualExtenso }}) {{ competencia.alcadaBase }}'
      || cauda
  );

  perform pg_temp.variante(
    'b3d5ed47-a189-45df-b26b-cd1041923a79'::uuid, cabeca,
    'Alínea de competência: até o teto em reais', 'Só teto, em reais', 3,
    '{"competencia.temTeto": "sim", "competencia.temPiso": "", "competencia.emMoeda": "sim"}'::jsonb,
    abertura
      || ', em valor de até R$ {{ competencia.alcadaValor }} ({{ competencia.alcadaExtenso }})'
      || cauda
  );

  perform pg_temp.variante(
    '34974a75-cfa8-49a2-bdd5-9c78e9670fe7'::uuid, cabeca,
    'Alínea de competência: até o teto em percentual', 'Só teto, em percentual', 4,
    '{"competencia.temTeto": "sim", "competencia.temPiso": "", "competencia.emPercentual": "sim"}'::jsonb,
    abertura
      || ', em valor de até {{ competencia.alcadaValor }}% '
      || '({{ competencia.alcadaPercentualExtenso }}) {{ competencia.alcadaBase }}'
      || cauda
  );

  perform pg_temp.variante(
    '27f872f0-ae48-4a0a-8ef0-9f84e62497fc'::uuid, cabeca,
    'Alínea de competência: acima do piso em reais', 'Só piso, em reais', 5,
    '{"competencia.temPiso": "sim", "competencia.temTeto": "", "competencia.emMoeda": "sim"}'::jsonb,
    abertura
      || ', em valor superior a R$ {{ competencia.alcadaPiso }} '
      || '({{ competencia.alcadaPisoExtenso }})'
      || cauda
  );

  perform pg_temp.variante(
    '52a22ae9-325d-4b8a-9837-91910f448b99'::uuid, cabeca,
    'Alínea de competência: acima do piso em percentual', 'Só piso, em percentual', 6,
    '{"competencia.temPiso": "sim", "competencia.temTeto": "", "competencia.emPercentual": "sim"}'::jsonb,
    abertura
      || ', em valor superior a {{ competencia.alcadaPiso }}% '
      || '({{ competencia.alcadaPisoPercentualExtenso }}) {{ competencia.alcadaBase }}'
      || cauda
  );

  perform pg_temp.variante(
    'df738368-0e20-4a1b-94f2-105a77131a65'::uuid, cabeca,
    'Alínea de competência: sem alçada, com destino', 'Sem alçada, encaminha a outro órgão', 7,
    '{"competencia.temTeto": "", "competencia.temPiso": "", "competencia.sobe": "sim"}'::jsonb,
    abertura
      || ', encaminhando {{ competencia.sobeParaAo }} {{ competencia.sobePara }} a matéria para '
      || 'deliberação'
      || '{{#competencia.foraDaPolitica}}, inclusive os atos não previstos nas políticas e na '
      || 'matriz de alçadas{{/competencia.foraDaPolitica}}'
  );

  -- Seletor VAZIO: casa sempre, e é a que escreve a alínea sem número nenhum
  -- ("Aprovar as políticas de risco…", que é como o modelo da casa a escreve).
  perform pg_temp.variante(
    '33e5da51-e9df-4c3e-97b2-40d670b62e85'::uuid, cabeca,
    'Alínea de competência: sem alçada', 'Sem alçada (padrão)', 8,
    '{}'::jsonb,
    abertura
      || '{{#competencia.foraDaPolitica}}, competindo-lhe ainda autorizar os atos não previstos '
      || 'nas políticas e na matriz de alçadas{{/competencia.foraDaPolitica}}'
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. As cláusulas do capítulo
-- ---------------------------------------------------------------------------
do $$
begin
  -- A abertura: quem administra a sociedade.
  perform pg_temp.bloco(
    'b6344463-deaf-446e-b380-0f223c33585e'::uuid,
    'Cláusula — Administração por Conselho e Diretoria', 'clausula',
    $txt$A sociedade é administrada {{ conselhoAdministracao.pelo }} {{ conselhoAdministracao.nome }} e {{ diretoria.pelo }} {{ diretoria.nome }}, cuja composição e eleição competem à Reunião de Sócios, competindo a representação da sociedade exclusivamente aos membros {{ diretoria.do }} {{ diretoria.nome }}.$txt$,
    'governancaInicio'
  );
  perform pg_temp.bloco(
    'd6219730-02ba-4fb8-9557-f21127d071a9'::uuid,
    'Parágrafo — Investidura dos administradores', 'paragrafo',
    $txt$Os membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} e {{ diretoria.do }} {{ diretoria.nome }} serão investidos no cargo mediante termo de posse no livro de atas de administração da sociedade e com o registro deste termo e da ata da Reunião de Sócios que os elegeram na Junta Comercial, sendo que os seus respectivos mandatos se findam na investidura dos novos membros eleitos para o mandato seguinte.$txt$
  );
  perform pg_temp.bloco(
    'a63231e0-6be5-48b1-9e3a-5a6899ac7228'::uuid,
    'Parágrafo — Renúncia de administrador', 'paragrafo',
    $txt$A renúncia de qualquer administrador se torna eficaz em relação à sociedade desde o momento em que lhe for entregue a comunicação escrita do renunciante, e em relação a terceiros de boa-fé, após o arquivamento no Registro Público de Empresas Mercantis, atos que poderão ser promovidos pelo renunciante.$txt$
  );
  perform pg_temp.bloco(
    '08718f4f-0191-42d4-aa4c-225b53322073'::uuid,
    'Parágrafo — Responsabilidade dos administradores', 'paragrafo',
    $txt$Os administradores da sociedade não são pessoalmente responsáveis pelas obrigações que contraírem em nome dela e em virtude de ato regular de gestão, mas responderão civilmente pelos prejuízos que causarem quando seus atos forem realizados com culpa, dolo, má-fé ou violarem as normas estabelecidas neste contrato social, a lei vigente neste país ou as normas internas da sociedade, incluindo suas políticas e matriz de alçadas.$txt$
  );

  -- O Conselho: composição e regime.
  perform pg_temp.bloco(
    '7ea9d259-74bd-4c27-b0a6-27733a545f1a'::uuid,
    'Cláusula — Composição do Conselho de Administração', 'clausula',
    $txt${{ conselhoAdministracao.artigoMaiusculo }} {{ conselhoAdministracao.nome }} será {{ conselhoAdministracao.composto }}{{#conselhoAdministracao.membrosEmFaixa}} por, no mínimo, {{ conselhoAdministracao.membrosMinimoNumeral }} ({{ conselhoAdministracao.membrosMinimoExtenso }}) e, no máximo, {{ conselhoAdministracao.membrosMaximoNumeral }} ({{ conselhoAdministracao.membrosMaximoExtenso }}) membros{{/conselhoAdministracao.membrosEmFaixa}}{{#conselhoAdministracao.membrosFixo}} por {{ conselhoAdministracao.membrosMinimoNumeral }} ({{ conselhoAdministracao.membrosMinimoExtenso }}) membros{{/conselhoAdministracao.membrosFixo}}{{#conselhoAdministracao.mandatoAnos}}, com prazo de mandato de {{ conselhoAdministracao.mandatoAnosNumeral }} ({{ conselhoAdministracao.mandatoAnosExtenso }}) anos{{/conselhoAdministracao.mandatoAnos}}, sendo admitida a reeleição, assegurado a cada membro direito a um voto nas suas reuniões.$txt$
  );
  perform pg_temp.bloco(
    '60b3b710-b23a-452c-8748-f1ae5305efdf'::uuid,
    'Parágrafo — Presidente e Vice-Presidente do Conselho', 'paragrafo',
    $txt$O Presidente e o Vice-Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} serão eleitos pelos próprios membros do órgão, sendo permitida a reeleição de ambos.$txt$
  );
  perform pg_temp.bloco(
    '4edaf171-c490-4c1b-adf7-14deda576267'::uuid,
    'Parágrafo — Substituição do Presidente do Conselho', 'paragrafo',
    $txt$O Vice-Presidente substituirá o Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, para todos os efeitos, nas ausências, vacâncias e impedimentos.$txt$
  );
  perform pg_temp.bloco(
    'abc8e7bb-7efe-4961-b1bf-0b0bdbde076f'::uuid,
    'Parágrafo — Vedação de acúmulo de cargos na administração', 'paragrafo',
    $txt$É vedado acumular o cargo de Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} e o de Diretor Executivo da sociedade.$txt$
  );

  perform pg_temp.bloco(
    '553fade2-6c60-4885-b421-bcf0de917242'::uuid,
    'Cláusula — Deliberações do Conselho de Administração', 'clausula',
    $txt$As matérias e deliberações tomadas nas reuniões {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} dependerão de aprovação da *maioria* de seus membros presentes nas reuniões deste órgão, competindo ao Presidente o voto de desempate.$txt$
  );
  perform pg_temp.bloco(
    '631e82b6-719d-4af0-8ba7-1d657718dd58'::uuid,
    'Parágrafo — Atas das deliberações do Conselho', 'paragrafo',
    $txt$As deliberações {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} serão lavradas em atas e registradas no Livro de Atas da administração da sociedade e, sempre que contiverem deliberações destinadas a produzir efeitos perante terceiros, seus extratos serão arquivados no registro do comércio da sede da sociedade.$txt$
  );
  perform pg_temp.bloco(
    'f92bfcf2-e21f-44e3-95cc-5eb2376a0df1'::uuid,
    'Parágrafo — Voto contrário fundamentado no Conselho', 'paragrafo',
    $txt$Os votos dos membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} contrários à proposta submetida à deliberação deste órgão deverão ser fundamentados, com suas razões obrigatoriamente consignadas em ata.$txt$
  );

  perform pg_temp.bloco(
    'ce6b823c-9b2b-484c-8c0d-789d7e9c291f'::uuid,
    'Cláusula — Reuniões do Conselho de Administração', 'clausula',
    $txt${{ conselhoAdministracao.artigoMaiusculo }} {{ conselhoAdministracao.nome }} reunir-se-á na sede ou em filiais da sociedade em caráter ordinário, de acordo com o calendário aprovado nos termos do parágrafo segundo desta cláusula, e em caráter extraordinário quando necessário aos interesses sociais, sempre que convocado por escrito através de notificação encaminhada ao endereço informado no termo de posse do conselheiro, inclusive eletrônico (e-mail), podendo a convocação ser emitida pelo Presidente ou por outros 02 (dois) conselheiros, com antecedência mínima de 10 (dez) dias, constando da convocação a data, o horário e os assuntos pertinentes à ordem do dia da reunião.$txt$
  );
  perform pg_temp.bloco(
    '5c50cc60-2914-4497-bef1-a53b777a8e4c'::uuid,
    'Parágrafo — Instalação da reunião do Conselho', 'paragrafo',
    $txt$As reuniões {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} só serão instaladas com a presença da maioria absoluta dos membros em exercício.$txt$
  );
  perform pg_temp.bloco(
    '1922a270-c25d-4eb1-8bf0-56d3ffdbdbcf'::uuid,
    'Parágrafo — Calendário anual do Conselho', 'paragrafo',
    $txt$A cada início de ano será divulgado o calendário corporativo anual {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, constando as datas previstas para as reuniões ordinárias.$txt$
  );
  perform pg_temp.bloco(
    'beecb645-d98f-4224-97d8-4aaaf44e026a'::uuid,
    'Parágrafo — Participação a distância na reunião do Conselho', 'paragrafo',
    $txt$Fica facultada, se necessária, a participação dos conselheiros na reunião por telefone, videoconferência ou outro meio de comunicação que possa assegurar a participação efetiva e a autenticidade do seu voto, sendo o conselheiro considerado, nestas hipóteses, presente à reunião, e seu voto será incorporado à ata da referida reunião, tornando-se válido para todos os efeitos legais.$txt$
  );
  perform pg_temp.bloco(
    'e59d53d6-a43b-4dfa-bf7e-46ac84371081'::uuid,
    'Parágrafo — Presidência e secretaria da reunião do Conselho', 'paragrafo',
    $txt$As reuniões {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} serão presididas pelo Presidente ou, na sua ausência, pelo Vice-Presidente, devendo o Presidente indicar o secretário da reunião, o qual será preferencialmente o profissional responsável pela secretaria do conselho e, em especial, que este não seja um conselheiro.$txt$
  );
  perform pg_temp.bloco(
    '3230d9f5-5fa5-4190-a1ce-53a9af173a96'::uuid,
    'Parágrafo — Agenda e documentos da reunião do Conselho', 'paragrafo',
    $txt$O Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} deve preparar a agenda das reuniões baseada nas solicitações de conselheiros e após consultar {{ diretoria.artigo }} {{ diretoria.nome }}, devendo ainda entregar a cada um dos conselheiros, com no mínimo 08 (oito) dias de antecedência da data da reunião, os documentos eventualmente necessários para deliberação dos assuntos da próxima reunião e o parecer jurídico, quando necessários ao exame da matéria.$txt$
  );
  perform pg_temp.bloco(
    'ab2583f4-d647-4928-9c1d-d7853f691de0'::uuid,
    'Parágrafo — Convidados da reunião do Conselho', 'paragrafo',
    $txt$O Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, por iniciativa própria ou por solicitação de qualquer conselheiro, poderá convocar os diretores da sociedade, gestores, assessores ou consultores para assistirem às reuniões e prestarem esclarecimentos ou informações sobre as matérias em apreciação.$txt$
  );
  perform pg_temp.bloco(
    'f6e071be-0f42-40a0-acee-ddb57918e3cd'::uuid,
    'Parágrafo — Reunião regular do Conselho com todos os membros', 'paragrafo',
    $txt$Será considerada regular a reunião {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} que tiver a presença de todos os conselheiros, independentemente das formalidades previstas no caput desta cláusula.$txt$
  );

  -- A cláusula de competência: UMA POR ÓRGÃO, montada da Matriz de Alçadas.
  --
  -- É o bloco repetidor sobre `orgaosComCompetencia`, e a seção aninhada
  -- `{{#competencias}}` resolve do escopo do item. A pontuação é JUNTURA (o ";"
  -- entre as alíneas e o "." fora da seção), e não texto do item: assim a última
  -- alínea não termina em ";", que é o defeito que a família da alínea de imóvel
  -- já corrigiu uma vez.
  perform pg_temp.bloco(
    'd83209fe-1cef-4caa-94cf-26d604832a38'::uuid,
    'Cláusula — Competência do órgão (Matriz de Alçadas)', 'clausula',
    $txt$Compete {{ orgao.ao }} {{ orgao.nome }}, além de outras matérias previstas neste contrato social:
{{#competencias sep=";\n" fim=";\n"}}{{ competencia.alinea }}) {{familia nome="Alínea de competência"}}{{/competencias}}.$txt$,
    null, 'orgaosComCompetencia'
  );

  -- A CAUDA INSTITUCIONAL, como bloco próprio e FIXO, logo depois do repetidor.
  --
  -- Entre 24% e 64% das alíneas dos contratos do acervo não são decisão com
  -- alçada: são deveres do órgão. Não têm linha na matriz e não devem ter. Ela é
  -- CLÁUSULA e não parágrafo porque a ordem dos órgãos no repetidor é a do
  -- cadastro, e um parágrafo se penduraria na última cláusula repetida, que pode
  -- não ser a do Conselho.
  perform pg_temp.bloco(
    '8c3de0d0-6464-4fff-a57e-0f67e483f1b8'::uuid,
    'Cláusula — Competência privativa do Conselho de Administração', 'clausula',
    $txt$Compete privativamente {{ conselhoAdministracao.ao }} {{ conselhoAdministracao.nome }}:
a) Manifestar-se sobre o relatório da administração, as demonstrações financeiras e a proposta de destinação do resultado do exercício antes de submetê-las à Reunião de Sócios;
b) Dar cumprimento ao acordo de quotistas arquivado na sede da sociedade naquilo que lhe couber;
c) Convocar a Reunião de Sócios nos casos previstos em lei e sempre que julgar conveniente, e, para tanto, o Presidente poderá isoladamente providenciar a publicação do edital de convocação e demais comunicações, desde que previamente aprovada a convocação em reunião deste conselho;
d) Decidir sobre todos os atos omissos neste contrato social que não sejam, por força de lei ou deste contrato, de competência exclusiva da Reunião de Sócios.$txt$,
    'governancaFim'
  );
  perform pg_temp.bloco(
    '6d542033-1236-491b-aaa5-ac7cfb70374b'::uuid,
    'Parágrafo — Efeito interna corporis das alçadas', 'paragrafo',
    $txt$As alçadas previstas neste capítulo não vinculam terceiros nem limitam a realização de atos {{ diretoria.pelo }} {{ diretoria.nome }}, cujo poder de representação está previsto neste contrato social, tendo seu efeito interna corporis entre os órgãos de administração face à sociedade e aos seus sócios. Contudo, os atos realizados pelos diretores ou pelos membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} contrários aos limites estabelecidos neste capítulo, nas demais cláusulas deste contrato social, nas políticas e na matriz de alçadas da sociedade os responsabiliza pessoalmente.$txt$
  );
  perform pg_temp.bloco(
    '0900ca7a-5041-46c4-aa0f-4f0eac871c21'::uuid,
    'Parágrafo — Alçadas na representação em outras sociedades', 'paragrafo',
    $txt$As alçadas previstas neste capítulo também limitam os atos dos membros {{ diretoria.do }} {{ diretoria.nome }} quando representarem a sociedade em Reunião de Sócios de sociedades controladas, ligadas ou relacionadas, de modo que os diretores deverão submeter previamente {{ conselhoAdministracao.ao }} {{ conselhoAdministracao.nome }} eventuais atos ou negócios jurídicos antes de representar esta sociedade nas reuniões ou assembleias daquelas outras sociedades.$txt$
  );

  perform pg_temp.bloco(
    'af209f2a-6d40-469c-8e86-6b31f3ec71e9'::uuid,
    'Cláusula — Perda do cargo de conselheiro', 'clausula',
    $txt$Perderá o cargo, ensejando a sua vacância definitiva, o membro {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} que deixar de participar de 03 (três) reuniões ordinárias consecutivas, sem motivo justificado ou licença concedida pelo órgão.$txt$
  );
  perform pg_temp.bloco(
    'd3398082-ce9a-45c9-9bde-2c4c39050de8'::uuid,
    'Parágrafo — Ausência temporária do Presidente do Conselho', 'paragrafo',
    $txt$Em caso de ausência ou impedimento temporário do Presidente {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, suas funções serão exercidas interinamente pelo Vice-Presidente deste órgão e, em caso de ausência ou impedimento temporário de ambos, os conselheiros remanescentes indicarão, dentre os demais membros, aquele que exercerá suas funções interinamente.$txt$
  );
  perform pg_temp.bloco(
    'e24e68f6-840f-4e63-a8e9-39e03ac96395'::uuid,
    'Parágrafo — Ausência temporária de conselheiro e quórum', 'paragrafo',
    $txt$Em caso de ausência ou impedimento temporário de qualquer membro {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, o órgão deverá funcionar com os demais membros, desde que seja possível manter o quórum mínimo previsto neste contrato social para o seu funcionamento.$txt$
  );

  perform pg_temp.bloco(
    'dc1d464b-7fd8-45d5-9dc0-c925b885c33c'::uuid,
    'Cláusula — Vacância no Conselho de Administração', 'clausula',
    $txt$Ocorrendo vacância definitiva de qualquer dos cargos de membro {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, um novo membro será eleito na primeira Reunião de Sócios após a ocorrência, para completar o mandato que competia ao anterior, a qual deverá ser realizada em um prazo máximo de 90 (noventa) dias.$txt$
  );
  perform pg_temp.bloco(
    'bedfdd77-3157-4706-a49d-0657412c651f'::uuid,
    'Parágrafo — Hipóteses de vacância no Conselho', 'paragrafo',
    $txt$Ocorrerá a vacância de um cargo {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} quando houver destituição, renúncia, morte, impedimento comprovado, declaração de incapacidade civil ou perda do mandato de um de seus membros.$txt$
  );

  -- A Diretoria.
  perform pg_temp.bloco(
    '3b9c5340-10eb-4038-97b0-9af1404941dd'::uuid,
    'Cláusula — Composição da Diretoria', 'clausula',
    $txt${{ diretoria.artigoMaiusculo }} {{ diretoria.nome }} é {{ diretoria.composto }}{{#diretoria.membrosEmFaixa}} por, no mínimo, {{ diretoria.membrosMinimoNumeral }} ({{ diretoria.membrosMinimoExtenso }}) e, no máximo, {{ diretoria.membrosMaximoNumeral }} ({{ diretoria.membrosMaximoExtenso }}) diretores{{/diretoria.membrosEmFaixa}}{{#diretoria.membrosFixo}} por {{ diretoria.membrosMinimoNumeral }} ({{ diretoria.membrosMinimoExtenso }}) diretores{{/diretoria.membrosFixo}}{{#diretoria.temCargos}}, com os seguintes cargos: {{ diretoria.cargos }}{{/diretoria.temCargos}}{{#diretoria.semCargos}}, com denominação atribuída no momento da composição{{/diretoria.semCargos}}, sendo que a composição e a eleição dos seus membros serão definidas em Reunião de Sócios{{#diretoria.mandatoAnos}} para um mandato de {{ diretoria.mandatoAnosNumeral }} ({{ diretoria.mandatoAnosExtenso }}) anos{{/diretoria.mandatoAnos}}, sendo admitida a reeleição.$txt$
  );
  perform pg_temp.bloco(
    'b7735d9e-f1f1-4a00-a097-4517cf2518ce'::uuid,
    'Parágrafo — Vacância e impedimento dos diretores', 'paragrafo',
    $txt$Aplicam-se aos diretores as regras de vacância e de impedimento temporário que recaem sobre os membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} previstas neste contrato social.$txt$
  );

  perform pg_temp.bloco(
    'd7a94393-8690-4a98-80ca-f44b328ebb94'::uuid,
    'Cláusula — Representação da sociedade pela Diretoria', 'clausula',
    $txt$Compete *isoladamente* a qualquer um dos diretores em exercício, além de outras competências descritas neste contrato social, a representação da sociedade em juízo ou fora dele, ativa e passivamente, inclusive perante o sistema financeiro nacional, entidades oficiais, repartições públicas, autarquias e sociedades de economia mista, repartições federais, estaduais e municipais, observando as condições e os limites de atuação impostos neste contrato social, bem como as alçadas previstas neste capítulo, cabendo-lhe ainda:
a) Cumprir as diretrizes e deliberações designadas {{ conselhoAdministracao.pelo }} {{ conselhoAdministracao.nome }};
b) Assinar, outorgar e aceitar contratos, atos e escrituras, estipulando cláusulas, condições, preços e formas de pagamento, assumindo direitos e obrigações, onerando inclusive o patrimônio da sociedade, observados os atos que demandem prévia autorização {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} ou da Reunião de Sócios;
c) Abrir, encerrar e movimentar contas bancárias, emitindo, endossando e recebendo cheques e ordens de pagamento;
d) Outorgar poderes para representar a sociedade, observados os limites estabelecidos neste contrato social, devendo as procurações ter prazo máximo de 02 (dois) anos e não podendo ser substabelecidas, exceto as ad judicia, que poderão ser outorgadas por prazo indeterminado e substabelecidas.$txt$
  );
  perform pg_temp.bloco(
    'c82b9a2d-60e2-44cc-b3f1-4b32ba97b411'::uuid,
    'Parágrafo — Ato único para fins de alçada', 'paragrafo',
    $txt$Serão considerados, para fins das alçadas tratadas neste capítulo, como um único ato ou negócio jurídico aqueles realizados sucessivamente que tenham a mesma natureza, as mesmas partes envolvidas e tenham ocorrido em um único exercício social.$txt$
  );

  perform pg_temp.bloco(
    '132d9782-7fb0-406f-bc8d-4ab1ce589666'::uuid,
    'Cláusula — Atos de competência da Diretoria em reunião', 'clausula',
    $txt$Compete {{ diretoria.ao }} {{ diretoria.nome }}, em reunião, elaborar e submeter para análise e aprovação {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }}, no que couber, sugestões, minutas e propostas para os assuntos que sejam de competência exclusiva daquele órgão.$txt$
  );
  perform pg_temp.bloco(
    'bee71c42-c7d5-4c69-bfde-a778085a4aa9'::uuid,
    'Parágrafo — Diretoria com um único diretor', 'paragrafo',
    $txt$Caso {{ diretoria.artigo }} {{ diretoria.nome }} seja {{ diretoria.composto }} por apenas um diretor, os atos previstos neste contrato social como sendo de exclusiva competência do órgão poderão ser realizados isoladamente pelo único diretor.$txt$
  );

  perform pg_temp.bloco(
    'cbe7b6a2-6491-48a6-8fa7-d24987e8ba76'::uuid,
    'Cláusula — Reunião da Diretoria', 'clausula',
    $txt${{ diretoria.artigoMaiusculo }} {{ diretoria.nome }} reunir-se-á ordinariamente 01 (uma) vez por mês e, extraordinariamente, mediante convocação do Diretor Executivo ou de pelo menos 02 (dois) dos seus membros, lavrando-se ata no livro próprio.$txt$
  );
  perform pg_temp.bloco(
    'cf803e40-190c-4eae-b493-9789c58eb5aa'::uuid,
    'Parágrafo — Voto de desempate na Diretoria', 'paragrafo',
    $txt$Competirá ao Diretor Executivo eventual voto de desempate das matérias debatidas em reunião {{ diretoria.do }} {{ diretoria.nome }}.$txt$
  );
  perform pg_temp.bloco(
    'fd551386-9bb6-4377-b7e7-37151149ed7a'::uuid,
    'Parágrafo — Prestação de contas da Diretoria ao Conselho', 'paragrafo',
    $txt${{ diretoria.artigoMaiusculo }} {{ diretoria.nome }} encaminhará {{ conselhoAdministracao.ao }} {{ conselhoAdministracao.nome }} cópias das atas de suas reuniões e prestará as informações que permitam avaliar o desempenho das atividades da sociedade.$txt$
  );

  perform pg_temp.bloco(
    '2a2191d7-6ae6-4a0c-b521-c2c0271cfa80'::uuid,
    'Cláusula — Perda do mandato de diretor', 'clausula',
    $txt$Os diretores e igualmente os procuradores nomeados e constituídos perdem, ipso facto, os seus mandatos caso se tornem civilmente insolventes, quando condenados por sentença criminal transitada em julgado, no caso de destituição deliberada pela Reunião de Sócios ou quando findo o mandato para o qual foram eleitos.$txt$
  );
  perform pg_temp.bloco(
    '94e8c682-a170-47d8-846e-468297d2c244'::uuid,
    'Cláusula — Vacância na Diretoria', 'clausula',
    $txt$Ocorrendo vacância definitiva de qualquer dos cargos de membro {{ diretoria.do }} {{ diretoria.nome }}, um novo membro será eleito na primeira Reunião de Sócios após a ocorrência, para completar o mandato que competia ao anterior, a qual deverá ser realizada em um prazo máximo de 90 (noventa) dias.$txt$
  );
  perform pg_temp.bloco(
    'd67046ca-38f2-444d-b841-4c56cfc8be36'::uuid,
    'Parágrafo — Hipóteses de vacância na Diretoria', 'paragrafo',
    $txt$Ocorrerá a vacância de um cargo {{ diretoria.do }} {{ diretoria.nome }} quando houver destituição, renúncia, morte, impedimento comprovado, declaração de incapacidade civil ou perda do mandato de um de seus membros.$txt$
  );

  perform pg_temp.bloco(
    'cae35950-fe22-4d5b-9060-7c42500e12ef'::uuid,
    'Cláusula — Desimpedimento dos membros da administração', 'clausula',
    $txt$Os membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} e {{ diretoria.do }} {{ diretoria.nome }} declaram, sob as penas da lei, que não estão impedidos de exercer a administração da sociedade por lei especial, ou em virtude de condenação criminal, ou por se encontrarem sob os efeitos dela, a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, ou contra a economia popular, contra o sistema financeiro nacional, contra normas de defesa da concorrência, contra as relações de consumo, a fé pública ou a propriedade (art. 1.011, § 1º, CC/2002).$txt$
  );
  perform pg_temp.bloco(
    '4e3b96d1-eff9-49f8-99f1-2c99e3eafa5a'::uuid,
    'Cláusula — Vedação à substituição dos membros da administração', 'clausula',
    $txt$Aos diretores e aos membros {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} é vedado fazer-se substituir no exercício de suas funções, decorrente do caráter personalíssimo da atividade. Contudo, a sociedade, por seus diretores, poderá nomear procuradores para representá-la, devendo as procurações ser outorgadas com a menção expressa dos poderes conferidos e ter, com exceção daquelas para fins judiciais, prazo determinado de validade de no máximo 01 (um) ano (art. 1.018, CC/2002).$txt$
  );
end $$;

-- ---------------------------------------------------------------------------
-- 4. As duas resoluções da alteração contratual
-- ---------------------------------------------------------------------------
-- Duas, e não uma, porque a resolução da INSTALAÇÃO não é a da MUDANÇA
-- ("instituem os sócios o Conselho de Administração" contra "alteram-se as
-- alçadas"). O evento é um só; quem separa as redações é o par
-- `governanca_instalada` / `governanca_alterada`.
--
-- A citação é PELO CAPÍTULO, com uma âncora só: `{{ refs.capituloAdministracao }}`
-- devolve "Capítulo IV" e é robusta a órgão descartado, ao contrário de um
-- intervalo de cláusulas, em que a cláusula de composição de um órgão que não
-- entrou devolveria referência vazia.
--
-- `tipo = 'livre'` com o título em negrito no próprio texto, que é a convenção
-- das resoluções recentes da AC: `clausula` receberia o prefixo automático
-- "CLÁUSULA X:", e resolução de alteração não é cláusula do consolidado.
do $$
begin
  perform pg_temp.bloco(
    '01a20156-0ae5-4011-9919-d50b3b9e852b'::uuid,
    'Resolução: instalação da governança', 'livre',
    $txt$*Da instalação da governança.* Os sócios deliberam instituir {{ conselhoAdministracao.artigo }} {{ conselhoAdministracao.nome }} e {{ diretoria.artigo }} {{ diretoria.nome }}, com a composição, as competências e as alçadas adiante consolidadas, alterando-se o {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$
  );
  perform pg_temp.bloco(
    '22d227a0-0b64-4932-b2db-0388f893d587'::uuid,
    'Resolução: alteração da governança', 'livre',
    $txt$*Da alteração da governança.* Os sócios deliberam alterar a composição, as competências e as alçadas dos órgãos de administração da sociedade, alterando-se o {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$
  );
end $$;

-- ---------------------------------------------------------------------------
-- 5. As flags e a posição nos dois modelos societários
-- ---------------------------------------------------------------------------
do $$
declare
  -- Na ordem em que o capítulo se lê. É esta a ordem em que entram no documento.
  capitulo uuid[] := array[
    'b6344463-deaf-446e-b380-0f223c33585e', 'd6219730-02ba-4fb8-9557-f21127d071a9',
    'a63231e0-6be5-48b1-9e3a-5a6899ac7228', '08718f4f-0191-42d4-aa4c-225b53322073',
    '7ea9d259-74bd-4c27-b0a6-27733a545f1a', '60b3b710-b23a-452c-8748-f1ae5305efdf',
    '4edaf171-c490-4c1b-adf7-14deda576267', 'abc8e7bb-7efe-4961-b1bf-0b0bdbde076f',
    '553fade2-6c60-4885-b421-bcf0de917242', '631e82b6-719d-4af0-8ba7-1d657718dd58',
    'f92bfcf2-e21f-44e3-95cc-5eb2376a0df1', 'ce6b823c-9b2b-484c-8c0d-789d7e9c291f',
    '5c50cc60-2914-4497-bef1-a53b777a8e4c', '1922a270-c25d-4eb1-8bf0-56d3ffdbdbcf',
    'beecb645-d98f-4224-97d8-4aaaf44e026a', 'e59d53d6-a43b-4dfa-bf7e-46ac84371081',
    '3230d9f5-5fa5-4190-a1ce-53a9af173a96', 'ab2583f4-d647-4928-9c1d-d7853f691de0',
    'f6e071be-0f42-40a0-acee-ddb57918e3cd', 'd83209fe-1cef-4caa-94cf-26d604832a38',
    '8c3de0d0-6464-4fff-a57e-0f67e483f1b8', '6d542033-1236-491b-aaa5-ac7cfb70374b',
    '0900ca7a-5041-46c4-aa0f-4f0eac871c21', 'af209f2a-6d40-469c-8e86-6b31f3ec71e9',
    'd3398082-ce9a-45c9-9bde-2c4c39050de8', 'e24e68f6-840f-4e63-a8e9-39e03ac96395',
    'dc1d464b-7fd8-45d5-9dc0-c925b885c33c', 'bedfdd77-3157-4706-a49d-0657412c651f',
    '3b9c5340-10eb-4038-97b0-9af1404941dd', 'b7735d9e-f1f1-4a00-a097-4517cf2518ce',
    'd7a94393-8690-4a98-80ca-f44b328ebb94', 'c82b9a2d-60e2-44cc-b3f1-4b32ba97b411',
    '132d9782-7fb0-406f-bc8d-4ab1ce589666', 'bee71c42-c7d5-4c69-bfde-a778085a4aa9',
    'cbe7b6a2-6491-48a6-8fa7-d24987e8ba76', 'cf803e40-190c-4eae-b493-9789c58eb5aa',
    'fd551386-9bb6-4377-b7e7-37151149ed7a', '2a2191d7-6ae6-4a0c-b521-c2c0271cfa80',
    '94e8c682-a170-47d8-846e-468297d2c244', 'd67046ca-38f2-444d-b841-4c56cfc8be36',
    'cae35950-fe22-4d5b-9060-7c42500e12ef', '4e3b96d1-eff9-49f8-99f1-2c99e3eafa5a'
  ]::uuid[];
  resolucoes uuid[] := array[
    '01a20156-0ae5-4011-9919-d50b3b9e852b', '22d227a0-0b64-4932-b2db-0388f893d587'
  ]::uuid[];
  bloco uuid;
begin
  -- Todo bloco do capítulo pende de `governanca_por_orgaos`, que é o outro lado
  -- de `administracao_simples`: ou o contrato tem este capítulo, ou tem o
  -- regramento simples, nunca os dois.
  foreach bloco in array capitulo loop
    perform pg_temp.exige(bloco, 'governanca_por_orgaos');
  end loop;

  -- As resoluções pedem o evento MAIS o lado do par que diz qual delas é.
  perform pg_temp.exige(resolucoes[1], 'evento_governanca');
  perform pg_temp.exige(resolucoes[1], 'governanca_instalada');
  perform pg_temp.exige(resolucoes[2], 'evento_governanca');
  perform pg_temp.exige(resolucoes[2], 'governanca_alterada');

  -- O capítulo entra logo depois do último bloco da administração simples: os
  -- dois regramentos moram no mesmo capítulo, e a flag decide qual sai.
  perform pg_temp.enfileirar('Parágrafo — Vedação à substituição do administrador', capitulo);
  -- As resoluções entram na região das resoluções, depois da última que trata da
  -- administração.
  perform pg_temp.enfileirar('Resolução: desimpedimento dos administradores nomeados', resolucoes);
end $$;
