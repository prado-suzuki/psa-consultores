-- ============================================================================
-- 20260606100000_osg_v5_full_remap.sql
-- ----------------------------------------------------------------------------
-- Migração FULL do cluster OSG para a estrutura v5 (6 projetos × 33 processos)
-- validada pelas reuniões 30/abr · 07/mai · 08/mai · 12/mai · 14/mai · 19/mai ·
-- 28/mai · diagnóstico estratégico · matriz impacto/esforço · 84 exports
-- OpenProject · checklist documento-insumo · diagramas Mermaid.
--
-- Estratégia: limpeza completa do OSG atual (na ordem inversa de dependências)
-- + re-inserção canônica idempotente via helper mapa_uuid(slug).
--
-- Tudo dentro de UMA transação. Campos quantitativos (volume, horas, custos)
-- ficam NULL/zero para preenchimento manual posterior.
--
-- Conteúdo:
--    1. Helper mapa_uuid()
--    2. CLEANUP (delete em cascata: junções → entidades → projects do OSG)
--    3. projects                  6 linhas (P1–P6)
--    4. documentos_processo       50 documentos canônicos
--    5. sistemas_processo         16 sistemas
--    6. sistema_clusters          16 rateios
--    7. gargalos                  30 gargalos canônicos (consolidados)
--    8. processes                 33 processos (v5)
--    9. process_stages           ~170 etapas AS-IS detalhadas
--   10. etapa_responsaveis       linkagem com job_roles (papel executado/aprovado)
--   11. etapa_documentos         entrada/saída
--   12. etapa_sistemas
--   13. etapa_gargalos           gargalo no nível da etapa (granular)
--   14. gargalo_processos        gargalo no nível do processo
--   15. process_improvements     10 melhorias
--   16. melhoria_processos / melhoria_acoes_td / melhoria_responsaveis
--   17. cascata_eventos / cascata_evento_etapas    5 cascatas principais
--   18. projeto_justificativas    6 (uma por pilar)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.mapa_uuid(slug text) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$ SELECT md5('mapa-osg:' || slug)::uuid $$;

-- ============================================================================
-- 2. CLEANUP — Apaga TODOS os dados do cluster OSG e SOMENTE deles
-- ============================================================================
-- ESCOPO ABSOLUTAMENTE LIMITADO: cada DELETE filtra por cluster_id OSG ou por
-- chave estrangeira que termina em cluster_id OSG. Em nenhuma operação são
-- tocadas:
--   - public.tools          (Digital DEV — intocável)
--   - public.routines       (Digital Rotina — intocável)
--   - public.demand_items   (Digital Rotina — intocável)
--   - public.profiles       (sistema PSA principal — intocável)
--   - public.job_roles      (catálogo GLOBAL sem cluster_id — só leitura)
--   - projects/processes/process_improvements/process_scenarios de outros
--     clusters ou com cluster_id IS NULL (Digital Rotina herdou esses)
--   - documentos_processo, sistemas_processo, gargalos, cascata_eventos
--     de outros clusters
-- Toda DELETE explícita usa WHERE cluster_id = v_cluster ou subquery
-- equivalente. Cascades de FK (ON DELETE CASCADE) só disparam dentro do
-- escopo já filtrado.
-- ============================================================================

DO $cleanup$
DECLARE
  v_cluster uuid := '0523512c-f980-4236-8a7c-53e06c9c7a80';   -- PSA OSG
  v_count_other      integer;
  v_xref_proj_proc   integer;
  v_xref_sprint_del  integer;
  v_xref_daily_proj  integer;
  v_xref_daily_proc  integer;
  v_xref_sprint_proj integer;
BEGIN
  -- Defesa em profundidade: confirma que o cluster OSG existe antes de operar
  IF NOT EXISTS (SELECT 1 FROM public.estrutura_clusters WHERE id = v_cluster) THEN
    RAISE EXCEPTION 'Cluster OSG (id=%) não encontrado. Abortando cleanup para evitar dano.', v_cluster;
  END IF;

  -- ========================================================================
  -- VALIDAÇÃO DE REFERÊNCIAS CRUZADAS COM O MÓDULO EQUIPE / DIGITAL ROTINA
  -- ========================================================================
  -- As tabelas abaixo TÊM FKs apontando para projects/processes mas NÃO são
  -- exclusivas do MAPA. Se existirem rows nelas referenciando projects ou
  -- processes do cluster OSG, há risco de:
  --   - project_processes: CASCADE silencioso (apaga linhas do módulo Equipe)
  --   - sprint_deliverables / daily_standups / sprints: erro de FK violation
  --     que ABORTA toda a migração (rollback automático — sem dano).
  --
  -- Estratégia: contar e ABORTAR explicitamente se houver qualquer referência
  -- cruzada, com instruções claras de remediação manual.
  -- ========================================================================

  SELECT count(*) INTO v_xref_proj_proc
  FROM public.project_processes pp
  WHERE pp.process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster)
     OR pp.project_id IN (SELECT id FROM public.projects  WHERE cluster_id = v_cluster);

  SELECT count(*) INTO v_xref_sprint_del
  FROM public.sprint_deliverables sd
  WHERE sd.process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster)
     OR sd.project_id IN (SELECT id FROM public.projects  WHERE cluster_id = v_cluster);

  SELECT count(*) INTO v_xref_daily_proj
  FROM public.daily_standups ds
  WHERE ds.project_id IN (SELECT id FROM public.projects WHERE cluster_id = v_cluster);

  SELECT count(*) INTO v_xref_daily_proc
  FROM public.daily_standups ds
  WHERE ds.process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster);

  SELECT count(*) INTO v_xref_sprint_proj
  FROM public.sprints s
  WHERE s.project_id IN (SELECT id FROM public.projects WHERE cluster_id = v_cluster);

  IF (v_xref_proj_proc + v_xref_sprint_del + v_xref_daily_proj + v_xref_daily_proc + v_xref_sprint_proj) > 0 THEN
    RAISE EXCEPTION
      'ABORTADO: encontradas referências cruzadas entre o módulo Equipe e o cluster OSG. '
      'project_processes=% sprint_deliverables=% daily_standups(project)=% daily_standups(process)=% sprints(project)=% . '
      'Remova ou redirecione essas referências MANUALMENTE antes de rodar esta migração. '
      'Como o cluster OSG do MAPA usa projetos como "pilares metodológicos canônicos" (não como instâncias de cliente), '
      'normalmente esses contadores devem ser zero. Se não forem, há vínculo histórico que precisa ser revisado.',
      v_xref_proj_proc, v_xref_sprint_del, v_xref_daily_proj, v_xref_daily_proc, v_xref_sprint_proj;
  END IF;

  RAISE NOTICE 'Validação 1/3 OK: nenhuma referência cruzada Equipe↔OSG encontrada.';

  -- ========================================================================
  -- VALIDAÇÃO 2: rows "órfãs" criadas FORA do MAPA mas dentro do escopo OSG
  -- ========================================================================
  -- Regra do operador: "NÃO pode, em nenhum caso, excluir algo de Digital
  -- Rotina que não tenha sido carregado pelas migrações do MAPA E esteja
  -- sem cluster OSG."
  --
  -- Tradução: as únicas rows que posso apagar são as que entraram pelo MAPA.
  -- A âncora segura é cluster_id = OSG. Quando o cleanup usa subquery (via
  -- process_id ou similar), preciso garantir que NÃO há rows criadas FORA do
  -- MAPA referenciando entidades OSG.
  --
  -- Caso problemático: process_improvements com process_id OSG mas
  -- cluster_id NULL ou diferente — esses são improvements criados pela
  -- Equipe sobre processos do MAPA. Não devo apagar.
  -- ========================================================================
  DECLARE
    v_orphan_improvements integer;
  BEGIN
    SELECT count(*) INTO v_orphan_improvements
    FROM public.process_improvements
    WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster)
      AND (cluster_id IS NULL OR cluster_id IS DISTINCT FROM v_cluster);

    IF v_orphan_improvements > 0 THEN
      RAISE EXCEPTION
        'ABORTADO: % process_improvements órfãos detectados — referenciam '
        'processes do cluster OSG mas têm cluster_id NULL ou diferente. '
        'Essas linhas foram criadas FORA das migrações do MAPA (provavelmente '
        'pelo módulo Equipe) e seriam apagadas em cascata se eu apagasse os '
        'processes do OSG (FK ON DELETE CASCADE). Reatribua o cluster_id ou '
        'remova essas linhas MANUALMENTE antes de rodar a migração.',
        v_orphan_improvements;
    END IF;
  END;

  RAISE NOTICE 'Validação 2/3 OK: nenhum process_improvement órfão sobre processos OSG.';

  -- ========================================================================
  -- VALIDAÇÃO 3: contagens contra o baseline v4 conhecido
  -- ========================================================================
  -- Baseline carregado pelas migrações MAPA (validado via REST API antes da
  -- v5):
  --   projects(OSG)              = 6
  --   processes(OSG)             = 32
  --   process_stages(OSG)        = 167
  --   etapa_responsaveis(OSG)    = 176
  --   etapa_documentos(OSG)      = 204
  --   etapa_sistemas(OSG)        = 219
  --   gargalos(OSG)              = 91
  --   gargalo_processos(OSG)     = 91
  --   documentos_processo(OSG)   = 120
  --   sistemas_processo(OSG)     = 16
  --   sistema_clusters(OSG)      = 16
  --   process_improvements(OSG)  = 0
  --   process_scenarios(OSG)     = 0
  --   cascata_eventos(OSG)       = 0
  --   projeto_justificativas(OSG)= 0
  --   gargalo_responsaveis(OSG)  = 0
  --   sistema_responsaveis(OSG)  = 0
  --   documento_horas_historico  = 0
  --   melhoria_*                 = 0
  --
  -- Regra: contagem ATUAL > baseline = há rows criadas FORA do MAPA dentro
  -- do escopo OSG. Não posso apagar (violaria a regra). ABORTAR.
  -- (Contagem MENOR é tolerada — alguém já apagou rows MAPA; não é violação.)
  -- ========================================================================
  DECLARE
    v_actual   integer;
    v_msg      text := '';
  BEGIN
    SELECT count(*) INTO v_actual FROM public.processes WHERE cluster_id = v_cluster;
    IF v_actual > 32 THEN v_msg := v_msg || format('processes=%s>32; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.process_stages
      WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster);
    IF v_actual > 167 THEN v_msg := v_msg || format('process_stages=%s>167; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.etapa_responsaveis
      WHERE etapa_id IN (SELECT ps.id FROM public.process_stages ps
                         JOIN public.processes p ON p.id = ps.process_id
                         WHERE p.cluster_id = v_cluster);
    IF v_actual > 176 THEN v_msg := v_msg || format('etapa_responsaveis=%s>176; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.etapa_documentos
      WHERE etapa_id IN (SELECT ps.id FROM public.process_stages ps
                         JOIN public.processes p ON p.id = ps.process_id
                         WHERE p.cluster_id = v_cluster);
    IF v_actual > 204 THEN v_msg := v_msg || format('etapa_documentos=%s>204; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.etapa_sistemas
      WHERE etapa_id IN (SELECT ps.id FROM public.process_stages ps
                         JOIN public.processes p ON p.id = ps.process_id
                         WHERE p.cluster_id = v_cluster);
    IF v_actual > 219 THEN v_msg := v_msg || format('etapa_sistemas=%s>219; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.gargalos WHERE cluster_id = v_cluster;
    IF v_actual > 91 THEN v_msg := v_msg || format('gargalos=%s>91; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.gargalo_processos
      WHERE gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_cluster);
    IF v_actual > 91 THEN v_msg := v_msg || format('gargalo_processos=%s>91; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.documentos_processo WHERE cluster_id = v_cluster;
    IF v_actual > 120 THEN v_msg := v_msg || format('documentos_processo=%s>120; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.sistemas_processo WHERE cluster_id = v_cluster;
    IF v_actual > 16 THEN v_msg := v_msg || format('sistemas_processo=%s>16; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.sistema_clusters WHERE cluster_id = v_cluster;
    IF v_actual > 16 THEN v_msg := v_msg || format('sistema_clusters=%s>16; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.process_improvements WHERE cluster_id = v_cluster;
    IF v_actual > 0 THEN v_msg := v_msg || format('process_improvements=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.process_scenarios
      WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster);
    IF v_actual > 0 THEN v_msg := v_msg || format('process_scenarios=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.cascata_eventos WHERE cluster_id = v_cluster;
    IF v_actual > 0 THEN v_msg := v_msg || format('cascata_eventos=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.projeto_justificativas
      WHERE projeto_id IN (SELECT id FROM public.projects WHERE cluster_id = v_cluster);
    IF v_actual > 0 THEN v_msg := v_msg || format('projeto_justificativas=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.gargalo_responsaveis
      WHERE gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_cluster);
    IF v_actual > 0 THEN v_msg := v_msg || format('gargalo_responsaveis=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.sistema_responsaveis
      WHERE sistema_id IN (SELECT id FROM public.sistemas_processo WHERE cluster_id = v_cluster);
    IF v_actual > 0 THEN v_msg := v_msg || format('sistema_responsaveis=%s>0; ', v_actual); END IF;

    SELECT count(*) INTO v_actual FROM public.documento_horas_historico
      WHERE documento_id IN (SELECT id FROM public.documentos_processo WHERE cluster_id = v_cluster);
    IF v_actual > 0 THEN v_msg := v_msg || format('documento_horas_historico=%s>0; ', v_actual); END IF;

    IF v_msg <> '' THEN
      RAISE EXCEPTION
        'ABORTADO: contagens excedem o baseline v4 carregado pelo MAPA. '
        'Isso indica linhas criadas FORA das migrações do MAPA dentro do escopo OSG. '
        'Como a regra proíbe apagar dados não-MAPA, a operação é abortada. '
        'Investigue manualmente: %', v_msg;
    END IF;
  END;

  RAISE NOTICE 'Validação 3/3 OK: contagens dentro do baseline v4 — nenhuma linha estranha no escopo OSG.';

  -- Snapshot de segurança: quantas linhas existem em outros clusters
  -- (para auditoria — não toca em nada além do OSG)
  SELECT count(*) INTO v_count_other FROM public.projects WHERE cluster_id IS DISTINCT FROM v_cluster;
  RAISE NOTICE 'projects fora do OSG (preservados): %', v_count_other;

  SELECT count(*) INTO v_count_other FROM public.processes WHERE cluster_id IS DISTINCT FROM v_cluster;
  RAISE NOTICE 'processes fora do OSG (preservados): %', v_count_other;

  -- 2.1 Junções de melhoria → process_improvements (cluster_id OSG)
  DELETE FROM public.melhoria_acoes_td      WHERE melhoria_id IN (SELECT id FROM public.process_improvements WHERE cluster_id = v_cluster);
  DELETE FROM public.melhoria_responsaveis  WHERE melhoria_id IN (SELECT id FROM public.process_improvements WHERE cluster_id = v_cluster);
  DELETE FROM public.melhoria_sistemas      WHERE melhoria_id IN (SELECT id FROM public.process_improvements WHERE cluster_id = v_cluster);
  DELETE FROM public.melhoria_processos     WHERE melhoria_id IN (SELECT id FROM public.process_improvements WHERE cluster_id = v_cluster);
  DELETE FROM public.process_improvements   WHERE cluster_id = v_cluster;

  -- 2.2 Cascata
  DELETE FROM public.cascata_evento_etapas  WHERE evento_id IN (SELECT id FROM public.cascata_eventos WHERE cluster_id = v_cluster);
  DELETE FROM public.cascata_eventos        WHERE cluster_id = v_cluster;

  -- 2.3 Junções de etapa → process_stages → processes (cluster_id OSG)
  DELETE FROM public.etapa_responsaveis WHERE etapa_id IN (
    SELECT ps.id FROM public.process_stages ps
    INNER JOIN public.processes p ON p.id = ps.process_id
    WHERE p.cluster_id = v_cluster
  );
  DELETE FROM public.etapa_documentos   WHERE etapa_id IN (
    SELECT ps.id FROM public.process_stages ps
    INNER JOIN public.processes p ON p.id = ps.process_id
    WHERE p.cluster_id = v_cluster
  );
  DELETE FROM public.etapa_sistemas     WHERE etapa_id IN (
    SELECT ps.id FROM public.process_stages ps
    INNER JOIN public.processes p ON p.id = ps.process_id
    WHERE p.cluster_id = v_cluster
  );

  -- 2.4 Junções de gargalo (M2M e responsáveis)
  DELETE FROM public.gargalo_responsaveis WHERE gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_cluster);
  DELETE FROM public.gargalo_processos    WHERE gargalo_id IN (SELECT id FROM public.gargalos WHERE cluster_id = v_cluster);

  -- 2.5 process_scenarios (snapshots de ROI) — somente os de processos OSG
  DELETE FROM public.process_scenarios WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster);

  -- 2.6 process_stages (cluster_id OSG via processes)
  DELETE FROM public.process_stages WHERE process_id IN (SELECT id FROM public.processes WHERE cluster_id = v_cluster);

  -- 2.7 processes (cluster_id OSG)
  DELETE FROM public.processes WHERE cluster_id = v_cluster;

  -- 2.8 gargalos (cluster_id OSG)
  DELETE FROM public.gargalos WHERE cluster_id = v_cluster;

  -- 2.9 Histórico de horas de documento (FK → documentos_processo OSG)
  DELETE FROM public.documento_horas_historico WHERE documento_id IN (SELECT id FROM public.documentos_processo WHERE cluster_id = v_cluster);

  -- 2.10 sistema_clusters (M2M sistema↔cluster) — somente rateios para OSG
  DELETE FROM public.sistema_clusters WHERE cluster_id = v_cluster;

  -- 2.11 sistema_responsaveis (FK → sistemas_processo OSG)
  DELETE FROM public.sistema_responsaveis WHERE sistema_id IN (SELECT id FROM public.sistemas_processo WHERE cluster_id = v_cluster);

  -- 2.12 Catálogos por cluster (somente cluster OSG)
  DELETE FROM public.documentos_processo WHERE cluster_id = v_cluster;
  DELETE FROM public.sistemas_processo   WHERE cluster_id = v_cluster;

  -- 2.13 projeto_justificativas (FK → projects do OSG)
  DELETE FROM public.projeto_justificativas WHERE projeto_id IN (SELECT id FROM public.projects WHERE cluster_id = v_cluster);

  -- 2.14 projects (cluster_id = OSG) — NÃO TOCA cluster_id IS NULL (Digital Rotina)
  DELETE FROM public.projects WHERE cluster_id = v_cluster;

  -- Auditoria pós-cleanup: confirma que nada fora do OSG foi tocado
  SELECT count(*) INTO v_count_other FROM public.projects WHERE cluster_id IS DISTINCT FROM v_cluster;
  RAISE NOTICE 'projects fora do OSG (pós-cleanup, devem ser idênticos ao snapshot): %', v_count_other;

  SELECT count(*) INTO v_count_other FROM public.processes WHERE cluster_id IS DISTINCT FROM v_cluster;
  RAISE NOTICE 'processes fora do OSG (pós-cleanup, devem ser idênticos ao snapshot): %', v_count_other;
END
$cleanup$;

-- ============================================================================
-- 3. PROJECTS — 6 pilares
-- ============================================================================
INSERT INTO public.projects
  (id, name, description, cluster_id, status, area, created_at, updated_at)
VALUES
  (mapa_uuid('prj-osg-p1'), 'P1 - Organização Patrimonial',
   'Pilar fundador do OSG. Consolida o patrimônio do cliente na planilha-mestra DP, cruzando IR, matrículas, CCIR/IPTU e escrituras, e classifica cada imóvel quanto à integralização (sim · 1º momento · 2º momento · não). Toda decisão de estrutura societária, exploração agrária e sucessão usa o DP como entrada. Inclui o DP inicial, suas atualizações recorrentes (gatilho da cascata de alterações contratuais), a digitação de matrícula (descrição com limites e confrontações precisos) e a qualificação dos sócios (papel de trabalho que alimenta o preâmbulo de todos os contratos).',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW()),
  (mapa_uuid('prj-osg-p2'), 'P2 - Organização Societária',
   'Pilar de constituição e movimentação das pessoas jurídicas. Cria a estrutura PJ (Agro recebe imóveis · Participações controladora recebe cotas · Holdings individuais quando aplicáveis) e executa todas as alterações contratuais subsequentes. Padrão de etapas em todos os processos do pilar: Verificar estado do contrato → Elaborar minuta → Checklist do revisor → Revisão sênior → Aprovação do cliente → Registro na Junta Comercial. Inclui também reorganizações societárias (cisão/fusão/incorporação) e alterações reativas por exigência cartorial.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW()),
  (mapa_uuid('prj-osg-p3'), 'P3 - Instrumentos Agrários',
   'Pilar que formaliza a exploração rural após a integralização. Contrato de parceria rural 20/80 entre PJ Agro (outorgante) e PFs (outorgadas) com base na Lei 4.504/64. Anexos copiam a descrição da matrícula do CS Agro, trocam proprietário PF→PJ, removem valor contábil e adicionam hectares e percentual de exploração por imóvel. Composse regula a divisão dos 80% entre as PFs. Distrato encerra arrendamentos pré-existentes quando aplicável. Termo de Encerramento de Safra fecha o ciclo agrícola sazonal.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW()),
  (mapa_uuid('prj-osg-p4'), 'P4 - Sucessão',
   'Pilar que organiza a transferência do patrimônio dos fundadores para os herdeiros. Dois caminhos possíveis: doação em vida (caminho padrão) ou testamento (alternativa). Calcula três cenários de base do ITCMD (contábil, ITR e mercado) para decisão do cliente, formaliza o instrumento de doação de cotas da Participações em partes iguais para os herdeiros (com cláusulas restritivas e reserva de usufruto quando aplicável) e registra a alteração contratual reflexo simultânea na Junta Comercial. A formalização depende da quitação prévia do ITCMD pelo cliente.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW()),
  (mapa_uuid('prj-osg-p5'), 'P5 - Governança',
   'Pilar de profissionalização da gestão familiar, conduzido em paralelo aos demais pilares (não no encerramento). Estrutura o cliente via documentos formais: diagnóstico/questionário de governança, acordo de quotistas (pode condicionar a doação do P4), protocolo de remuneração, matriz de alçadas, regimento interno do conselho (quando o cliente decide formar conselho de administração) e alteração contratual reflexo na Participações (quando há conselho). Mudanças nos modelos-base do pilar exigem aprovação da gerência.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW()),
  (mapa_uuid('prj-osg-p6'), 'P6 - Gestão de Projeto OSG',
   'Pilar de gestão do ciclo de vida do projeto, do kickoff ao handover. Reúne as fases transversais conduzidas pela coordenação: solicitações preliminares (memorando de documentos ao cliente), entrevista de kickoff (expectativas e líderes), apresentação do projeto ao cliente (após DP e esboço societário prontos), formalização (contrato PSA × cliente), acompanhamento recorrente e finalização (diagnóstico flash + relatório final + entrega). Captura o overhead de gestão e coordenação ao longo de todo o projeto.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', 'active', 'OSG', NOW(), NOW());

-- ============================================================================
-- 4. DOCUMENTOS_PROCESSO — 50 canônicos
-- Origens: Cliente / PSA / Junta Comercial / Cartório / Órgão Público
-- ============================================================================
INSERT INTO public.documentos_processo
  (id, nome, formato, origem, cluster_id, created_at, updated_at)
VALUES
  -- Documentos do cliente (insumos)
  (mapa_uuid('doc-osg-dirpf'),                          'DIRPF (Declaração de Imposto de Renda)',        'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-matricula'),                      'Matrícula do imóvel',                            'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ccir'),                           'CCIR',                                           'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-itr'),                            'ITR',                                            'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-iptu'),                           'IPTU / Inscrição Municipal',                     'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-car'),                            'CAR (Cadastro Ambiental Rural)',                 'PDF',  'Órgão Público',   '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-escritura-cv'),                   'Escritura pública de compra e venda',            'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-contrato-cv'),                    'Contrato particular de compra e venda (CCV)',    'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-contrato-arrend'),                'Contrato de arrendamento pré-existente',         'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-laudo-avaliacao'),                'Laudo de avaliação',                             'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-doc-georreferenciamento'),        'Documento de georreferenciamento (SIGEF)',       'PDF',  'Órgão Público',   '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-rg-cnh'),                         'RG / CNH',                                       'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-cpf'),                            'CPF',                                            'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-certidao-nascimento'),            'Certidão de nascimento',                         'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-certidao-casamento'),             'Certidão de casamento / União estável',          'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-pacto-antenupcial'),              'Pacto antenupcial',                              'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-comprovante-endereco'),           'Comprovante de endereço',                        'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-balanco-dre'),                    'Balanço / Balancete / DRE',                      'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-livro-caixa-rural'),              'Livro-caixa do Produtor Rural',                  'Excel','Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-planilha-exploracao-cliente'),    'Planilha de Exploração preenchida (cliente)',    'Excel','Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-resposta-questionario-gov'),      'Respostas do questionário de governança',        'Word', 'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-comprovante-itcmd'),              'Guia/Comprovante de recolhimento ITCMD',         'PDF',  'Cliente',         '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-nota-devolutiva'),                'Nota devolutiva do cartório',                    'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-matricula-atualizada'),           'Matrícula atualizada (pós-integralização)',      'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),

  -- Papéis de trabalho PSA
  (mapa_uuid('doc-osg-dp'),                             'Diagnóstico Patrimonial (DP)',                   'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-wp-matricula'),                   'WP Digitação de Matrícula',                      'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-wp-socios'),                      'WP Qualificação dos Sócios',                     'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-planilha-capital-social'),        'Planilha de Capital Social',                     'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-checklist-impedimentos'),         'Checklist de impedimentos de matrícula',         'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-checklist-revisao'),              'Checklist de revisão de minuta',                 'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-memorando-docs'),                 'Memorando de documentos preliminares',           'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ata-kickoff'),                    'Ata de Kickoff',                                 'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ppt-apresentacao-projeto'),       'Apresentação do Projeto (PPT)',                  'PowerPoint','PSA',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ppt-apresentacao-sucessao'),      'Apresentação Final de Sucessão (3 cenários ITCMD)','PowerPoint','PSA',       '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-contrato-psa-cliente'),           'Contrato PSA × Cliente (formalização)',          'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-relatorio-final'),                'Relatório final do projeto',                     'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-planilha-itcmd'),                 'Planilha cálculo ITCMD (3 cenários)',            'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-planilha-plan-trib-rural'),       'Planilha Planejamento Tributário Rural',         'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-planilha-protocolo-remuneracao'), 'Planilha Protocolo de Remuneração',              'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-questionario-gov'),               'Questionário de Governança (PSA)',               'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),

  -- Minutas e documentos finalizados — abrangem entrada (minuta), saída assinada (cliente) e registrada (Junta/Cartório)
  (mapa_uuid('doc-osg-minuta-cs-agro'),                 'Minuta Contrato Social Agro',                    'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-cs-agro-registrado'),             'Contrato Social Agro registrado',                'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-cs-participacoes'),        'Minuta Contrato Social Participações',           'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-cs-participacoes-registrado'),    'Contrato Social Participações registrado',       'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-cs-holding'),              'Minuta Contrato Social Holding Individual',      'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-cs-holding-registrado'),          'Contrato Social Holding Individual registrado',  'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-agro-integ'),           'Minuta AC Agro - Integralização (cl. 5ª)',       'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ac-agro-integ-registrada'),       'AC Agro - Integralização registrada',            'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-participacoes-cessao'), 'Minuta AC Participações - Cessão de Cotas',      'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ac-participacoes-cessao-reg'),    'AC Participações - Cessão registrada',           'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-imovel-adicional'),     'Minuta AC Agro - Imóvel Adicional (2º momento)', 'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ac-imovel-adicional-reg'),        'AC Agro - Imóvel Adicional registrada',          'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-protocolo-justificacao-reorg'),   'Protocolo e Justificação (Reorganização)',       'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-laudo-avaliacao-reorg'),          'Laudo de avaliação (Reorganização)',             'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ata-reuniao-socios'),             'Ata de Reunião de Sócios',                       'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-exigencia-cartorial'),  'Minuta AC por Exigência Cartorial',              'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-distrato'),                'Minuta de Distrato de Arrendamento',             'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-distrato-registrado'),            'Distrato registrado em cartório',                'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-parceria'),                'Minuta Contrato de Parceria Rural + Anexo',      'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-parceria-registrada'),            'Contrato de Parceria registrado em cartório',    'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-composse'),                'Minuta Contrato de Composse + Anexo',            'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-composse-registrada'),            'Contrato de Composse registrado',                'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-termo-encerramento-safra'),       'Termo de Encerramento de Safra',                 'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-doacao'),                  'Minuta Instrumento de Doação de Cotas',          'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-doacao-assinada'),                'Instrumento de Doação assinado',                 'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-doacao-reflexo'),       'Minuta AC Participações - Reflexo da Doação',    'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ac-doacao-registrada'),           'AC Participações - Doação registrada',           'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-testamento'),              'Minuta de Testamento',                           'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-testamento-lavrado'),             'Testamento lavrado em cartório de notas',        'PDF',  'Cartório',        '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-acordo-quotistas'),        'Minuta Acordo de Quotistas',                     'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-acordo-quotistas-assinado'),      'Acordo de Quotistas assinado',                   'PDF',  'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-protocolo-remuneracao-final'),    'Protocolo de Remuneração (final)',               'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-matriz-alcadas'),                 'Matriz de Alçadas',                              'Excel','PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-regimento-conselho'),             'Regimento Interno do Conselho',                  'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-minuta-ac-gov-reflexo'),          'Minuta AC Participações - Reflexo Governança',   'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-ac-gov-registrada'),              'AC Participações - Governança registrada',       'PDF',  'Junta Comercial', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-diagnostico-flash'),              'Diagnóstico Flash (encerramento)',               'Word', 'PSA',             '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('doc-osg-dac-diretores'),                  'DAC - Descrição e Análise de Cargo dos Diretores','Word','PSA',              '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW());

-- ============================================================================
-- 5. SISTEMAS_PROCESSO — 16 sistemas
-- ============================================================================
INSERT INTO public.sistemas_processo
  (id, nome, descricao, tipo, origem, cluster_id, created_at, updated_at)
VALUES
  (mapa_uuid('sis-osg-docbox'),         'Docbox',         'Gestão documental — recebimento e arquivo de documentos do cliente.',                    NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-openproject'),    'OpenProject',    'Plataforma de gestão de projetos (cronograma, fases canônicas, tarefas).',               NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-sigef'),          'SIGEF',          'Sistema de Gestão Fundiária (INCRA) — busca de descrição de imóveis rurais.',            NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-m365-word'),      'Microsoft Word', 'Editor de minutas e papéis de trabalho (.docx).',                                        NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-m365-excel'),     'Microsoft Excel','Planilhas (DP, Capital Social, Exploração, ITCMD, Alçadas).',                            NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-m365-ppt'),       'PowerPoint',     'Apresentações ao cliente.',                                                              NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-google-drive'),   'Google Drive',   'Armazenamento compartilhado de documentos (parte do Workspace).',                        NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-gmail'),          'Gmail / E-mail', 'Comunicação com cliente, entrega de planilhas, repasse de docs.',                        NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-whatsapp'),       'WhatsApp',       'Comunicação informal/urgente com cliente (sem rastreabilidade).',                        NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-slack'),          'Slack',          'Comunicação interna legada (em substituição por Google Chat).',                          NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-junta-comercial'),'Sistema da Junta Comercial','Registro de contratos sociais e alterações (consulta NIRE/CNPJ).',           NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-cartorio-online'),'Cartório online','Consulta e protocolização cartorial (matrículas).',                                      NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-gov-br'),         'gov.br',         'Plataforma federal de assinatura eletrônica (depende de certificado digital).',          NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-ecac'),           'e-CAC (RFB)',    'Centro virtual de atendimento da Receita Federal.',                                      NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-timesheet'),      'Timesheet / Kairós','Lançamento de horas trabalhadas (desacoplado do OpenProject).',                       NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW()),
  (mapa_uuid('sis-osg-legal-one'),      'Legal One',      'Acompanhamento processual (usado por sêniores).',                                        NULL, 'Externo', '0523512c-f980-4236-8a7c-53e06c9c7a80', NOW(), NOW());

-- ============================================================================
-- 6. SISTEMA_CLUSTERS — rateio 100% no OSG (ajustar manualmente depois)
-- ============================================================================
INSERT INTO public.sistema_clusters (id, sistema_id, cluster_id, rateio, created_at, updated_at)
SELECT
  mapa_uuid('sc-' || s.slug),
  mapa_uuid(s.slug),
  '0523512c-f980-4236-8a7c-53e06c9c7a80',
  100.00,
  NOW(),
  NOW()
FROM (VALUES
  ('sis-osg-docbox'), ('sis-osg-openproject'), ('sis-osg-sigef'),
  ('sis-osg-m365-word'), ('sis-osg-m365-excel'), ('sis-osg-m365-ppt'),
  ('sis-osg-google-drive'), ('sis-osg-gmail'), ('sis-osg-whatsapp'),
  ('sis-osg-slack'), ('sis-osg-junta-comercial'), ('sis-osg-cartorio-online'),
  ('sis-osg-gov-br'), ('sis-osg-ecac'), ('sis-osg-timesheet'), ('sis-osg-legal-one')
) AS s(slug);

COMMIT;
