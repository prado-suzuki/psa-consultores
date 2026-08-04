-- Catálogo de documentos alinhado aos 8 produtos OSG: rótulo dos pares rural×urbano,
-- os vínculos que faltavam, o conjunto da Reorganização e o do pacote completo.

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
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select p.produto_segmento_id, nova.id, true
  from public.documento_tipo irma
  join public.produto_documento_tipo p on p.item_padrao_id = irma.id
  cross join public.documento_tipo nova
 where irma.codigo = 'bem--relacao-de-areas-exploradas-por-imovel'
   and nova.codigo = 'cliente--planilha-dos-bens-imoveis-do-grupo'
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 6 · devolver à Reorganização os documentos das outras modalidades ──
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