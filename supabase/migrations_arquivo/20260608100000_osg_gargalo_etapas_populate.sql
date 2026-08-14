-- ============================================================================
-- 20260608100000_osg_gargalo_etapas_populate.sql
-- ----------------------------------------------------------------------------
-- Popula a M:N gargalos × process_stages (gargalo_etapas) para o cluster OSG.
--
-- Por que esta migração existe:
--   A migração 20260607100000_gargalo_etapas.sql introduziu o novo modelo em
--   que cada gargalo é ancorado à(s) etapa(s)-origem onde ele se manifesta.
--   A cascata jusante (documentos/etapas impactados) é derivada em tempo real
--   pelo hook useCascataEventos via BFS pelos docs de saída. A tabela criada
--   ficou vazia — esta migração popula com base no Estrutura_OSG_v5_completa.md.
--
-- Regras de inferência aplicadas:
--   1. Só inclui gargalos com etapa-origem CLARA na documentação. Gargalos
--      transversais/organizacionais (visibilidade, comunicação fragmentada,
--      horas desacopladas, overhead invisível, governança concentrada,
--      aprovação centralizada de modelo) continuam vinculados apenas via
--      gargalo_processos (visão macro).
--   2. Para gargalos que se manifestam em padrões repetidos (ex.: revisão
--      sênior em múltiplos processos do P2), vinculo todas as etapas que
--      reproduzem o mesmo padrão — a cascata vai derivar o impacto.
--   3. Slugs estáveis via mapa_uuid('gar-etp-<gargalo>-<etapa>') para
--      idempotência. Não há colunas numéricas/horas na tabela.
--
-- Escopo: somente o cluster OSG ('0523512c-…7a80'). Nenhum DELETE — apenas
--   INSERT idempotente (ON CONFLICT DO NOTHING na UNIQUE composta).
-- ============================================================================

BEGIN;

INSERT INTO public.gargalo_etapas (id, gargalo_id, etapa_id, scenario, created_at)
SELECT mapa_uuid('gar-etp-' || m.suffix), m.gargalo_id, m.etapa_id, 'AS-IS', NOW()
FROM (VALUES
  -- ─── DP sem revisão de par ───────────────────────────────────────────
  -- Manifesta no fechamento do DP (P1.01 etp 8) e na reabertura (P1.02 etp 2):
  -- não há gate de revisão antes do "fim".
  ('dp-rev-p1-01-08', mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('etp-osg-p1-01-08')),
  ('dp-rev-p1-02-02', mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('etp-osg-p1-02-02')),

  -- ─── Leitura manual de matrícula ponta a ponta ───────────────────────
  -- P1.01-03 é o ato exato. P1.03-01/02/03 reproduzem leitura na digitação.
  ('leit-p1-01-03',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-01-03')),
  ('leit-p1-03-01',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-03-01')),
  ('leit-p1-03-02',   mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('etp-osg-p1-03-02')),

  -- ─── Devolutiva do cliente atrasa o início ───────────────────────────
  -- Manifesta no pedido (P6.01-02) e na validação dos 11 insumos (P6.01-03).
  -- Também na coleta inicial do DP (P1.01-01).
  ('devc-p6-01-02',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p6-01-02')),
  ('devc-p6-01-03',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p6-01-03')),
  ('devc-p1-01-01',   mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('etp-osg-p1-01-01')),

  -- ─── Matrícula desatualizada (terceiro/falecido) ─────────────────────
  ('mdes-p1-01-07',   mapa_uuid('gar-osg-matricula-desatualizada'),  mapa_uuid('etp-osg-p1-01-07')),

  -- ─── Bens com matrícula não declarados no IR ─────────────────────────
  ('bndr-p1-01-02',   mapa_uuid('gar-osg-bens-nao-declarados-ir'),   mapa_uuid('etp-osg-p1-01-02')),
  ('bndr-p1-01-06',   mapa_uuid('gar-osg-bens-nao-declarados-ir'),   mapa_uuid('etp-osg-p1-01-06')),

  -- ─── Documentos dispersos e padrão de salvamento ─────────────────────
  -- Manifesta na coleta (P1.01-01) e no pedido informal por e-mail/WhatsApp
  -- sem rastreio estruturado (P6.01-02).
  ('disp-p1-01-01',   mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('etp-osg-p1-01-01')),
  ('disp-p6-01-02',   mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('etp-osg-p6-01-02')),

  -- ─── Cascata de alterações contratuais simultâneas ───────────────────
  -- O gatilho exato é P1.02-04 (Abrir demandas de AC subsequentes) e a
  -- sinalização P1.02-05. A cascata derivada cobre P2.04, P2.06 e P3.03.
  ('casc-p1-02-04',   mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('etp-osg-p1-02-04')),
  ('casc-p1-02-05',   mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('etp-osg-p1-02-05')),

  -- ─── Múltiplas camadas de revisão e troca de caracteres ──────────────
  -- Manifesta na etapa "Checklist do revisor" + "Revisão sênior" do padrão
  -- societário. Vínculo em todos os processos com o padrão.
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

  -- ─── Erro em limites e confrontações vira exigência cartorial ────────
  -- Causa-raiz: P1.03-03 (Transcrever limites e confrontações). Reaparece
  -- em P2.04-02 (Elaborar minuta AC cláusula 5ª, copia descrição) e na
  -- identificação do erro em P2.08-02 (Identificar diferença na descrição).
  ('elim-p1-03-03',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p1-03-03')),
  ('elim-p2-04-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p2-04-02')),
  ('elim-p2-08-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p2-08-02')),
  ('elim-p3-03-02',   mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('etp-osg-p3-03-02')),

  -- ─── Assistente não reabre o DP para conferir ────────────────────────
  -- Manifesta nas etapas de elaboração de minuta, onde o assistente deveria
  -- reabrir o DP atualizado mas trabalha da memória.
  ('nrab-p2-04-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-04-02')),
  ('nrab-p2-05-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-05-02')),
  ('nrab-p2-06-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p2-06-02')),
  ('nrab-p3-03-02',   mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('etp-osg-p3-03-02')),

  -- ─── Soma do capital social com diferença de centavos ────────────────
  -- Causa-raiz: P1.04-03 (Montar Planilha de Capital Social — Excel manual).
  -- Manifesta no fechamento da cláusula 5ª em P2.01-02 e P2.04-02.
  ('soma-p1-04-03',   mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('etp-osg-p1-04-03')),
  ('soma-p2-01-02',   mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('etp-osg-p2-01-02')),

  -- ─── Assinatura eletrônica via gov.br trava ──────────────────────────
  -- Manifesta nas etapas explícitas de "Assinatura" em cada pilar.
  ('asgb-p3-03-06',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p3-03-06')),
  ('asgb-p3-04-04',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p3-04-04')),
  ('asgb-p4-03-08',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p4-03-08')),
  ('asgb-p5-02-07',   mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('etp-osg-p5-02-07')),

  -- ─── Coordenação de registro simultâneo na Junta ─────────────────────
  -- Manifesta nas etapas de "Registro Junta Comercial" que dependem de
  -- registro em cadeia (P2.01-06 ↔ P2.02-06 e P2.04-05 ↔ P2.05-05).
  ('junt-p2-01-06',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-01-06')),
  ('junt-p2-02-06',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-02-06')),
  ('junt-p2-04-05',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-04-05')),
  ('junt-p2-05-05',   mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('etp-osg-p2-05-05')),

  -- ─── Atualização cartorial atrasa por custo de ITBI ──────────────────
  -- Etapa exata: P2.04-06 (Cliente atualiza matrículas no cartório).
  ('itbi-p2-04-06',   mapa_uuid('gar-osg-atualizacao-cartorial-itbi'),mapa_uuid('etp-osg-p2-04-06')),

  -- ─── Projeto suspenso aguardando saneamento de 2º momento ────────────
  -- Manifesta em P2.06-01 (Verificar estado — cliente avisa por e-mail/Docbox).
  ('s2mo-p2-06-01',   mapa_uuid('gar-osg-projeto-suspenso-2momento'),mapa_uuid('etp-osg-p2-06-01')),

  -- ─── Trabalho do Fiscal não visível para a OSG ───────────────────────
  -- Manifesta no aguardo do Fiscal em P3.01-03 e nos cálculos do ITCMD
  -- (P4.01-02/03/04) que a OSG não vê em tempo real.
  ('fisc-p3-01-03',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p3-01-03')),
  ('fisc-p4-01-02',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-02')),
  ('fisc-p4-01-03',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-03')),
  ('fisc-p4-01-04',   mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('etp-osg-p4-01-04')),

  -- ─── Planilha gerencial enviada com info fiscal ──────────────────────
  -- Manifesta em P3.01-02 (Receber planilha preenchida e repassar Fiscal).
  ('pgcf-p3-01-02',   mapa_uuid('gar-osg-planilha-cliente-fiscal'),  mapa_uuid('etp-osg-p3-01-02')),

  -- ─── Descasamento entre área matrícula e área explorada ──────────────
  -- Detecta em P3.03-01 (Receber planilha de exploração — hectares ≠ área
  -- da matrícula por reserva legal/APP).
  ('arxm-p3-03-01',   mapa_uuid('gar-osg-area-explorada-vs-matricula'),mapa_uuid('etp-osg-p3-03-01')),

  -- ─── Risco de parceria de fachada perante a RFB ──────────────────────
  -- Manifesta na elaboração da minuta da parceria (P3.03-03) onde a divisão
  -- real de risco entre parceiros é documentada.
  ('rfac-p3-03-03',   mapa_uuid('gar-osg-parceria-fachada-rfb'),     mapa_uuid('etp-osg-p3-03-03')),

  -- ─── Decisão do cliente sobre a doação demora ────────────────────────
  -- Manifesta em P4.02-03 (Cliente escolhe cenário) e bloqueia P4.03-04
  -- (Cliente recolhe ITCMD), que só ocorre após a decisão.
  ('decd-p4-02-03',   mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('etp-osg-p4-02-03')),
  ('decd-p4-03-04',   mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('etp-osg-p4-03-04')),

  -- ─── ITCMD pode travar o projeto indefinidamente ─────────────────────
  -- Etapa exata: P4.03-04 (Cliente recolhe ITCMD). Bloqueia averbação
  -- simultânea (P4.03-09).
  ('itcm-p4-03-04',   mapa_uuid('gar-osg-itcmd-travamento-judicial'),mapa_uuid('etp-osg-p4-03-04')),

  -- ─── Discussão de cláusula trava o projeto por meses ─────────────────
  -- Manifesta na inserção de cláusulas restritivas (P4.03-03) e na reunião
  -- com cliente para discutir cláusulas do acordo (P5.02-06).
  ('clau-p4-03-03',   mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('etp-osg-p4-03-03')),
  ('clau-p5-02-06',   mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('etp-osg-p5-02-06')),

  -- ─── Acordo de Quotistas pode travar a doação ────────────────────────
  -- Pré-condição: P5.02-07 (Assinatura) precisa ocorrer antes da
  -- P4.03-08 (Assinatura da doação).
  ('aqdc-p5-02-07',   mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('etp-osg-p5-02-07')),
  ('aqdc-p4-03-08',   mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('etp-osg-p4-03-08'))

  -- ─── Gargalos transversais SEM etapa-origem clara (intencionalmente fora) ──
  --   gar-osg-comunicacao-fragmentada        — múltiplos canais sem ancoragem
  --   gar-osg-aprovacao-modelo-cuba          — gargalo organizacional centralizado
  --   gar-osg-cliente-confunde-cessao        — sem etapa explícita "explicação ao cliente"
  --   gar-osg-governanca-poucos-dominam      — concentração de conhecimento
  --   gar-osg-visibilidade-projetos          — transversal a todo P6
  --   gar-osg-horas-desacopladas             — transversal ao timesheet
  --   gar-osg-overhead-gestao-invisivel      — transversal ao P6.05
  -- Esses 7 permanecem vinculados apenas em gargalo_processos (visão macro).
) AS m(suffix, gargalo_id, etapa_id)
ON CONFLICT (gargalo_id, etapa_id, scenario) DO NOTHING;

-- ============================================================================
-- Validação pós-insert
-- ============================================================================
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

  -- Sanity: nenhuma etapa-origem aponta para etapa inexistente
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
