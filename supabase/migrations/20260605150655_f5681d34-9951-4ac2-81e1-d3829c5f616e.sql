-- Seed Barralcool (dev) — partes que precisam de UPDATE/temp table.
-- Inserts iniciais (pessoa PJ + PF) já rodaram via psql; ON CONFLICT garante idempotência.

-- 3) Cônjuges (FKs cruzadas)
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000006'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000004';
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000004'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000006';
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000007'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000005';
UPDATE public.pessoa SET conjuge_id = 'ba44a1c0-0000-4000-a000-000000000005'
  WHERE id = 'ba44a1c0-0000-4000-a000-000000000007';

-- 4) Parentesco (fundadores irmãos)
INSERT INTO public.parentesco (id, pessoa_id, parente_pessoa_id, tipo, natureza) VALUES
  ('ba44a1c0-0002-4000-a000-000000000001',
   'ba44a1c0-0000-4000-a000-000000000004',
   'ba44a1c0-0000-4000-a000-000000000005',
   'Irmão(ã)', 'Consanguíneo')
ON CONFLICT (id) DO NOTHING;

-- 5) Administração Bom Pastor
INSERT INTO public.administracao (id, pj_pessoa_id, administrador_pessoa_id, cargo, pode_isoladamente) VALUES
  ('ba44a1c0-0004-4000-a000-000000000001',
   'ba44a1c0-0000-4000-a000-000000000003',
   'ba44a1c0-0000-4000-a000-00000000002e',
   'Sócio-Administrador', false),
  ('ba44a1c0-0004-4000-a000-000000000002',
   'ba44a1c0-0000-4000-a000-000000000003',
   'ba44a1c0-0000-4000-a000-00000000001a',
   'Sócio-Administrador', false)
ON CONFLICT (id) DO NOTHING;

-- 6) Quadro societário + capital (Cláusula Quinta) — R$ 185.757 (1 quota = R$ 1,00)
CREATE TEMP TABLE seed_quotas (
  socio_pessoa_id uuid,
  quotas integer,
  vlr numeric,
  pct numeric
) ON COMMIT DROP;

INSERT INTO seed_quotas (socio_pessoa_id, quotas, vlr, pct) VALUES
  ('ba44a1c0-0000-4000-a000-000000000003', 44395, 44395.00, 23.900),
  ('ba44a1c0-0000-4000-a000-000000000008', 15901, 15901.00,  8.560),
  ('ba44a1c0-0000-4000-a000-000000000004', 11826, 11826.00,  6.366),
  ('ba44a1c0-0000-4000-a000-000000000005', 11826, 11826.00,  6.366),
  ('ba44a1c0-0000-4000-a000-000000000009', 11130, 11130.00,  5.992),
  ('ba44a1c0-0000-4000-a000-00000000000a', 10572, 10572.00,  5.692),
  ('ba44a1c0-0000-4000-a000-00000000000b', 10497, 10497.00,  5.651),
  ('ba44a1c0-0000-4000-a000-00000000000c', 10497, 10497.00,  5.651),
  ('ba44a1c0-0000-4000-a000-00000000000d',  9063,  9063.00,  4.879),
  ('ba44a1c0-0000-4000-a000-00000000000e',  8328,  8328.00,  4.483),
  ('ba44a1c0-0000-4000-a000-00000000000f',  6702,  6702.00,  3.608),
  ('ba44a1c0-0000-4000-a000-000000000010',  4666,  4666.00,  2.512),
  ('ba44a1c0-0000-4000-a000-000000000011',  4666,  4666.00,  2.512),
  ('ba44a1c0-0000-4000-a000-000000000012',  3398,  3398.00,  1.829),
  ('ba44a1c0-0000-4000-a000-000000000013',  2568,  2568.00,  1.382),
  ('ba44a1c0-0000-4000-a000-000000000015',  2001,  2001.00,  1.077),
  ('ba44a1c0-0000-4000-a000-000000000016',  1749,  1749.00,  0.942),
  ('ba44a1c0-0000-4000-a000-000000000017',  1749,  1749.00,  0.942),
  ('ba44a1c0-0000-4000-a000-000000000018',  1661,  1661.00,  0.894),
  ('ba44a1c0-0000-4000-a000-000000000019',  1390,  1390.00,  0.748),
  ('ba44a1c0-0000-4000-a000-00000000001a',  1389,  1389.00,  0.748),
  ('ba44a1c0-0000-4000-a000-00000000001b',  1189,  1189.00,  0.640),
  ('ba44a1c0-0000-4000-a000-00000000001c',  1057,  1057.00,  0.569),
  ('ba44a1c0-0000-4000-a000-00000000001d',  1001,  1001.00,  0.539),
  ('ba44a1c0-0000-4000-a000-00000000001e',  1001,  1001.00,  0.539),
  ('ba44a1c0-0000-4000-a000-00000000001f',   906,   906.00,  0.488),
  ('ba44a1c0-0000-4000-a000-000000000020',   906,   906.00,  0.488),
  ('ba44a1c0-0000-4000-a000-000000000021',   604,   604.00,  0.325),
  ('ba44a1c0-0000-4000-a000-000000000022',   477,   477.00,  0.257),
  ('ba44a1c0-0000-4000-a000-000000000023',   310,   310.00,  0.167),
  ('ba44a1c0-0000-4000-a000-000000000024',   310,   310.00,  0.167),
  ('ba44a1c0-0000-4000-a000-000000000025',   310,   310.00,  0.167),
  ('ba44a1c0-0000-4000-a000-000000000026',   310,   310.00,  0.167),
  ('ba44a1c0-0000-4000-a000-000000000027',   239,   239.00,  0.128),
  ('ba44a1c0-0000-4000-a000-000000000028',   227,   227.00,  0.122),
  ('ba44a1c0-0000-4000-a000-000000000029',   227,   227.00,  0.122),
  ('ba44a1c0-0000-4000-a000-00000000002a',   227,   227.00,  0.122),
  ('ba44a1c0-0000-4000-a000-00000000002b',   130,   130.00,  0.070),
  ('ba44a1c0-0000-4000-a000-00000000002c',   114,   114.00,  0.061),
  ('ba44a1c0-0000-4000-a000-00000000002d',   114,   114.00,  0.061),
  ('ba44a1c0-0000-4000-a000-00000000002e',    62,    62.00,  0.034),
  ('ba44a1c0-0000-4000-a000-00000000002f',    62,    62.00,  0.034);

INSERT INTO public.quadro_societario (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total, percentual)
SELECT 'ba44a1c0-0000-4000-a000-000000000001', sq.socio_pessoa_id, sq.quotas, sq.vlr, sq.pct
FROM seed_quotas sq
WHERE NOT EXISTS (
  SELECT 1 FROM public.quadro_societario q
  WHERE q.empresa_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000001'
    AND q.socio_pessoa_id = sq.socio_pessoa_id
);

INSERT INTO public.quadro_societario (empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total, percentual)
SELECT 'ba44a1c0-0000-4000-a000-000000000002',
       'ba44a1c0-0000-4000-a000-000000000001',
       185757, 185757.00, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.quadro_societario q
  WHERE q.empresa_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000002'
    AND q.socio_pessoa_id = 'ba44a1c0-0000-4000-a000-000000000001'
);

-- 7) Bem (PS) + capital_integralizacao
INSERT INTO public.bem (
  id, cliente_id, referencia_dp, tipo_bem, denominacao,
  participa_estruturacao, status_integralizacao, empresa_destino_pessoa_id,
  vlr_contabil, observacao
) VALUES (
  'ba44a1c0-0001-4000-a000-000000000001',
  'e1c0df8e-5206-45e1-af4b-de3e5aacc48c',
  'PS-BARR-01', 'PS', 'Quotas da Barralcool Agrícola Ltda (CNPJ 15.009.061/0001-97)',
  true, 'Integralizado', 'ba44a1c0-0000-4000-a000-000000000001',
  185757.00,
  'Quotas integralizadas ao capital social da Barralcool Empreendimentos Ltda. — valor nominal de R$ 1,00 cada (contrato social, Cláusula Quinta, Parágrafo Segundo).'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.capital_integralizacao (
  cliente_id, bem_id, empresa_destino_pessoa_id, socio_pessoa_id,
  vlr_contabil, vlr_capital_arredondado, pct_capital
)
SELECT 'e1c0df8e-5206-45e1-af4b-de3e5aacc48c',
       'ba44a1c0-0001-4000-a000-000000000001',
       'ba44a1c0-0000-4000-a000-000000000001',
       sq.socio_pessoa_id, sq.vlr, sq.vlr, sq.pct
FROM seed_quotas sq
WHERE NOT EXISTS (
  SELECT 1 FROM public.capital_integralizacao ci
  WHERE ci.bem_id = 'ba44a1c0-0001-4000-a000-000000000001'
    AND ci.socio_pessoa_id = sq.socio_pessoa_id
);