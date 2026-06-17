BEGIN;

INSERT INTO public.gargalo_etapas (id, gargalo_id, etapa_id, scenario, created_at)
SELECT mapa_uuid('gar-etp-' || m.suffix), m.gargalo_id, m.etapa_id, 'AS-IS', NOW()
FROM (VALUES
  ('dp-rev-p1-01-08', mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('etp-osg-p1-01-08')),
  ('dp-rev-p1-02-02', mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('etp-osg-p1-02-02')),
  ('leit-p1-01-03',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-01-03')),
  ('leit-p1-03-01',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-03-01')),
  ('leit-p1-03-02',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-03-02')),
  ('devc-p6-01-02',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p6-01-02')),
  ('devc-p6-01-03',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p6-01-03')),
  ('devc-p1-01-01',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p1-01-01')),
  ('mdes-p1-01-07',   mapa_uuid('gar-osg-matricula-desatualizada'),  mapa_uuid('etp-osg-p1-01-07')),
  ('bndr-p1-01-02',   mapa_uuid('gar-osg-bens-nao-declarados-ir'),   mapa_uuid('etp-osg-p1-01-02')),
  ('bndr-p1-01-06',   mapa_uuid('gar-osg-bens-nao-declarados-ir'),   mapa_uuid('etp-osg-p1-01-06')),
  ('disp-p1-01-01',   mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('etp-osg-p1-01-01')),
  ('disp-p6-01-02',   mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('etp-osg-p6-01-02')),
  ('casc-p1-02-04',   mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('etp-osg-p1-02-04')),
  ('casc-p1-02-05',   mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('etp-osg-p1-02-05')),
  ('trev-p2-01-03',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-01-03')),
  ('trev-p2-01-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-01-04')),
  ('trev-p2-02-03',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-02-03')),
  ('trev-p2-02-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-02-04')),
  ('trev-p2-04-03',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-04-03')),
  ('trev-p2-04-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-04-04')),
  ('trev-p2-05-03',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-05-03')),
  ('trev-p2-05-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p2-05-04')),
  ('trev-p3-03-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p3-03-04')),
  ('trev-p3-03-05',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p3-03-05')),
  ('trev-p4-03-06',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p4-03-06')),
  ('trev-p4-03-07',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p4-03-07')),
  ('trev-p5-02-04',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p5-02-04')),
  ('trev-p5-02-05',   mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('etp-osg-p5-02-05')),
  ('elim-p1-03-03',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p1-03-03')),
  ('elim-p2-04-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p2-04-02')),
  ('elim-p2-08-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p2-08-02')),
  ('elim-p3-03-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p3-03-02')),
  ('nrab-p2-04-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-04-02')),
  ('nrab-p2-05-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-05-02')),
  ('nrab-p2-06-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-06-02')),
  ('nrab-p3-03-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p3-03-02')),
  ('soma-p1-04-03',   mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('etp-osg-p1-04-03')),
  ('soma-p2-01-02',   mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('etp-osg-p2-01-02')),
  ('asgb-p3-03-06',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p3-03-06')),
  ('asgb-p3-04-04',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p3-04-04')),
  ('asgb-p4-03-08',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p4-03-08')),
  ('asgb-p5-02-07',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p5-02-07')),
  ('junt-p2-01-06',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-01-06')),
  ('junt-p2-02-06',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-02-06')),
  ('junt-p2-04-05',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-04-05')),
  ('junt-p2-05-05',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-05-05')),
  ('itbi-p2-04-06',   mapa_uuid('gar-osg-atualizacao-cartorial-itbi'),mapa_uuid('etp-osg-p2-04-06')),
  ('s2mo-p2-06-01',   mapa_uuid('gar-osg-projeto-suspenso-2momento'),mapa_uuid('etp-osg-p2-06-01')),
  ('fisc-p3-01-03',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p3-01-03')),
  ('fisc-p4-01-02',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-02')),
  ('fisc-p4-01-03',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-03')),
  ('fisc-p4-01-04',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-04')),
  ('pgcf-p3-01-02',   mapa_uuid('gar-osg-planilha-cliente-fiscal'),  mapa_uuid('etp-osg-p3-01-02')),
  ('arxm-p3-03-01',   mapa_uuid('gar-osg-area-explorada-vs-matricula'),mapa_uuid('etp-osg-p3-03-01')),
  ('rfac-p3-03-03',   mapa_uuid('gar-osg-parceria-fachada-rfb'),     mapa_uuid('etp-osg-p3-03-03')),
  ('decd-p4-02-03',   mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('etp-osg-p4-02-03')),
  ('decd-p4-03-04',   mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('etp-osg-p4-03-04')),
  ('itcm-p4-03-04',   mapa_uuid('gar-osg-itcmd-travamento-judicial'),mapa_uuid('etp-osg-p4-03-04')),
  ('clau-p4-03-03',   mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('etp-osg-p4-03-03')),
  ('clau-p5-02-06',   mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('etp-osg-p5-02-06')),
  ('aqdc-p5-02-07',   mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('etp-osg-p5-02-07')),
  ('aqdc-p4-03-08',   mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('etp-osg-p4-03-08'))
) AS m(suffix, gargalo_id, etapa_id)
ON CONFLICT (gargalo_id, etapa_id, scenario) DO NOTHING;

DO $validate$
DECLARE
  v_inserted    integer;
  v_gargalos    integer;
  v_orphan_etp  integer;
BEGIN
  SELECT count(*) INTO v_inserted
  FROM public.gargalo_etapas ge
  WHERE ge.gargalo_id IN (
    SELECT id FROM public.gargalos WHERE cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
  );

  SELECT count(DISTINCT gargalo_id) INTO v_gargalos
  FROM public.gargalo_etapas ge
  WHERE ge.gargalo_id IN (
    SELECT id FROM public.gargalos WHERE cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'
  );

  SELECT count(*) INTO v_orphan_etp
  FROM public.gargalo_etapas ge
  WHERE NOT EXISTS (
    SELECT 1 FROM public.process_stages ps
    WHERE ps.id = ge.etapa_id AND ps.scenario = ge.scenario
  );

  RAISE NOTICE 'gargalo_etapas OSG: % linhas em % gargalos distintos', v_inserted, v_gargalos;

  IF v_orphan_etp > 0 THEN
    RAISE EXCEPTION 'Encontradas % linhas em gargalo_etapas apontando para etapa inexistente — abortando.', v_orphan_etp;
  END IF;
END
$validate$;

COMMIT;