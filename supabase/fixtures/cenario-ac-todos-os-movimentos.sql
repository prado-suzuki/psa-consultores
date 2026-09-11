-- FIXTURE DE SANDBOX -- APLICADA A MAO, NUNCA POR MIGRACAO
--
-- Monta, num contrato so, UM movimento de cada gesto do quadro societario de uma
-- empresa de PARTICIPACOES (a Controladora), todos PENDENTES, de modo que baste
-- apertar "Gerar alteracao contratual" na tela Gerar para a peca sair com as
-- resolucoes de todos eles.
--
-- Cliente: "[TESTE] Alteracao Contratual Cenario Completo"
-- Empresa: "Ipe Amarelo Participacoes Ltda" (tipo CN)
--
-- Este arquivo NAO fica em `supabase/migrations/` e o motivo e o de sempre: ele
-- escreve dado de demonstracao num cliente especifico. Em `migrations/` seria
-- aplicado em PRODUCAO junto das outras. A guarda do topo do bloco recusa rodar
-- onde o cliente e a empresa deste cenario nao existirem, que e o caso de
-- producao.
--
-- ---------------------------------------------------------------------------
-- O QUE ELE MONTA
--
-- A base ja existia e nao e tocada: o contrato social (25/08) e a 1a alteracao
-- (25/08), as duas REGISTRADAS, publicaram capital de R$ 100.000,00 com quatro
-- socios (Aparecida 55.000, Bruno 25.000, Clarice 12.000, Danilo 8.000). E esse
-- snapshot que responde "de quanto para quanto" e "quem entrou e quem saiu" na
-- derivacao de eventos (ver src/lib/osg/baselineDaPeca.ts).
--
-- Sobre essa base, a fixture deixa PENDENTES, em seis atos societarios:
--
--   1. APORTE em moeda ................ Aparecida, +30.000 quotas
--   2. APORTE em moeda ................ Eduarda (socia nova), +20.000  -> ingresso
--   3. CESSAO onerosa ................. Danilo -> Bruno, 8.000         -> retirada
--   4. DOACAO simples ................. Aparecida -> Clarice, 10.000
--   5. DOACAO com reserva de usufruto . Aparecida -> Bruno, 15.000, usufruto
--      vitalicio com voto da doadora, os quatro gravames em tres deles, e a
--      origem patrimonial repartida (7.500 legitima + 7.500 disponivel)
--   6. INSTITUICAO de usufruto ........ Clarice concede a Aparecida o usufruto
--      de 12.000 quotas, sem que nenhuma quota mude de mao (so `onus_quotas`)
--   7. REDUCAO ........................ cancelamento de 5.000 quotas de Aparecida
--
-- Quadro resultante: Aparecida 55.000, Bruno 48.000, Clarice 22.000,
-- Eduarda 20.000, Danilo fora. Capital R$ 145.000,00 (100.000 + 50.000 de
-- aporte - 5.000 de reducao).
--
-- O que o assistente da alteracao deve derivar, com evidencia:
--   evento_aumento_capital ... de R$ 100.000,00 para R$ 145.000,00
--   evento_integralizacao .... 2 aporte(s) integralizado(s) com moeda corrente
--   evento_cessao_quotas ..... 1 cessao somando 8.000 quotas
--   evento_doacao_quotas ..... 2 doacoes somando 25.000 quotas
--   evento_mudanca_socios .... 1 ingresso e 1 retirada
--
-- Alem desses, o assistente chega com DOIS eventos de cadastro ja marcados, que
-- nao vem do livro de movimentos e sim da comparacao entre o instrumento
-- registrado e o cadastro de hoje: `evento_alteracao_endereco` (a sede) e
-- `evento_alteracao_qualificacao` (o endereco de tres socios). A divergencia ja
-- existia no cliente semeado e nao foi criada aqui; desmarque os dois se quiser
-- a peca so com os movimentos.
--
-- E o que ele NAO deriva, por limite conhecido do fluxo (o cenario existe
-- tambem para mostrar isso):
--   - INSTITUICAO DE USUFRUTO: a flag `evento_instituicao_usufruto` e o bloco
--     "Resolucao: instituicao de usufruto sobre quotas" existem no modelo e o
--     interruptor aparece no assistente, mas a colecao que o bloco repete
--     ({{#usufrutosInstituidos}}) nao e montada por
--     useGerarDocumentoController.ts -- `mapearUsufrutosInstituidos` esta escrita
--     e nao tem chamador. Medido em 11/09/2026 ligando a flag e gerando: a peca
--     sai SEM a resolucao, e sem erro -- o bloco cai calado por falta da colecao.
--     O efeito da instituicao aparece, isso sim, no consolidado: no quadro de
--     usufruto e voto, que sai de todos os onus vigentes (Aparecida com 27.000
--     quotas em usufruto, 15.000 da reserva mais 12.000 da instituicao).
--   - REDUCAO DE CAPITAL: nao ha flag nem bloco de resolucao propria. Ela entra
--     na peca pelo capital e pelo quadro resultantes, e nao por clausula. E o
--     que a propria ajuda da tela do quadro ja avisa.
--
-- ---------------------------------------------------------------------------
-- O QUE ELE APAGA (rode com isso em mente)
--
--   - todo documento NAO registrado da linhagem que nao chegou a registro
--     (no estado de 25/08 -> 11/09/2026: o rascunho de alteracao de 10/09);
--   - as respostas do assistente gravadas para este cliente
--     (`projeto_flag_valor`), que sao o que faz a tela dizer "alteracao em
--     composicao" e travar o botao;
--   - todo movimento de quota PENDENTE da empresa e todo onus/ato societario
--     dela -- ou seja, a propria rodada anterior desta fixture.
--
-- Movimento ja FORMALIZADO (com `documento_gerado_id`) e imutavel por trigger e
-- nao e tocado.
--
-- ---------------------------------------------------------------------------
-- A UNICA TRAVA QUE ELE CONTORNA, E POR QUE
--
-- Os quatro aportes da constituicao estavam PENDENTES: os dois documentos foram
-- registrados em 25/08/2026, antes de o registro na junta passar a carimbar o
-- ledger (D4, 27/08) e antes da trigger de registro atomico (09/09). Deixa-los
-- pendentes faria a alteracao contar a constituicao de novo -- "6 aportes" onde
-- esta peca lanca dois -- e e exatamente o defeito que o carimbo existe para
-- evitar.
--
-- Carimba-los e escrever a verdade (o contrato social publicou aqueles quatro),
-- mas a constraint trigger `trg_movimento_registro_confere` exige que o
-- `snapshot_dados->'movimentosFormalizados'` do documento registrado os liste --
-- e aquele snapshot e imutavel, por outra trigger. Por isso a fixture desabilita
-- a trigger de conferencia SO durante o carimbo e a religa em seguida. A
-- inconsistencia que sobra e inerte: `movimentosFormalizados` so e lido no
-- instante do registro, que para esses documentos ja passou.
--
-- Os tres imoveis da constituicao, pela mesma razao, seguiam com status
-- 'Aprovado' e voltariam a ser descritos na alteracao. A fixture os poe em
-- 'Integralizado', que e o que o registro faria hoje.
--
-- ---------------------------------------------------------------------------
-- COMO RODAR
--
--   supabase db query --linked -f supabase/fixtures/cenario-ac-todos-os-movimentos.sql
--
-- (o `--linked` deste repositorio aponta para o SANDBOX, vgzomuwnsdgrxbkyoavq).
-- Idempotente: rodar duas vezes deixa o banco igual.
--
-- COMO USAR, DEPOIS
--
--   1. app em http://localhost:8080, fora da branch `main` (aponta pro sandbox);
--   2. selecione o cliente "[TESTE] Alteracao Contratual Cenario Completo";
--   3. /equipe/osg/work/quadro-societario -> confira os seis atos no card;
--   4. /equipe/osg/work/gerar-documento -> empresa "Ipe Amarelo Participacoes
--      Ltda", modelo "Contrato Social - (Participacoes)";
--   5. "Gerar alteracao contratual" -> o assistente ja chega com os cinco
--      eventos acima marcados e com a evidencia de cada um.
--
-- ---------------------------------------------------------------------------

do $fixture$
declare
  c_cliente      constant uuid := 'ace00000-0000-4000-8000-000000000001';
  c_pj           constant uuid := 'ace00000-0000-4000-8000-000000000010';
  p_aparecida    constant uuid := 'ace00000-0000-4000-8000-000000000011';
  p_bruno        constant uuid := 'ace00000-0000-4000-8000-000000000012';
  p_clarice      constant uuid := 'ace00000-0000-4000-8000-000000000013';
  p_danilo       constant uuid := 'ace00000-0000-4000-8000-000000000014';
  p_eduarda      constant uuid := 'ace00000-0000-4000-8000-000000000015';
  d_constitutivo constant uuid := '6a6cccc6-7b64-4dbb-81ce-8996ba94177c';
  -- A 1a alteracao, tambem registrada: e ela que a alteracao nova substitui, e
  -- dela que sai o baseline (capital e quadro publicados).
  d_base         constant uuid := 'ad7f6693-72ad-4b78-9948-a63c00915d6b';
  -- Os quatro aportes da CONSTITUICAO, por id. Identifica-los por data ("os
  -- anteriores a 26/08") custou caro uma vez: o cenario foi resemeado depois da
  -- criacao do cliente, a data nao bateu, e o passo de limpeza levou a
  -- constituicao junto. Id e a unica chave estavel aqui.
  m_const_ap     constant uuid := '57829607-ba69-40a3-b997-9d937479c703';
  m_const_br     constant uuid := '87521cfd-c8f6-42b7-83bc-e44f8d092f76';
  m_const_cl     constant uuid := 'a36b5307-9e85-41ca-878c-f0f3c41cbf36';
  m_const_da     constant uuid := 'd16bf2ed-81f7-4d17-87ff-ef2eb7931b0c';
  b_sala         constant uuid := 'ace00000-0000-4000-8000-000000000051';
  b_conjunto     constant uuid := 'ace00000-0000-4000-8000-000000000052';
  b_fazenda      constant uuid := 'ace00000-0000-4000-8000-000000000053';
  ids_constituicao uuid[];
  -- Os seis atos e os sete lancamentos, com id fixo para a fixture ser idempotente.
  a_aporte       constant uuid := 'ace00000-0000-4000-8000-000000000101';
  a_cessao       constant uuid := 'ace00000-0000-4000-8000-000000000102';
  a_doacao       constant uuid := 'ace00000-0000-4000-8000-000000000103';
  a_doacao_onus  constant uuid := 'ace00000-0000-4000-8000-000000000104';
  a_instituicao  constant uuid := 'ace00000-0000-4000-8000-000000000105';
  a_reducao      constant uuid := 'ace00000-0000-4000-8000-000000000106';
  m_aporte_ap    constant uuid := 'ace00000-0000-4000-8000-000000000201';
  m_aporte_ed    constant uuid := 'ace00000-0000-4000-8000-000000000202';
  m_cessao       constant uuid := 'ace00000-0000-4000-8000-000000000203';
  m_doacao       constant uuid := 'ace00000-0000-4000-8000-000000000204';
  m_doacao_onus  constant uuid := 'ace00000-0000-4000-8000-000000000205';
  m_reducao      constant uuid := 'ace00000-0000-4000-8000-000000000206';
  o_reserva      constant uuid := 'ace00000-0000-4000-8000-000000000301';
  o_instituicao  constant uuid := 'ace00000-0000-4000-8000-000000000302';
  -- Uma data so para todos os atos: e um cenario, nao uma historia.
  d_ato          constant date := date '2026-09-11';
  t0             constant timestamptz := timestamptz '2026-09-11 12:00:00+00';
  n              integer;
  v_doc          record;
  v_par          record;
  v_itens        jsonb;
begin
  ids_constituicao := array[m_const_ap, m_const_br, m_const_cl, m_const_da];

  -- 0. GUARDA. A da casa primeiro (ver supabase/fixtures/README.md): o e-mail
  --    anonimizado do representante existe na replica de desenvolvimento e nao
  --    existe em producao. Depois, a do proprio cenario.
  if not exists (select 1 from public.representante where email ilike '%@exemplo.dev%') then
    raise exception 'FIXTURE DE SANDBOX rodando no banco errado. Abortado sem escrever nada.';
  end if;
  perform 1 from public.cliente where id = c_cliente and excluido = false;
  if not found then
    raise exception 'Cliente do cenario nao existe neste banco (%). A fixture e de sandbox.', c_cliente;
  end if;
  perform 1 from public.pessoa
   where id = c_pj and cliente_id = c_cliente and tipo_pessoa = 'PJ' and tipo_empresa = 'CN';
  if not found then
    raise exception 'A PJ de participacoes do cenario nao existe neste banco (%).', c_pj;
  end if;
  perform 1 from public.documento_gerado where id = d_constitutivo and status = 'registrado';
  if not found then
    raise exception 'O contrato social registrado do cenario nao existe (%).', d_constitutivo;
  end if;

  -- 0b. A TRIGGER DE CONFERENCIA, DESLIGADA PELO BLOCO INTEIRO. Ver o cabecalho:
  --     o carimbo da constituicao e legitimo e a trigger nao tem como saber
  --     disso, porque o snapshot que ela consulta e imutavel e foi congelado
  --     antes de a coluna existir. Desligar so na hora do carimbo nao da:
  --     `alter table` recusa quando ha evento de trigger pendente na mesma
  --     transacao, e o insert da constituicao ja deixa um. Religada no fim.
  alter table public.movimentacao_quotas disable trigger trg_movimento_registro_confere;
  alter table public.documento_gerado disable trigger trg_documento_registro_atomico;

  -- 1. LIMPEZA. Some o que trava o botao e o que sobrou da rodada anterior.
  --    Documento nao registrado de linhagem que nunca chegou a registro: rascunho
  --    e versao selada de uma alteracao que ninguem levou a junta. A linhagem
  --    COM registro fica intacta, com o historico dela.
  delete from public.documento_gerado d
   where d.cliente_id = c_cliente
     and d.status <> 'registrado'
     and not exists (
       select 1 from public.documento_gerado r
        where r.documento_raiz_id = d.documento_raiz_id and r.status = 'registrado');

  delete from public.projeto_flag_valor where cliente_id = c_cliente;

  -- 2. A CONSTITUICAO. Os quatro aportes fundadores, um por socio, cada um
  --    amarrado ao imovel que o pagou (matricula 78.412 -> Aparecida,
  --    78.413 -> Bruno, 12.907 -> Clarice 60% e Danilo 40%). Se ja existirem,
  --    nada muda; se faltarem, voltam com os ids originais.
  --
  --    `created_at` escalonado: e ele que da a ordem dos socios no preambulo
  --    (v_quadro_societario ordena pelo primeiro movimento de cada um).
  insert into public.movimentacao_quotas (
    id, cliente_id, empresa_pessoa_id, tipo, origem_pessoa_id, destino_pessoa_id,
    quotas, vlr_capital_arredondado, bem_id, created_at
  ) values
    (m_const_ap, c_cliente, c_pj, 'aporte', null, p_aparecida, 55000, 55000, b_sala,     timestamptz '2026-08-25 20:36:00+00'),
    (m_const_br, c_cliente, c_pj, 'aporte', null, p_bruno,     25000, 25000, b_conjunto, timestamptz '2026-08-25 20:36:01+00'),
    (m_const_cl, c_cliente, c_pj, 'aporte', null, p_clarice,   12000, 12000, b_fazenda,  timestamptz '2026-08-25 20:36:02+00'),
    (m_const_da, c_cliente, c_pj, 'aporte', null, p_danilo,     8000,  8000, b_fazenda,  timestamptz '2026-08-25 20:36:03+00')
  on conflict (id) do nothing;

  -- 2b. CARIMBO DA CONSTITUICAO. Ver o cabecalho: o registro de 25/08 nao
  --    carimbava, e sem isto a alteracao reconta os quatro aportes fundadores.
  select count(*) into n
    from public.movimentacao_quotas
   where id = any(ids_constituicao) and documento_gerado_id is null;
  if n > 0 then
    update public.movimentacao_quotas
       set documento_gerado_id = d_constitutivo
     where id = any(ids_constituicao) and documento_gerado_id is null;
    raise notice 'Carimbados % movimentos da constituicao no contrato social.', n;
  end if;

  -- 3. ZERA O PENDENTE. Depois do carimbo, todo pendente e residuo de rodada
  --    anterior (desta fixture ou de ensaio a mao).
  delete from public.onus_quotas where empresa_pessoa_id = c_pj;
  delete from public.movimentacao_quotas
   where empresa_pessoa_id = c_pj and documento_gerado_id is null
     and id <> all(ids_constituicao);
  delete from public.ato_societario where cliente_id = c_cliente;

  -- 4. OS IMOVEIS DA CONSTITUICAO SAIRAM DA FILA. O registro de hoje faria isso
  --    sozinho; os de 25/08 nao faziam, e o imovel voltaria a ser descrito.
  update public.bem
     set status_integralizacao = 'Integralizado'
   where cliente_id = c_cliente
     and empresa_destino_pessoa_id = c_pj
     and status_integralizacao in ('Aprovado', 'Aprovado para 2ª Instancia');

  -- 5. A SOCIA QUE INGRESSA. Sem ela nao ha ingresso para o evento de mudanca
  --    de socios contar dos dois lados.
  insert into public.pessoa (
    id, cliente_id, tipo_pessoa, denominacao, cpf_cnpj, genero, nacionalidade,
    profissao, estado_civil, data_nascimento, is_fundador,
    documento_identidade_tipo, documento_identidade_numero,
    documento_identidade_orgao, documento_identidade_uf,
    endereco_logradouro, endereco_numero, endereco_bairro, endereco_municipio,
    endereco_uf, endereco_cep
  ) values (
    p_eduarda, c_cliente, 'PF', 'Eduarda do Amaral Vasconcelos', '507.884.310-64',
    'F', 'Brasileira', 'Veterinária', 'Solteiro(a)', date '1994-03-18', false,
    'rg', '12.884.507-2', 'SESP', 'PR',
    'Rua Bispo Dom José', '2140', 'Batel', 'Curitiba', 'PR', '80440-080'
  )
  on conflict (id) do update set
    denominacao = excluded.denominacao,
    cpf_cnpj = excluded.cpf_cnpj,
    profissao = excluded.profissao,
    estado_civil = excluded.estado_civil,
    data_nascimento = excluded.data_nascimento,
    endereco_logradouro = excluded.endereco_logradouro,
    endereco_numero = excluded.endereco_numero,
    endereco_bairro = excluded.endereco_bairro,
    endereco_municipio = excluded.endereco_municipio,
    endereco_uf = excluded.endereco_uf,
    endereco_cep = excluded.endereco_cep;

  -- 6. OS SEIS ATOS.
  insert into public.ato_societario (id, cliente_id, data, descricao) values
    (a_aporte,      c_cliente, d_ato, 'Aumento de capital por aporte em moeda corrente'),
    (a_cessao,      c_cliente, d_ato, 'Cessão onerosa de quotas com retirada do cedente'),
    (a_doacao,      c_cliente, d_ato, 'Doação simples de quotas'),
    (a_doacao_onus, c_cliente, d_ato, 'Doação de quotas com reserva de usufruto vitalício e gravames'),
    (a_instituicao, c_cliente, d_ato, 'Instituição de usufruto sobre quotas'),
    (a_reducao,     c_cliente, d_ato, 'Redução de capital por cancelamento de quotas');

  -- 7. OS LANCAMENTOS. `created_at` explicito e escalonado: a view do quadro
  --    ordena os socios pelo primeiro movimento de cada um, e insert em lote com
  --    o default carimbaria o mesmo instante em todos (mesma razao de
  --    useGravarAporteInicial).
  insert into public.movimentacao_quotas (
    id, cliente_id, empresa_pessoa_id, tipo, origem_pessoa_id, destino_pessoa_id,
    quotas, vlr_capital_arredondado, data_movimento, ato_id, sequencia,
    quotas_legitima, quotas_disponivel, instrumento_data, created_at
  ) values
    (m_aporte_ap,   c_cliente, c_pj, 'aporte',  null,       p_aparecida, 30000, 30000, d_ato, a_aporte,      1, null, null, null, t0 + interval '1 second'),
    (m_aporte_ed,   c_cliente, c_pj, 'aporte',  null,       p_eduarda,   20000, 20000, d_ato, a_aporte,      2, null, null, null, t0 + interval '2 second'),
    (m_cessao,      c_cliente, c_pj, 'cessao',  p_danilo,   p_bruno,      8000,  8000, d_ato, a_cessao,      1, null, null, null, t0 + interval '3 second'),
    (m_doacao,      c_cliente, c_pj, 'doacao',  p_aparecida, p_clarice,  10000, 10000, d_ato, a_doacao,      1, null, null, null, t0 + interval '4 second'),
    (m_doacao_onus, c_cliente, c_pj, 'doacao',  p_aparecida, p_bruno,    15000, 15000, d_ato, a_doacao_onus, 1, 7500, 7500, d_ato, t0 + interval '5 second'),
    (m_reducao,     c_cliente, c_pj, 'reducao', p_aparecida, null,        5000,  5000, d_ato, a_reducao,     1, null, null, null, t0 + interval '6 second');

  -- 8. O ONUS. O da doacao pende do MOVIMENTO (a reserva nasce com a quota que
  --    muda de mao); o da instituicao pende so do ATO, porque nenhuma quota se
  --    move -- e e esse vinculo que o poe no card de atos e ao alcance do
  --    "Desfazer" (ver useInstituicaoDeUsufruto.ts).
  insert into public.onus_quotas (
    id, cliente_id, empresa_pessoa_id, ato_id, movimento_id,
    nu_proprietario_pessoa_id, usufrutuario_pessoa_ids, usufruto_origem,
    usufruto_com_voto, quotas, gravames
  ) values
    (o_reserva, c_cliente, c_pj, a_doacao_onus, m_doacao_onus,
     p_bruno, array[p_aparecida], 'reserva', true, 15000,
     array['inalienabilidade','impenhorabilidade','incomunicabilidade']),
    (o_instituicao, c_cliente, c_pj, a_instituicao, null,
     p_clarice, array[p_aparecida], 'instituicao', true, 12000,
     array[]::text[]);


  -- 9. A IDENTIDADE DAS PESSOAS NO SNAPSHOT REGISTRADO.
  --
  --    Os dois documentos deste cenario foram semeados a mao em 25/08/2026, e os
  --    itens de `socios`, `integralizacoes`, `administradores` e `signatarios`
  --    ficaram sem as chaves reservadas de proveniencia (`__motorOrigemTipo` e
  --    `__motorOrigemId`, ver src/lib/templates/origem.ts). Sem elas o baseline
  --    da peca nao tem id estavel e cai no casamento por CPF -- que falha
  --    exatamente no caso da RETIRADA: o CPF do lado vivo sai de
  --    `cpfCnpjPorPessoaId`, montado a partir do quadro de HOJE, e quem saiu nao
  --    esta nele. Resultado: "Houve entrada ou retirada de socio" chega sem
  --    evidencia, e o assistente ainda lista uma duzia de pendencias de
  --    "sem id estavel".
  --
  --    Peca registrada de verdade NAO se reescreve -- e por isso que a trigger
  --    existe. Aqui a peca e semente: completar a identidade que o app de hoje
  --    gravaria sozinho e o que faz o cenario representar o comportamento real,
  --    em vez do artefato do seed. O casamento e por CPF/CNPJ dentro do proprio
  --    cliente, e so escreve onde ainda nao ha chave.
  for v_doc in
    select id from public.documento_gerado
     where cliente_id = c_cliente and status = 'registrado'
  loop
    for v_par in
      select * from (values ('socios', 'socio'), ('integralizacoes', 'socio'),
                            ('administradores', 'administrador'),
                            ('signatarios', 'signatario')) as t(lista, chave)
    loop
      select jsonb_agg(
               case
                 when p.id is null or e.item->v_par.chave ? '__motorOrigemId' then e.item
                 else e.item || jsonb_build_object(
                        v_par.chave,
                        (e.item->v_par.chave) || jsonb_build_object(
                          '__motorOrigemTipo', 'pessoa',
                          '__motorOrigemId', p.id::text))
               end order by e.ord)
        into v_itens
        from public.documento_gerado d
        cross join lateral jsonb_array_elements(
               d.snapshot_dados->'itensPorLista'->v_par.lista) with ordinality as e(item, ord)
        left join public.pessoa p
               on p.cliente_id = c_cliente
              and regexp_replace(coalesce(p.cpf_cnpj, ''), '\\D', '', 'g') =
                  nullif(regexp_replace(coalesce(e.item->v_par.chave->>'cpfCnpj', ''), '\\D', '', 'g'), '')
       where d.id = v_doc.id;

      if v_itens is not null then
        update public.documento_gerado
           set snapshot_dados = jsonb_set(snapshot_dados,
                                          array['itensPorLista', v_par.lista], v_itens)
         where id = v_doc.id;
      end if;
    end loop;
  end loop;


  -- 10. O FECHO DAS PECAS REGISTRADAS.
  --
  --     Os dois documentos semeados nao tem `contextoRender` (foram gravados
  --     antes de ele existir), entao a folha reproduz a versao REMONTANDO o texto
  --     a partir de `snapshot_dados` -- e ai cobra todo placeholder livre do
  --     modelo. Com `valoresLivres` vazio, abrir a tela Gerar neste cliente
  --     mostrava "Algo impediu a geracao do documento. Valor ausente:
  --     dataAssinatura", um cartao de erro no lugar da peca base. O botao
  --     "Gerar alteracao contratual" funcionava assim mesmo, mas o cartao
  --     vermelho e a primeira coisa que aparece.
  --
  --     Sao dez placeholders, todos do fecho (data, duas testemunhas, advogado).
  --     Preenche so o que falta: valor ja gravado permanece.
  update public.documento_gerado
     set snapshot_dados = jsonb_set(snapshot_dados, '{valoresLivres}',
           jsonb_build_object(
             'dataAssinatura', '11/03/2019',
             'testemunha1Nome', 'Heloísa Prado Tavares',
             'testemunha1Cpf', '182.640.379-03',
             'testemunha1Rg', '8.114.203-7 SESP/PR',
             'testemunha2Nome', 'Otávio Ribas Mendonça',
             'testemunha2Cpf', '743.905.128-40',
             'testemunha2Rg', '6.902.557-1 SESP/PR',
             'advogadoNome', 'Marina Duarte Bittencourt',
             'advogadoOabNumero', '58.120',
             'advogadoOabUf', 'PR')
           || coalesce(snapshot_dados->'valoresLivres', '{}'::jsonb))
   where id = d_constitutivo;

  update public.documento_gerado
     set snapshot_dados = jsonb_set(snapshot_dados, '{valoresLivres}',
           jsonb_build_object(
             'dataAssinatura', '25/08/2026',
             'testemunha1Nome', 'Heloísa Prado Tavares',
             'testemunha1Cpf', '182.640.379-03',
             'testemunha1Rg', '8.114.203-7 SESP/PR',
             'testemunha2Nome', 'Otávio Ribas Mendonça',
             'testemunha2Cpf', '743.905.128-40',
             'testemunha2Rg', '6.902.557-1 SESP/PR',
             'advogadoNome', 'Marina Duarte Bittencourt',
             'advogadoOabNumero', '58.120',
             'advogadoOabUf', 'PR')
           || coalesce(snapshot_dados->'valoresLivres', '{}'::jsonb))
   where id = d_base;

  alter table public.movimentacao_quotas enable trigger trg_movimento_registro_confere;
  alter table public.documento_gerado enable trigger trg_documento_registro_atomico;

  raise notice 'Cenario montado: 6 atos, 6 lancamentos pendentes, 2 onus vigentes.';
end
$fixture$;

-- CONFERENCIA: o quadro resultante e o que sobrou pendente.
select p.denominacao as socio, q.quotas, q.vlr_total
  from public.v_quadro_societario q
  join public.pessoa p on p.id = q.pessoa_id
 where q.empresa_pessoa_id = 'ace00000-0000-4000-8000-000000000010'
 order by q.ordem;
