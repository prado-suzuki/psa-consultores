-- Planejamento Tributário Rural: todos os documentos da etapa nos três produtos.
--
-- REGRA
-- O Planejamento Tributário Rural é ETAPA, não produto, e entra em três produtos:
-- Diagnóstico Societário, Sucessório e Governança (DSSG), Estruturação Societária (ES) e
-- Planejamento Sucessório (PS). Logo, todo documento da etapa tem de estar nos três.
--
-- POR QUE FALTAVA
-- A migration 20260803235000 aplicou essa regra apenas aos 5 documentos que a ALE-26 criou.
-- Os que já estavam no catálogo mantiveram o vínculo da carga original, que vinha do diagrama
-- `Documentos_por_Produto_OSG` — e esse diagrama foi gerado A PARTIR do catálogo como ele
-- estava, ou seja, reproduz a carga antiga e não uma validação da etapa tributária. Resultado:
-- a mesma etapa ficou com os documentos em conjuntos diferentes de produto.
--
--   os 5 novos                          -> DSSG · ES · PS   (regra aplicada)
--   Livro-caixa do Produtor Rural       -> só ES
--   Projeção de investimentos           -> só ES
--   Relatório de bens da atividade rural-> só ES
--   Relatório de dívidas                -> só ES
--   Planilha de resultado projetado     -> CFI · ES
--   Planilha de Diagnóstico Tributário  -> CFI · DSSG · ES
--   Contrato de exploração rural        -> CFI · DSSG · ES
--
-- Nenhum dos antigos estava no Planejamento Sucessório, e quatro não estavam no Diagnóstico.
--
-- Estado de partida conferido no banco em 04/08/2026: 67 documentos · 293 vínculos.
--
-- O QUE MUDA
-- 12 vínculos novos. O `CFI` fica como está — a Constituição de Fundos precisa mesmo das
-- projeções. O pacote completo `RSSG` já tem os 67 documentos do catálogo, então não é afetado.
--
-- O `Contrato de exploração rural pré-existente` entra no Planejamento Sucessório por decisão
-- do Alexandre em 04/08/2026: ele não é documento de planejamento tributário, mas o produto tem
-- a etapa "Aditivos em composses e parcerias rurais — se atividade rural", que precisa dos
-- contratos existentes.
--
-- Idempotente: tenta os 7 documentos × 3 produtos e o ON CONFLICT absorve os 9 que já existem.

BEGIN;

-- ── Passo 0 · trava de entrada ───────────────────────────────────────────────
do $$
declare v_docs int; v_vinc int; v_prods int;
begin
  select count(*) into v_docs from public.documento_tipo;
  select count(*) into v_vinc from public.produto_documento_tipo;
  select count(*) into v_prods from public.produto_segmento where codigo in ('DSSG','ES','PS');
  if v_prods <> 3 then
    raise exception 'Abortada: esperava DSSG, ES e PS, encontrei % dos três.', v_prods;
  end if;
  if v_docs <> 67 then
    raise exception 'Abortada: esperava 67 documentos, encontrei %. O catálogo mudou.', v_docs;
  end if;
  raise notice 'entrada ok: % documentos, % vínculos.', v_docs, v_vinc;
end $$;

-- ── Passo 1 · a etapa inteira nos três produtos ──────────────────────────────
insert into public.produto_documento_tipo (produto_segmento_id, item_padrao_id, obrigatorio)
select ps.id, dt.id, true
  from (values
    ('bem--livro-caixa-do-produtor-rural'),
    ('bem--projecao-de-investimentos-proximos-anos'),
    ('bem--relatorio-de-bens-da-atividade-rural-aquisicao-e'),
    ('bem--relatorio-de-dividas-da-atividade-rural'),
    ('bem--planilha-de-resultado-projetado-pf-e-pj'),
    ('bem--planilha-de-diagnostico-tributario-receitas-desp'),
    ('bem--contrato-de-exploracao-rural-pre-existente')
  ) as v(doc)
  join public.documento_tipo dt on dt.codigo = v.doc
  cross join public.produto_segmento ps
 where ps.codigo in ('DSSG', 'ES', 'PS')
on conflict (produto_segmento_id, item_padrao_id) do nothing;

-- ── Passo 2 · trava de saída ─────────────────────────────────────────────────
-- Os 12 documentos da etapa têm de estar nos três produtos, sem exceção. Se um ficar de fora,
-- a mensagem diz qual — é essa a inconsistência que a migration existe para eliminar.
do $$
declare v_falta text; v_vinc int;
begin
  select string_agg(d.documento || ' (falta em ' || f.cod || ')', ' | ' order by d.documento)
    into v_falta
    from (values
      ('bem--livro-caixa-do-produtor-rural'),
      ('bem--projecao-de-investimentos-proximos-anos'),
      ('bem--relatorio-de-bens-da-atividade-rural-aquisicao-e'),
      ('bem--relatorio-de-dividas-da-atividade-rural'),
      ('bem--planilha-de-resultado-projetado-pf-e-pj'),
      ('bem--planilha-de-diagnostico-tributario-receitas-desp'),
      ('bem--contrato-de-exploracao-rural-pre-existente'),
      ('matricula-imovel-rural--inscricao-estadual-sefaz'),
      ('pessoa-juridica--inscricao-municipal-e-alvara'),
      ('cliente--nf-dos-bens-moveis-e-veiculos-transferidos'),
      ('matricula-imovel-rural--nf-de-insumos-e-servicos-de-preparo-do-solo'),
      ('pessoa-fisica--dirpf-do-ano-da-operacao')
    ) as etapa(doc)
    join public.documento_tipo d on d.codigo = etapa.doc
    cross join (values ('DSSG'), ('ES'), ('PS')) as f(cod)
    join public.produto_segmento ps on ps.codigo = f.cod
   where not exists (select 1 from public.produto_documento_tipo p
                      where p.item_padrao_id = d.id and p.produto_segmento_id = ps.id);
  if v_falta is not null then
    raise exception 'Abortada: documento da etapa fora de um dos três produtos -> %', v_falta;
  end if;

  select count(*) into v_vinc from public.produto_documento_tipo;
  raise notice 'ok: % vínculos. Os 12 documentos do Planejamento Tributário Rural estão em DSSG, ES e PS.', v_vinc;
end $$;

COMMIT;

-- ── Conferência depois de rodar ─────────────────────────────────────────────
-- select count(*) from public.produto_documento_tipo;   -- 305
