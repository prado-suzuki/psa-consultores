-- Catálogo de documentos alinhado aos 8 produtos OSG: rótulo dos pares rural×urbano,
-- os vínculos que faltavam, o conjunto da Reorganização e o do pacote completo.
--
-- CONTEXTO
-- A lista de produtos foi refeita no front em 03/08/2026, seguindo o diagrama de produtos
-- validado com o Fernando: as 5 modalidades de reorganização viraram UM produto
-- (`RS`, a modalidade passou a ser condição interna), `DSS` virou `DSSG` com governança no
-- nome, e nasceu o pacote completo `RSSG`. Ficaram 8 produtos OSG.
--
-- Isso deixou três buracos:
--   1. `RSSG` nasceu com ZERO documentos.
--   2. `RS` ficou só com os 16 documentos que a modalidade Transformação tinha. Os outros
--      4 produtos foram apagados e levaram em cascata 77 vínculos, entre eles os 8
--      documentos que só existiam em aquisição, cisão, fusão e incorporação. Como agora a
--      modalidade é condição dentro de um produto só, o produto precisa carregar os
--      documentos de todas as modalidades — senão um cliente em aquisição nunca é
--      solicitado a entregar o contrato de compra e venda de participação.
--   3. Os 15 documentos que a ALE-26 criou ou deixou órfãos continuam sem produto. A
--      gerar_solicitacao_os só pede o que está ligado a um produto contratado, então
--      documento sem vínculo é documento que nunca chega ao cliente.
--
-- Estado de partida conferido no banco em 03/08/2026, por consulta direta:
--   documento_tipo 67 linhas (todas ativas) · produto_documento_tipo 180 vínculos
--   3 nomes repetidos · 15 documentos órfãos
--   RSSG 0 · RS 16 · MC 16 · CFI 21 · GOV 21 · PS 26 · DSSG 33 · ES 47  (= 180)
--
-- MÉTODO
-- Onde a regra é "os mesmos produtos de outro documento", o vínculo é DERIVADO por SQL a
-- partir desse outro documento, não escrito à mão. Assim a migration continua correta se a
-- lista de produtos mudar de novo — foi exatamente uma lista fixa de 11 produtos que
-- invalidou a versão anterior deste arquivo.
--
-- `obrigatorio` = true em tudo: a coluna é legada. Na prática todo documento ligado a um
-- produto CONTRATADO é obrigatório, e o que varia por cliente é o conjunto de produtos da
-- OS, não esta coluna.
--
-- Idempotente: UPDATE casa por `codigo` e só grava se difere; todo INSERT tem
-- ON CONFLICT (produto_segmento_id, item_padrao_id) DO NOTHING.

BEGIN;

-- ── Passo 0 · trava de entrada ───────────────────────────────────────────────
do $$
declare v_docs int; v_vinc int; v_prods int; v_rssg int;
begin
  select count(*) into v_docs from public.documento_tipo;
  select count(*) into v_vinc from public.produto_documento_tipo;
  select count(*) into v_prods from public.produto_segmento
   where codigo in ('RSSG','DSSG','ES','PS','GOV','RS','MC','CFI');
  select count(*) into v_rssg from public.produto_documento_tipo p
    join public.produto_segmento ps on ps.id = p.produto_segmento_id where ps.codigo = 'RSSG';

  if v_prods <> 8 then
    raise exception 'Abortada: esperava os 8 produtos OSG (RSSG DSSG ES PS GOV RS MC CFI), encontrei %. Confira os codigos no front.', v_prods;
  end if;
  if v_docs <> 67 then
    raise exception 'Abortada: esperava 67 documentos, encontrei %.', v_docs;
  end if;
  if v_rssg > 0 then
    raise notice 'RSSG já tem % vínculos. O INSERT é idempotente e completa o que falta.', v_rssg;
  end if;
  raise notice 'entrada ok: % documentos, % vínculos, 8 produtos.', v_docs, v_vinc;
end $$;

-- ── Passo 1 · diferenciar o rótulo dos 3 pares rural × urbano ────────────────
-- Cada um dos 3 vale para imóvel rural e para urbano, e por isso ocupa duas linhas — uma
-- por tipo de sujeito, porque `granularidade` é monovalorada e a gerar_solicitacao_os monta
-- os alvos por ela. As duas linhas PARTICIONAM (um imóvel é rural ou urbano, nunca os dois),
-- não duplicam pedido.
--
-- O problema é só de rótulo: com nome igual, a lista por grupo da área do cliente mostra
-- duas linhas idênticas, e a `nota` — que é o texto que o cliente lê — teria que servir para
-- os dois casos, sendo que ela já é específica de cada um:
--   rural:  'Certidão de Inteiro Teor atualizada dos imóveis rurais, ...'
--   urbano: 'Certidão de Inteiro Teor atualizada dos imóveis urbanos, ...'
--
-- Só `documento` muda. `codigo` já carrega rural/urbano, `nota` já está certa em cada linha,
-- e nenhuma linha é apagada — a matrícula rural tem 8 itens reais de cliente apontando
-- para ela, e a FK de checklist_cliente_item é ON DELETE SET NULL.
update public.documento_tipo d
   set documento = v.novo
  from (values
    ('matricula-imovel-rural--matricula-do-imovel-inteiro-teor',
     'Matrícula do imóvel (inteiro teor) — rural'),
    ('matricula-imovel-urbano--matricula-do-imovel-inteiro-teor',
     'Matrícula do imóvel (inteiro teor) — urbano'),
    ('matricula-imovel-rural--contrato-particular-de-compra-e-venda-ccv',
     'Contrato particular de compra e venda (CCV) — rural'),
    ('matricula-imovel-urbano--contrato-particular-de-compra-e-venda-ccv',
     'Contrato particular de compra e venda (CCV) — urbano'),
    ('matricula-imovel-rural--escritura-publica-de-compra-e-venda',
     'Escritura pública de compra e venda — rural'),
    ('matricula-imovel-urbano--escritura-publica-de-compra-e-venda',
     'Escritura pública de compra e venda — urbano')
  ) as v(codigo, novo)
 where d.codigo = v.codigo
   and d.documento is distinct from v.novo;

-- ── Passo 2 · ALE-27 · o lado rural espelha o urbano ─────────────────────────
-- A planilha validada previa cada um dos 3 nos mesmos produtos do gêmeo urbano. A carga
-- original resolveu o par colapsado para o lado urbano e o rural ficou órfão — a contagem
-- por produto batia (o dedup preserva o total), só a identidade estava errada. Efeito: a
-- matrícula de inteiro teor de imóvel RURAL nunca era pedida, e a maioria dos clientes é
-- rural.
--
-- Derivado do gêmeo urbano, não de lista fixa de produtos.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select p.produto_segmento_id, rural.id, true
  from (values
    ('matricula-imovel-urbano--matricula-do-imovel-inteiro-teor',
     'matricula-imovel-rural--matricula-do-imovel-inteiro-teor'),
    ('matricula-imovel-urbano--contrato-particular-de-compra-e-venda-ccv',
     'matricula-imovel-rural--contrato-particular-de-compra-e-venda-ccv'),
    ('matricula-imovel-urbano--escritura-publica-de-compra-e-venda',
     'matricula-imovel-rural--escritura-publica-de-compra-e-venda')
  ) as par(cod_urbano, cod_rural)
  join public.documento_tipo urbano on urbano.codigo = par.cod_urbano
  join public.documento_tipo rural  on rural.codigo  = par.cod_rural
  join public.produto_documento_tipo p on p.item_padrao_id = urbano.id
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 3 · cooperativa e governança → Governança ──────────────────────────
-- Bloco GOVERNANÇA do diagrama de grupos, mais a decisão de manter os documentos de
-- cooperativa dentro do produto Governança: assim eles não são pedidos a todo cliente que
-- tem PJ, só a quem contratou governança.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select ps.id, dt.id, true
  from (values
    ('pessoa-juridica--estatuto-social-cooperativa'),
    ('pessoa-juridica--atas-de-assembleias-cooperativa'),
    ('pessoa-juridica--editais-de-convocacao-cooperativa'),
    ('pessoa-juridica--regimentos-politicas-e-regulamentos-cooperativa'),
    ('pessoa-juridica--controle-de-sobras-e-perdas-e-sua-destinacao-coo'),
    ('pessoa-juridica--diagnostico-de-outras-consultorias')
  ) as v(doc)
  join public.documento_tipo dt on dt.codigo = v.doc
  cross join public.produto_segmento ps
 where ps.codigo = 'GOV'
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 4 · Planejamento Tributário Rural → DSSG · ES · PS ─────────────────
-- Bloco PLANEJAMENTO TRIBUTÁRIO RURAL do diagrama de grupos (nós TAX10, TAX12, TAX15 e
-- TAX17). O Planejamento Tributário Rural é ETAPA dentro do Diagnóstico Societário,
-- Sucessório e Governança, da Estruturação Societária e do Planejamento Sucessório — não é
-- produto próprio, então os documentos entram nesses três.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select ps.id, dt.id, true
  from (values
    ('matricula-imovel-rural--inscricao-estadual-sefaz'),
    ('pessoa-juridica--inscricao-municipal-e-alvara'),
    ('cliente--nf-dos-bens-moveis-e-veiculos-transferidos'),
    ('matricula-imovel-rural--nf-de-insumos-e-servicos-de-preparo-do-solo'),
    ('pessoa-fisica--dirpf-do-ano-da-operacao')
  ) as v(doc)
  join public.documento_tipo dt on dt.codigo = v.doc
  cross join public.produto_segmento ps
 where ps.codigo in ('DSSG', 'ES', 'PS')
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 5 · Planilha dos bens imóveis, nos mesmos produtos da irmã ─────────
-- Ela sai da mesma carta de solicitação preliminar de Diagnósticos e da mesma pasta de
-- Modelos que a `Relação de áreas exploradas por imóvel`: uma diz quem EXPLORA cada área,
-- a outra quem é DONO de cada imóvel. Por isso recebe os mesmos produtos da irmã, derivados
-- dela e não de lista fixa.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select p.produto_segmento_id, nova.id, true
  from public.documento_tipo irma
  join public.produto_documento_tipo p on p.item_padrao_id = irma.id
  cross join public.documento_tipo nova
 where irma.codigo = 'bem--relacao-de-areas-exploradas-por-imovel'
   and nova.codigo = 'cliente--planilha-dos-bens-imoveis-do-grupo'
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 6 · devolver à Reorganização os documentos das outras modalidades ──
-- Ao colapsar as 5 modalidades num produto só, sobraram apenas os 16 documentos da
-- Transformação. Estes 8 existiam em cisão, incorporação, fusão ou aquisição e foram
-- embora com os produtos apagados. Com a modalidade virando condição interna, o produto
-- tem de carregar os documentos de todas elas.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select ps.id, dt.id, true
  from (values
    ('pessoa-juridica--livros-societarios'),                         -- cisão, incorporação, fusão, aquisição
    ('bem--laudo-de-avaliacao-de-valor-de-mercado'),                 -- cisão, incorporação, fusão
    ('pessoa-juridica--instrumento-de-cessao-de-quotas-acoes'),      -- aquisição
    ('pessoa-juridica--contrato-de-compra-e-venda-de-quotas-acoes'), -- aquisição
    ('pessoa-juridica--informacao-de-percentual-de-participacao-do-grup'), -- aquisição
    ('pessoa-juridica--laudo-simulacao-de-valor-das-quotas'),        -- aquisição
    ('pessoa-juridica--protocolo-acordo-societario-ou-familiar'),    -- aquisição
    ('pessoa-juridica--matriz-de-alcadas-existente')                 -- aquisição
  ) as v(doc)
  join public.documento_tipo dt on dt.codigo = v.doc
  cross join public.produto_segmento ps
 where ps.codigo = 'RS'
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 7 · o pacote completo recebe a união dos produtos que ele executa ──
-- As etapas do RSSG são, literalmente: elaboração do diagnóstico societário, sucessório e
-- de governança; execução da estruturação societária; execução da reorganização societária
-- (se necessária); execução do planejamento sucessório; execução da governança. Ou seja,
-- ele faz o trabalho dos cinco. O conjunto de documentos dele é a UNIÃO dos cinco —
-- derivada, não autorada.
--
-- Roda depois dos passos 2 a 6 de propósito: assim a união já inclui tudo que acabou de
-- entrar nos produtos-membros.
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select alvo.id, x.item_padrao_id, true
  from (select distinct p.item_padrao_id
          from public.produto_documento_tipo p
          join public.produto_segmento ps on ps.id = p.produto_segmento_id
         where ps.codigo in ('DSSG', 'ES', 'PS', 'GOV', 'RS')) x
  cross join public.produto_segmento alvo
 where alvo.codigo = 'RSSG'
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 8 · travas de saída ────────────────────────────────────────────────
-- A garantia central: nenhum documento ativo pode ficar sem produto. Documento órfão é
-- documento que a gerar_solicitacao_os nunca vai pedir — foi exatamente esse o bug da
-- matrícula rural, que passou meses sem ser notado porque o total por produto fechava.
do $$
declare v_orf int; v_quais text; v_dup int; v_vinc int;
        v_rs int; v_rssg int; v_uniao int;
begin
  select count(*), coalesce(string_agg(codigo, ', ' order by codigo), '') into v_orf, v_quais
    from public.documento_tipo d
   where d.ativo
     and not exists (select 1 from public.produto_documento_tipo p where p.item_padrao_id = d.id);
  if v_orf > 0 then
    raise exception 'Abortada: % documento(s) ativo(s) sem produto -> %', v_orf, v_quais;
  end if;

  select count(*) into v_dup from (select documento from public.documento_tipo
     where ativo group by documento having count(*) > 1) t;
  if v_dup > 0 then
    raise exception 'Abortada: % nome repetido no catálogo ativo.', v_dup;
  end if;

  select count(*) into v_rs from public.produto_documento_tipo p
    join public.produto_segmento ps on ps.id = p.produto_segmento_id where ps.codigo = 'RS';
  if v_rs < 24 then
    raise exception 'Abortada: Reorganização Societária ficou com % documentos, esperava ao menos 24 (a união das 5 modalidades).', v_rs;
  end if;

  select count(*) into v_rssg from public.produto_documento_tipo p
    join public.produto_segmento ps on ps.id = p.produto_segmento_id where ps.codigo = 'RSSG';
  select count(distinct p.item_padrao_id) into v_uniao from public.produto_documento_tipo p
    join public.produto_segmento ps on ps.id = p.produto_segmento_id
   where ps.codigo in ('DSSG','ES','PS','GOV','RS');
  if v_rssg <> v_uniao then
    raise exception 'Abortada: pacote completo com % documentos, mas a união dos produtos que ele executa tem %.', v_rssg, v_uniao;
  end if;

  select count(*) into v_vinc from public.produto_documento_tipo;
  raise notice 'ok: % vínculos · 0 órfãos · 0 nomes repetidos · RS % · RSSG % (= união).', v_vinc, v_rs, v_rssg;
end $$;

COMMIT;

-- ── Conferência depois de rodar ─────────────────────────────────────────────
-- select ps.codigo, ps.nome, count(*) from public.produto_documento_tipo p
--   join public.produto_segmento ps on ps.id = p.produto_segmento_id
--  group by 1,2 order by 3 desc;
--
-- select count(*) from public.documento_tipo d where d.ativo and not exists
--   (select 1 from public.produto_documento_tipo p where p.item_padrao_id = d.id);   -- 0
