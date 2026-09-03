-- Catálogo rural: convenção de nome da casa e o fim da família da pecuária
--
-- Migration NOVA, e não emenda na `20260901190315`: aquela já foi aplicada, e
-- catálogo é dado gravado — a partir daqui toda correção entra por arquivo
-- próprio, para o histórico dizer o que existia e o que mudou.
--
-- ── POR QUE ─────────────────────────────────────────────────────────────────
--
-- Dois achados, de origens diferentes:
--
-- 1. O CONTRATO ASSINADO desmente a modelagem da pecuária. O instrumento de
--    parceria do MMS traz os TRÊS parágrafos ao mesmo tempo — §1 recria e
--    engorda, §2 cria, §3 ciclo completo. Não é uma escolha entre variantes; são
--    três parágrafos consecutivos da Cláusula Quinta. A família de blocos (e a
--    coluna `exploracao_rural.modalidade_pecuaria`, criada só para elegê-la)
--    partiam de uma premissa que o documento real não confirma.
--
--    E não são fixos: a parceria do Bela Vista e o contrato-modelo trazem CINCO
--    parágrafos na Cláusula Quinta, sem o de ciclo completo. São modalidades que
--    o contrato pode ou não explorar, e que coexistem quando explora mais de uma
--    — por isso entram como blocos OPCIONAIS com flag, e não obrigatórios.
--
-- 2. A CONVENÇÃO DE NOME divergia do catálogo societário. Lá os blocos se chamam
--    `Capítulo — Objeto Social`, `Cláusula — Denominação da sociedade`,
--    `Parágrafo — Sede`: `<Tipo> — <Assunto>`, sem prefixo de documento e sem
--    numeral de capítulo (quem numera é o motor, e o numeral no nome vira mentira
--    na primeira reordenação). Os rurais nasceram `Parceria — Cláusula: áreas
--    cedidas`, o que além de destoar FECHA A PORTA DO REUSO: ninguém reaproveita
--    numa composse um bloco cujo nome diz "Parceria".
--
-- A desambiguação, onde o mesmo assunto existe nos dois instrumentos com redação
-- diferente, é o sufixo entre parênteses — o mesmo recurso do `(consolidação)`
-- societário.
--
-- ── O QUE ESTA MIGRATION NÃO FAZ ────────────────────────────────────────────
--
-- Não mexe na `categoria`. Cheguei a planejar trocá-la e reconsiderei ao ver que
-- o documento "Contrato Social - (Agro)" mistura `contrato-social`,
-- `alteracao-contratual` e `alteracao`: a categoria é a PRATELEIRA do template de
-- origem, não o documento. `parceria-rural`/`composse-rural` já seguem isso.
--
-- Não corrige a REDAÇÃO. A comparação com o contrato assinado mostrou que vários
-- blocos resumem onde deveriam transcrever; isso é volume de texto e entra em
-- migration própria, criando versão 2 em `tmpl_bloco_versao`.
--
-- Idempotente: os `update` são por nome (aceitam o nome novo sem reescrever), os
-- `delete` usam `if exists` semântico e a inserção dos parágrafos da pecuária é
-- protegida por `on conflict do nothing`.

-- ---------------------------------------------------------------------------
-- Guarda: a mesma da migration de origem — ninguém pode depender destes blocos
-- ---------------------------------------------------------------------------
do $$
declare
  v_overrides integer;
begin
  select count(*) into v_overrides
    from public.documento_override o
   where o.bloco_alvo_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'))
      or o.bloco_substituto_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'));
  if v_overrides > 0 then
    raise exception
      '% override(s) apontam para blocos do catálogo rural. Renomear é seguro, mas o DELETE da cabeça de família e do parágrafo do cartório não é: revise antes.',
      v_overrides;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. A coluna da modalidade da pecuária
-- ---------------------------------------------------------------------------
-- Criada pela 20260901144006 e usada só para eleger a variante. Sem a família,
-- não sobra quem a leia. Existe SOMENTE no sandbox (conferido em produção: a
-- coluna não está lá, nem as três tabelas filhas do cadastro rural), então o
-- drop não perde dado de ninguém.
alter table public.exploracao_rural
  drop constraint if exists chk_expr_modalidade_pecuaria;
alter table public.exploracao_rural
  drop column if exists modalidade_pecuaria;

-- ---------------------------------------------------------------------------
-- 2. A pecuária deixa de ser família: as três variantes viram parágrafos
--    OPCIONAIS, um por modalidade explorada
-- ---------------------------------------------------------------------------
-- Ordem 162/164/166: entre a cláusula da partilha (160) e o parágrafo do
-- exercício fiscal (180), e na sequência em que o contrato assinado os traz —
-- recria e engorda, depois cria, depois ciclo completo.
--
-- `obrigatorio = false` + uma flag por modalidade é o mesmo mecanismo dos 30
-- blocos condicionais do catálogo societário: a banca liga o que aquele contrato
-- explora, e a numeração dos parágrafos se refaz sozinha (ver numeracao.ts, que
-- numera DEPOIS do filtro de flags).
do $$
declare
  v_doc     uuid;
  v_cabeca  uuid;
  r         record;
begin
  select id into v_doc from public.tmpl_documento where nome = 'Parceria Rural';
  if v_doc is null then
    raise exception 'Documento "Parceria Rural" não encontrado: a 20260901190315 não foi aplicada.';
  end if;

  select id into v_cabeca from public.tmpl_bloco
   where nome = 'Parceria — Parágrafo: frutos da pecuária' and familia_id is null;

  -- As flags da escolha. Escopo `documento`: é decisão DESTE contrato, não da
  -- pessoa jurídica nem do tipo de peça — a mesma exploração pode assinar duas
  -- parcerias com modalidades diferentes.
  insert into public.tmpl_flag (nome, tipo, escopo, descricao, ativo)
  values
    ('pecuaria_recria_engorda', 'manual', 'documento',
     'A parceria explora pecuária de recria e engorda (frutos = ganho de peso)', true),
    ('pecuaria_cria',           'manual', 'documento',
     'A parceria explora pecuária de cria (frutos = bezerros nascidos)', true),
    ('pecuaria_ciclo_completo', 'manual', 'documento',
     'A parceria explora pecuária de ciclo completo (frutos = peso adquirido em 12 meses)', true)
  on conflict (nome) do update
     set tipo = excluded.tipo, escopo = excluded.escopo,
         descricao = excluded.descricao, ativo = true;

  -- As variantes soltam o vínculo de família e entram no documento como
  -- parágrafos OPCIONAIS, cada um guardado pela flag da sua modalidade.
  for r in
    select * from (values
      ('Parceria — Parágrafo: frutos da pecuária (Recria e engorda (ganho de peso))',
       'Parágrafo — Frutos da pecuária na recria e engorda', 162, 'pecuaria_recria_engorda'),
      ('Parceria — Parágrafo: frutos da pecuária (Cria (bezerros nascidos))',
       'Parágrafo — Frutos da pecuária na cria', 164, 'pecuaria_cria'),
      ('Parceria — Parágrafo: frutos da pecuária (Ciclo completo (peso adquirido em 12 meses))',
       'Parágrafo — Frutos da pecuária no ciclo completo', 166, 'pecuaria_ciclo_completo')
    ) as t(antigo, novo, ordem, flag)
  loop
    update public.tmpl_bloco
       set nome = r.novo,
           familia_id = null, variante_seletor = null,
           variante_rotulo = null, variante_ordem = null
     where nome = r.antigo;

    insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
    select v_doc, b.id, r.ordem, false
      from public.tmpl_bloco b
     where b.nome = r.novo
    on conflict (documento_id, bloco_id) do update
       set ordem = excluded.ordem, obrigatorio = false;

    insert into public.tmpl_bloco_flag (bloco_id, flag_id)
    select b.id, f.id
      from public.tmpl_bloco b
      join public.tmpl_flag  f on f.nome = r.flag
     where b.nome = r.novo
    on conflict do nothing;
  end loop;

  -- A cabeça sai: o bloco só existia para hospedar o {{familia}}.
  if v_cabeca is not null then
    delete from public.tmpl_documento_bloco where bloco_id = v_cabeca;
    delete from public.tmpl_bloco_versao     where bloco_id = v_cabeca;
    delete from public.tmpl_bloco            where id       = v_cabeca;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. O Parágrafo Único da Cláusula Primeira sai — ele não existe no contrato
-- ---------------------------------------------------------------------------
-- Eu o escrevi para dizer, de uma vez, o dono e o cartório de todos os imóveis.
-- O instrumento assinado NÃO tem esse parágrafo: a informação está dentro de cada
-- alínea ("…de propriedade de MMS Agro Ltda., situado no município de…, do
-- Cartório de 1° Ofício…"). Manter os dois faria o contrato dizer duas vezes.
do $$
declare v_bloco uuid;
begin
  select id into v_bloco from public.tmpl_bloco
   where nome = 'Parceria — Parágrafo: propriedade e cartório dos imóveis';
  if v_bloco is not null then
    delete from public.tmpl_documento_bloco where bloco_id = v_bloco;
    delete from public.tmpl_bloco_versao     where bloco_id = v_bloco;
    delete from public.tmpl_bloco            where id       = v_bloco;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Renome para a convenção da casa
-- ---------------------------------------------------------------------------
-- Mapa explícito, e não regex: o nome é o que a Luana lê na Biblioteca, e um
-- `regexp_replace` esconde o resultado de quem revisa a migration.
update public.tmpl_bloco b
   set nome = m.novo
  from (values
  -- ── Parceria ──────────────────────────────────────────────────────────────
  ('Parceria — Título',                                            'Título — Parceria rural'),
  ('Parceria — Preâmbulo: parceira outorgante',                    'Preâmbulo — Parceira outorgante'),
  ('Parceria — Preâmbulo: parceiros outorgados',                   'Preâmbulo — Parceiros outorgados'),
  ('Parceria — Capítulo: Das áreas cedidas em parceria',           'Capítulo — Das áreas cedidas em parceria'),
  ('Parceria — Cláusula: áreas cedidas',                           'Cláusula — Áreas cedidas em parceria'),
  ('Parceria — Capítulo: Da vigência',                             'Capítulo — Da vigência'),
  ('Parceria — Cláusula: vigência',                                'Cláusula — Vigência da parceria'),
  ('Parceria — Parágrafo: devolução ao término',                   'Parágrafo — Devolução ao término'),
  ('Parceria — Parágrafo: prazo indeterminado após o vencimento',  'Parágrafo — Prazo indeterminado após o vencimento'),
  ('Parceria — Capítulo: Das atividades',                          'Capítulo — Das atividades'),
  ('Parceria — Cláusula: atividades permitidas',                   'Cláusula — Atividades permitidas'),
  ('Parceria — Capítulo: Das despesas',                            'Capítulo — Das despesas'),
  ('Parceria — Cláusula: despesas dos outorgados',                 'Cláusula — Despesas dos outorgados'),
  ('Parceria — Capítulo: Da participação nos frutos',              'Capítulo — Da participação nos frutos'),
  ('Parceria — Cláusula: partilha dos frutos',                     'Cláusula — Partilha dos frutos'),
  ('Parceria — Parágrafo: frutos por exercício',                   'Parágrafo — Frutos por exercício'),
  ('Parceria — Parágrafo: mora na entrega dos frutos',             'Parágrafo — Mora na entrega dos frutos'),
  ('Parceria — Cláusula: disposição dos frutos antes da partilha', 'Cláusula — Disposição dos frutos antes da partilha'),
  ('Parceria — Cláusula: caso fortuito e força maior',             'Cláusula — Caso fortuito e força maior'),
  ('Parceria — Cláusula: obrigações da mão de obra rural',         'Cláusula — Obrigações da mão de obra rural'),
  ('Parceria — Capítulo: Do direito de preferência',               'Capítulo — Do direito de preferência'),
  ('Parceria — Cláusula: preferência na renovação',                'Cláusula — Preferência na renovação'),
  ('Parceria — Parágrafo: retomada para exploração direta',        'Parágrafo — Retomada para exploração direta'),
  ('Parceria — Parágrafo: preferência na venda',                   'Parágrafo — Preferência na venda'),
  ('Parceria — Capítulo: Da função social e da devolução dos bens','Capítulo — Da função social e da devolução dos bens'),
  ('Parceria — Cláusula: devolução dos bens',                      'Cláusula — Devolução dos bens'),
  ('Parceria — Parágrafo: benfeitorias não indenizáveis',          'Parágrafo — Benfeitorias não indenizáveis'),
  ('Parceria — Capítulo: Do uso do solo e mão de obra',            'Capítulo — Do uso do solo e mão de obra'),
  ('Parceria — Cláusula: manejo e conformidade',                   'Cláusula — Manejo e conformidade'),
  ('Parceria — Capítulo: Da extinção do contrato',                 'Capítulo — Da extinção do contrato'),
  ('Parceria — Cláusula: rescisão por inadimplemento',             'Cláusula — Rescisão por inadimplemento'),
  ('Parceria — Cláusula: rescisão por mútuo acordo',               'Cláusula — Rescisão por mútuo acordo'),
  ('Parceria — Capítulo: Da anuência',                             'Capítulo — Da anuência'),
  ('Parceria — Cláusula: anuência ao penhor',                      'Cláusula — Anuência ao penhor'),
  ('Parceria — Parágrafo: penhor por período de vigência',         'Parágrafo — Penhor por período de vigência'),
  ('Parceria — Parágrafo: destinação prioritária dos frutos',      'Parágrafo — Destinação prioritária dos frutos'),
  ('Parceria — Parágrafo: fiscalização pelas instituições',        'Parágrafo — Fiscalização pelas instituições'),
  ('Parceria — Capítulo: Disposições gerais',                      'Capítulo — Disposições gerais (parceria)'),
  ('Parceria — Cláusula: irrevogabilidade',                        'Cláusula — Irrevogabilidade'),
  ('Parceria — Cláusula: vedação de cessão',                       'Cláusula — Vedação de cessão'),
  ('Parceria — Cláusula: ônus alheios à exploração',               'Cláusula — Ônus alheios à exploração'),
  ('Parceria — Cláusula: regência pelo Estatuto da Terra',         'Cláusula — Regência pelo Estatuto da Terra'),
  ('Parceria — Cláusula: abertura de inscrição estadual',          'Cláusula — Abertura de inscrição estadual'),
  ('Parceria — Capítulo: Do foro',                                 'Capítulo — Do foro'),
  ('Parceria — Cláusula: foro de eleição',                         'Cláusula — Foro de eleição'),
  ('Parceria — Fecho e assinaturas',                               'Fecho e assinaturas (parceria)'),
  ('Parceria — Anexo Único',                                       'Anexo Único (parceria)'),

  -- ── Composse ──────────────────────────────────────────────────────────────
  -- Os "Considerando" mantêm o numeral no nome: ele é escrito no PRÓPRIO texto
  -- do bloco (*I)*, *II)*…), não gerado pelo motor como o de capítulo.
  ('Composse — Título',                                            'Título — Composse rural pro indiviso'),
  ('Composse — Preâmbulo: compossuidores',                         'Preâmbulo — Compossuidores'),
  ('Composse — Título: Preâmbulo',                                 'Título — Preâmbulo'),
  ('Composse — Considerando I: interesse em associar-se',          'Considerando I — Interesse em associar-se'),
  ('Composse — Considerando II: base legal da composse',           'Considerando II — Base legal da composse'),
  ('Composse — Considerando III: Estatuto da Terra',               'Considerando III — Estatuto da Terra'),
  ('Composse — Considerando IV: tributação na pessoa física',      'Considerando IV — Tributação na pessoa física'),
  ('Composse — Considerando V: origem da posse dos imóveis',       'Considerando V — Origem da posse dos imóveis'),
  ('Composse — Fecho do preâmbulo',                                'Fecho do preâmbulo'),
  ('Composse — Capítulo I: Do objeto',                             'Capítulo — Do objeto'),
  ('Composse — Cláusula: constituição da composse',                'Cláusula — Constituição da composse'),
  ('Composse — Cláusula: frações e frutos',                        'Cláusula — Frações e frutos'),
  ('Composse — Parágrafo: nome da composse',                       'Parágrafo — Nome da composse'),
  ('Composse — Parágrafo: liquidação de haveres',                  'Parágrafo — Liquidação de haveres'),
  ('Composse — Cláusula: despesas e ônus na proporção',            'Cláusula — Despesas e ônus na proporção'),
  ('Composse — Cláusula: prazo de indivisão',                      'Cláusula — Prazo de indivisão'),
  ('Composse — Parágrafo: imóvel que sai por fim da parceria de origem',
                                                                   'Parágrafo — Imóvel que sai por fim da parceria de origem'),
  ('Composse — Cláusula: vedação de transferir a terceiros',       'Cláusula — Vedação de transferir a terceiros'),
  ('Composse — Capítulo II: Do resultado da composse rural',       'Capítulo — Do resultado da composse rural'),
  ('Composse — Cláusula: apuração por ano-safra',                  'Cláusula — Apuração por ano-safra'),
  ('Composse — Parágrafo: receitas e despesas por livro caixa',    'Parágrafo — Receitas e despesas por livro caixa'),
  ('Composse — Parágrafo: prejuízo proporcional',                  'Parágrafo — Prejuízo proporcional'),
  ('Composse — Cláusula: responsabilidades suportadas pela composse',
                                                                   'Cláusula — Responsabilidades suportadas pela composse'),
  ('Composse — Cláusula: inscrição estadual',                      'Cláusula — Inscrição estadual da composse'),
  ('Composse — Cláusula: financiamento do capital de giro',        'Cláusula — Financiamento do capital de giro'),
  ('Composse — Parágrafo: CPR e cessão de frutos em garantia',     'Parágrafo — CPR e cessão de frutos em garantia'),
  ('Composse — Cláusula: repasse dos lucros',                      'Cláusula — Repasse dos lucros'),
  ('Composse — Capítulo III: Administração',                       'Capítulo — Da administração'),
  ('Composse — Cláusula: administração e poderes',                 'Cláusula — Administração e poderes'),
  ('Composse — Parágrafo: atos que exigem maioria ou nomeados',    'Parágrafo — Atos que exigem maioria ou nomeados'),
  ('Composse — Parágrafo: incapacidade civil superveniente',       'Parágrafo — Incapacidade civil superveniente'),
  ('Composse — Cláusula: acesso aos livros',                       'Cláusula — Acesso aos livros'),
  ('Composse — Cláusula: nulidade de atos estranhos à composse',   'Cláusula — Nulidade de atos estranhos à composse'),
  ('Composse — Capítulo IV: Do penhor',                            'Capítulo — Do penhor'),
  ('Composse — Cláusula: autorização do penhor',                   'Cláusula — Autorização do penhor'),
  ('Composse — Cláusula: prazo do penhor por safra',               'Cláusula — Prazo do penhor por safra'),
  ('Composse — Cláusula: destinação prioritária à liquidação',     'Cláusula — Destinação prioritária à liquidação'),
  ('Composse — Cláusula: fiscalização pelas instituições financeiras',
                                                                   'Cláusula — Fiscalização pelas instituições financeiras'),
  ('Composse — Capítulo V: Disposições gerais',                    'Capítulo — Disposições gerais (composse)'),
  ('Composse — Cláusula: vedação de cessão sem consentimento',     'Cláusula — Vedação de cessão sem consentimento'),
  ('Composse — Cláusula: preservação dos recursos naturais',       'Cláusula — Preservação dos recursos naturais'),
  ('Composse — Cláusula: irrevogabilidade e foro',                 'Cláusula — Irrevogabilidade e foro'),
  ('Composse — Fecho e assinaturas',                               'Fecho e assinaturas (composse)'),
  ('Composse — Anexo Único',                                       'Anexo Único (composse)')
  ) as m(antigo, novo)
 where b.nome = m.antigo;

-- ---------------------------------------------------------------------------
-- Conferência: nenhum bloco rural pode sobrar com o prefixo antigo
-- ---------------------------------------------------------------------------
do $$
declare v_resto integer;
begin
  select count(*) into v_resto
    from public.tmpl_bloco
   where categoria in ('parceria-rural','composse-rural')
     and nome ~ '^(Parceria|Composse) — ';
  if v_resto > 0 then
    raise exception 'Sobraram % bloco(s) rurais com o prefixo de documento no nome.', v_resto;
  end if;
end $$;
