-- ============================================================================
-- 20260606100002_osg_v5_junctions_and_extras.sql
-- ----------------------------------------------------------------------------
-- Parte 3/3 da migração v5 do cluster OSG.
-- Pré-requisitos: 20260606100000 (limpeza+projetos+docs+sistemas)
--                 20260606100001 (gargalos+processes+stages)
--
-- Conteúdo:
--  10. etapa_responsaveis      — papel executado/aprovado, job_role canônico
--  11. etapa_sistemas          — sistemas usados na etapa
--  12. etapa_documentos        — entrada/saída
--  13. gargalo_processos       — M2M gargalo↔processo
--  14. process_improvements    — 10 melhorias propostas (Wave 1+2)
--  15. melhoria_acoes_td       — ações TD por melhoria
--  16. melhoria_processos      — melhoria↔processo
--  17. melhoria_responsaveis   — quem implementa
--  18. melhoria_sistemas       — sistemas envolvidos
--  19. cascata_eventos         — 5 cascatas principais
--  20. cascata_evento_etapas   — etapas que participam de cada cascata
--  21. projeto_justificativas  — 1 por pilar
--
-- Volume / horas / custos = NULL/0 para preenchimento manual posterior.
-- Job_roles referenciados via UUID fixo (já existem no banco — ver export).
-- ============================================================================

BEGIN;

-- ===== Constantes de job_roles (do export job_roles-2026-05-26) ==============
-- Para legibilidade abaixo, vamos usar IDs literais; aliases:
--   ASSIST    aa77a98a-74a3-438d-af72-d2100beb9763   Assistente Administrativo
--   FISCAL_SR 1bdb36fd-b65b-4503-aadd-e1b04f505e44   Analista Fiscal Sr  (Felipe / Ricardo)
--   CT_SR     113efb19-80c2-4f17-abc7-0fb71c5e28a8   Consultor Tributário Sr (Anne/Luana/Jaqueline/Carlene)
--   CT_PL     cb75a8a2-7aea-4fbe-9d16-6d3373eff30d   Consultor Tributário Pleno
--   ESPEC     577d89b7-a4de-421a-b192-114dd302847b   Especialista Tributário
--   COORD     9eac2a09-7527-4d6b-ae65-b5004d76cea4   Coordenador (Patrícia)
--   GERENTE   aa53bfa1-f8c5-4509-855c-127698caaaef   Gerente
--   DIRETOR   0929b5d9-b4d9-4ae8-9b5b-b580e273cace   Diretor (Cuba / Fernando)
--   DEV_SR    1fc58b91-e560-4efa-b2fd-90e5a43c2905   Desenvolvedor Sr (Bernardo/Alexandre)

-- ============================================================================
-- 10. ETAPA_RESPONSAVEIS — papel "executado" para o titular; "aprovado" para revisor sênior/cliente
-- ============================================================================
INSERT INTO public.etapa_responsaveis
  (id, etapa_id, scenario, responsavel_id, papel, horas, created_at)
VALUES
  -- P1.01 DP Inicial — assistente executa, CT_SR aprova etapa 9 (revisão sênior)
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-01'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-06'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-07'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-01-08'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  -- (removida: etapa "Revisão sênior do DP" não existe no AS-IS — confirmado por Anne 05/jun.
  --  A gestão da revisão entra no TO-BE via melhoria mel-osg-dp-inteligente.)

  -- P1.02 Atualização DP — CT_SR executa, COORD aprova
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-02-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-02-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-02-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-02-04'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-02-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),

  -- P1.03 Digitação Matrícula — Assistente (back-office Maritsa)
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-03-01'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-03-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-03-03'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-03-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),

  -- P1.04 Qualificação Sócios
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-04-01'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-04-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-04-03'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p1-04-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),

  -- P2.01 Const Agro — padrão: Assist executa minuta, CT_SR aprova, GERENTE para mudança modelo
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-01-06'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.02 Const Participações
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-02-06'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.03 Holdings
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-03-06'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.04 AC Integralização — CT_SR descreve cláusula 5ª
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-04-06'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.05 AC Cessão
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-05-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-05-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-05-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-05-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-05-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.06 AC Imóvel Adicional
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-06-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-06-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-06-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-06-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-06-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.07 Reorganização — caso complexo, mais sêniores
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-03'), 'AS-IS', '577d89b7-a4de-421a-b192-114dd302847b', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-05'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-06'), 'AS-IS', 'aa53bfa1-f8c5-4509-855c-127698caaaef', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-07-07'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P2.08 AC Exigência Cartorial
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-05'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p2-08-06'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P3.01 Planej Trib Rural — Fiscal_Sr é o ator principal
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-01-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-01-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-01-03'), 'AS-IS', '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-01-04'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-01-05'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),

  -- P3.02 Distrato
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-02-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-02-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-02-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-02-04'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P3.03 Parceria
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-05'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-06'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-03-07'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P3.04 Composse
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-04-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-04-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-04-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-04-04'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-04-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P3.05 Encerramento Safra
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-05-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-05-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p3-05-03'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P4.01 Planej ITCMD
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-01-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-01-02'), 'AS-IS', '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-01-03'), 'AS-IS', '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-01-04'), 'AS-IS', '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-01-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'aprovado',  NULL, NOW()),

  -- P4.02 Apres Final
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-02-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-02-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-02-03'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),

  -- P4.03 Doação + AC
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-05'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-06'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-07'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-08'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-03-09'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P4.04 Testamento
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-04-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-04-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p4-04-03'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),

  -- P5.01 Diag Governança — Coordenador (Cuba/Patrícia) e CT_SR
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-01-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-01-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-01-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-01-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),

  -- P5.02 Acordo Quotistas — Cuba aprova mudanças de modelo
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-05'), 'AS-IS', '0929b5d9-b4d9-4ae8-9b5b-b580e273cace', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-06'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-02-07'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P5.03 Prot Remuneração
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-03-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-03-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-03-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-03-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-03-05'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'aprovado',  NULL, NOW()),

  -- P5.04 Matriz Alçadas
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-04-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-04-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-04-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-04-04'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'aprovado',  NULL, NOW()),

  -- P5.05 Regimento
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-05-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-05-02'), 'AS-IS', '0929b5d9-b4d9-4ae8-9b5b-b580e273cace', 'aprovado',  NULL, NOW()),

  -- P5.06 AC Reflexo Gov
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-06-01'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-06-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-06-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-06-04'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'aprovado',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p5-06-05'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P6.01 Solicitações
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-01-01'), 'AS-IS', 'aa53bfa1-f8c5-4509-855c-127698caaaef', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-01-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-01-03'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),

  -- P6.02 Kickoff
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-02-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-02-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-02-03'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-02-04'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),

  -- P6.03 Apres Projeto (Carlene 19/05)
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-03-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-03-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-03-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-03-04'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),

  -- P6.04 Formalização
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-04-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-04-02'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-04-03'), 'AS-IS', 'aa53bfa1-f8c5-4509-855c-127698caaaef', 'aprovado',  NULL, NOW()),

  -- P6.05 Acompanhamento
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-05-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-05-02'), 'AS-IS', 'aa77a98a-74a3-438d-af72-d2100beb9763', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-05-03'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-05-04'), 'AS-IS', '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'executado', NULL, NOW()),

  -- P6.06 Finalização
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-06-01'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-06-02'), 'AS-IS', '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'executado', NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('etp-osg-p6-06-03'), 'AS-IS', '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executado', NULL, NOW());

-- ============================================================================
-- 11. ETAPA_SISTEMAS — sistemas usados por etapa (rateio 100% por simplicidade)
-- ============================================================================
INSERT INTO public.etapa_sistemas (id, etapa_id, scenario, sistema_id, rateio, created_at)
SELECT gen_random_uuid(), m.etapa_id, 'AS-IS', m.sistema_id, 100.00, NOW()
FROM (VALUES
  -- P1.01 DP: Excel, Docbox, e-mail
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p1-01-02'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p1-01-03'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p1-01-06'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p1-01-08'), mapa_uuid('sis-osg-m365-excel')),
  -- P1.02 Atualização DP
  (mapa_uuid('etp-osg-p1-02-01'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p1-02-01'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p1-02-02'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p1-02-04'), mapa_uuid('sis-osg-slack')),
  -- P1.03 Digitação matrícula
  (mapa_uuid('etp-osg-p1-03-01'), mapa_uuid('sis-osg-sigef')),
  (mapa_uuid('etp-osg-p1-03-01'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p1-03-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p1-03-03'), mapa_uuid('sis-osg-m365-word')),
  -- P1.04 Qualificação Sócios
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p1-04-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p1-04-03'), mapa_uuid('sis-osg-m365-excel')),
  -- P2.01 Const Agro
  (mapa_uuid('etp-osg-p2-01-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-01-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-01-04'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-01-05'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p2-01-05'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p2-01-06'), mapa_uuid('sis-osg-junta-comercial')),
  -- P2.02 Const Participações
  (mapa_uuid('etp-osg-p2-02-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-02-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-02-04'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-02-05'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p2-02-06'), mapa_uuid('sis-osg-junta-comercial')),
  -- P2.03 Holdings
  (mapa_uuid('etp-osg-p2-03-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-03-05'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p2-03-06'), mapa_uuid('sis-osg-junta-comercial')),
  -- P2.04-P2.08 AC: Word + Junta
  (mapa_uuid('etp-osg-p2-04-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-04-05'), mapa_uuid('sis-osg-junta-comercial')),
  (mapa_uuid('etp-osg-p2-04-06'), mapa_uuid('sis-osg-cartorio-online')),
  (mapa_uuid('etp-osg-p2-05-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-05-05'), mapa_uuid('sis-osg-junta-comercial')),
  (mapa_uuid('etp-osg-p2-06-01'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p2-06-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-06-05'), mapa_uuid('sis-osg-junta-comercial')),
  (mapa_uuid('etp-osg-p2-07-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-07-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-07-04'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-07-07'), mapa_uuid('sis-osg-junta-comercial')),
  (mapa_uuid('etp-osg-p2-08-01'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p2-08-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p2-08-06'), mapa_uuid('sis-osg-junta-comercial')),
  -- P3
  (mapa_uuid('etp-osg-p3-01-01'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p3-01-01'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p3-01-02'), mapa_uuid('sis-osg-slack')),
  (mapa_uuid('etp-osg-p3-03-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p3-03-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p3-03-06'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p3-03-07'), mapa_uuid('sis-osg-cartorio-online')),
  (mapa_uuid('etp-osg-p3-04-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p3-04-04'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p3-04-05'), mapa_uuid('sis-osg-cartorio-online')),
  (mapa_uuid('etp-osg-p3-05-01'), mapa_uuid('sis-osg-m365-word')),
  -- P4
  (mapa_uuid('etp-osg-p4-01-01'), mapa_uuid('sis-osg-slack')),
  (mapa_uuid('etp-osg-p4-01-02'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p4-02-01'), mapa_uuid('sis-osg-m365-ppt')),
  (mapa_uuid('etp-osg-p4-03-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p4-03-05'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p4-03-08'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p4-03-09'), mapa_uuid('sis-osg-junta-comercial')),
  (mapa_uuid('etp-osg-p4-04-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p4-04-02'), mapa_uuid('sis-osg-cartorio-online')),
  -- P5
  (mapa_uuid('etp-osg-p5-02-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p5-02-07'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p5-03-01'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p5-03-04'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p5-03-05'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p5-04-01'), mapa_uuid('sis-osg-m365-excel')),
  (mapa_uuid('etp-osg-p5-04-03'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p5-04-04'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p5-05-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p5-06-02'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p5-06-05'), mapa_uuid('sis-osg-junta-comercial')),
  -- P6
  (mapa_uuid('etp-osg-p6-01-01'), mapa_uuid('sis-osg-openproject')),
  (mapa_uuid('etp-osg-p6-01-02'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p6-01-02'), mapa_uuid('sis-osg-whatsapp')),
  (mapa_uuid('etp-osg-p6-01-03'), mapa_uuid('sis-osg-docbox')),
  (mapa_uuid('etp-osg-p6-03-01'), mapa_uuid('sis-osg-m365-ppt')),
  (mapa_uuid('etp-osg-p6-04-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p6-04-03'), mapa_uuid('sis-osg-gov-br')),
  (mapa_uuid('etp-osg-p6-05-01'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p6-05-01'), mapa_uuid('sis-osg-openproject')),
  (mapa_uuid('etp-osg-p6-05-02'), mapa_uuid('sis-osg-gmail')),
  (mapa_uuid('etp-osg-p6-05-02'), mapa_uuid('sis-osg-whatsapp')),
  (mapa_uuid('etp-osg-p6-06-01'), mapa_uuid('sis-osg-m365-word')),
  (mapa_uuid('etp-osg-p6-06-02'), mapa_uuid('sis-osg-m365-word'))
) AS m(etapa_id, sistema_id);

-- ============================================================================
-- 12. ETAPA_DOCUMENTOS — entrada (insumo do cliente) e saída (PSA produz)
-- ============================================================================
INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume, created_at)
SELECT gen_random_uuid(), m.etapa_id, 'AS-IS', m.documento_id, m.sentido, NULL, NOW()
FROM (VALUES
  -- P1.01 DP: entrada = docs cliente; saída = DP
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-dirpf'),                'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-matricula'),            'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-ccir'),                 'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-itr'),                  'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-iptu'),                 'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-escritura-cv'),         'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-contrato-cv'),          'entrada'),
  (mapa_uuid('etp-osg-p1-01-01'), mapa_uuid('doc-osg-car'),                  'entrada'),
  (mapa_uuid('etp-osg-p1-01-02'), mapa_uuid('doc-osg-dirpf'),                'entrada'),
  (mapa_uuid('etp-osg-p1-01-03'), mapa_uuid('doc-osg-matricula'),            'entrada'),
  (mapa_uuid('etp-osg-p1-01-03'), mapa_uuid('doc-osg-checklist-impedimentos'),'entrada'),
  (mapa_uuid('etp-osg-p1-01-05'), mapa_uuid('doc-osg-ccir'),                 'entrada'),
  (mapa_uuid('etp-osg-p1-01-05'), mapa_uuid('doc-osg-iptu'),                 'entrada'),
  (mapa_uuid('etp-osg-p1-01-06'), mapa_uuid('doc-osg-dp'),                   'saida'),
  (mapa_uuid('etp-osg-p1-01-08'), mapa_uuid('doc-osg-dp'),                   'saida'),

  -- P1.02
  (mapa_uuid('etp-osg-p1-02-01'), mapa_uuid('doc-osg-matricula-atualizada'), 'entrada'),
  (mapa_uuid('etp-osg-p1-02-02'), mapa_uuid('doc-osg-dp'),                   'saida'),

  -- P1.03 Digitação matrícula
  (mapa_uuid('etp-osg-p1-03-01'), mapa_uuid('doc-osg-matricula'),            'entrada'),
  (mapa_uuid('etp-osg-p1-03-01'), mapa_uuid('doc-osg-doc-georreferenciamento'),'entrada'),
  (mapa_uuid('etp-osg-p1-03-03'), mapa_uuid('doc-osg-wp-matricula'),         'saida'),

  -- P1.04 Qualificação
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-rg-cnh'),               'entrada'),
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-cpf'),                  'entrada'),
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-certidao-nascimento'),  'entrada'),
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-certidao-casamento'),   'entrada'),
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-pacto-antenupcial'),    'entrada'),
  (mapa_uuid('etp-osg-p1-04-01'), mapa_uuid('doc-osg-comprovante-endereco'), 'entrada'),
  (mapa_uuid('etp-osg-p1-04-02'), mapa_uuid('doc-osg-wp-socios'),            'saida'),
  (mapa_uuid('etp-osg-p1-04-03'), mapa_uuid('doc-osg-dp'),                   'entrada'),
  (mapa_uuid('etp-osg-p1-04-03'), mapa_uuid('doc-osg-planilha-capital-social'),'saida'),

  -- P2.01 Const Agro
  (mapa_uuid('etp-osg-p2-01-01'), mapa_uuid('doc-osg-wp-socios'),            'entrada'),
  (mapa_uuid('etp-osg-p2-01-01'), mapa_uuid('doc-osg-planilha-capital-social'),'entrada'),
  (mapa_uuid('etp-osg-p2-01-02'), mapa_uuid('doc-osg-minuta-cs-agro'),       'saida'),
  (mapa_uuid('etp-osg-p2-01-03'), mapa_uuid('doc-osg-checklist-revisao'),    'entrada'),
  (mapa_uuid('etp-osg-p2-01-06'), mapa_uuid('doc-osg-cs-agro-registrado'),   'saida'),

  -- P2.02 Const Participações
  (mapa_uuid('etp-osg-p2-02-01'), mapa_uuid('doc-osg-wp-socios'),            'entrada'),
  (mapa_uuid('etp-osg-p2-02-02'), mapa_uuid('doc-osg-minuta-cs-participacoes'),'saida'),
  (mapa_uuid('etp-osg-p2-02-06'), mapa_uuid('doc-osg-cs-participacoes-registrado'),'saida'),

  -- P2.03 Holdings
  (mapa_uuid('etp-osg-p2-03-02'), mapa_uuid('doc-osg-minuta-cs-holding'),    'saida'),
  (mapa_uuid('etp-osg-p2-03-06'), mapa_uuid('doc-osg-cs-holding-registrado'),'saida'),

  -- P2.04 AC Integralização
  (mapa_uuid('etp-osg-p2-04-01'), mapa_uuid('doc-osg-dp'),                   'entrada'),
  (mapa_uuid('etp-osg-p2-04-01'), mapa_uuid('doc-osg-cs-agro-registrado'),   'entrada'),
  (mapa_uuid('etp-osg-p2-04-02'), mapa_uuid('doc-osg-wp-matricula'),         'entrada'),
  (mapa_uuid('etp-osg-p2-04-02'), mapa_uuid('doc-osg-minuta-ac-agro-integ'), 'saida'),
  (mapa_uuid('etp-osg-p2-04-05'), mapa_uuid('doc-osg-ac-agro-integ-registrada'),'saida'),
  (mapa_uuid('etp-osg-p2-04-06'), mapa_uuid('doc-osg-matricula-atualizada'), 'saida'),

  -- P2.05 AC Cessão
  (mapa_uuid('etp-osg-p2-05-01'), mapa_uuid('doc-osg-cs-participacoes-registrado'),'entrada'),
  (mapa_uuid('etp-osg-p2-05-02'), mapa_uuid('doc-osg-minuta-ac-participacoes-cessao'),'saida'),
  (mapa_uuid('etp-osg-p2-05-05'), mapa_uuid('doc-osg-ac-participacoes-cessao-reg'),'saida'),

  -- P2.06 AC Imóvel Adicional
  (mapa_uuid('etp-osg-p2-06-01'), mapa_uuid('doc-osg-matricula-atualizada'), 'entrada'),
  (mapa_uuid('etp-osg-p2-06-02'), mapa_uuid('doc-osg-minuta-ac-imovel-adicional'),'saida'),
  (mapa_uuid('etp-osg-p2-06-05'), mapa_uuid('doc-osg-ac-imovel-adicional-reg'),'saida'),

  -- P2.07 Reorganização
  (mapa_uuid('etp-osg-p2-07-01'), mapa_uuid('doc-osg-protocolo-justificacao-reorg'),'saida'),
  (mapa_uuid('etp-osg-p2-07-02'), mapa_uuid('doc-osg-ata-reuniao-socios'),   'saida'),
  (mapa_uuid('etp-osg-p2-07-03'), mapa_uuid('doc-osg-laudo-avaliacao-reorg'),'saida'),

  -- P2.08 AC Exigência Cartorial
  (mapa_uuid('etp-osg-p2-08-01'), mapa_uuid('doc-osg-nota-devolutiva'),      'entrada'),
  (mapa_uuid('etp-osg-p2-08-03'), mapa_uuid('doc-osg-minuta-ac-exigencia-cartorial'),'saida'),

  -- P3.01 Planej Trib Rural
  (mapa_uuid('etp-osg-p3-01-01'), mapa_uuid('doc-osg-planilha-plan-trib-rural'),'saida'),
  (mapa_uuid('etp-osg-p3-01-02'), mapa_uuid('doc-osg-planilha-exploracao-cliente'),'entrada'),
  (mapa_uuid('etp-osg-p3-01-02'), mapa_uuid('doc-osg-livro-caixa-rural'),    'entrada'),
  (mapa_uuid('etp-osg-p3-01-02'), mapa_uuid('doc-osg-balanco-dre'),          'entrada'),
  (mapa_uuid('etp-osg-p3-01-02'), mapa_uuid('doc-osg-itr'),                  'entrada'),

  -- P3.02 Distrato
  (mapa_uuid('etp-osg-p3-02-01'), mapa_uuid('doc-osg-contrato-arrend'),      'entrada'),
  (mapa_uuid('etp-osg-p3-02-01'), mapa_uuid('doc-osg-minuta-distrato'),      'saida'),
  (mapa_uuid('etp-osg-p3-02-04'), mapa_uuid('doc-osg-distrato-registrado'),  'saida'),

  -- P3.03 Parceria
  (mapa_uuid('etp-osg-p3-03-01'), mapa_uuid('doc-osg-planilha-exploracao-cliente'),'entrada'),
  (mapa_uuid('etp-osg-p3-03-02'), mapa_uuid('doc-osg-wp-matricula'),         'entrada'),
  (mapa_uuid('etp-osg-p3-03-03'), mapa_uuid('doc-osg-minuta-parceria'),      'saida'),
  (mapa_uuid('etp-osg-p3-03-07'), mapa_uuid('doc-osg-parceria-registrada'),  'saida'),

  -- P3.04 Composse
  (mapa_uuid('etp-osg-p3-04-01'), mapa_uuid('doc-osg-minuta-composse'),      'saida'),
  (mapa_uuid('etp-osg-p3-04-05'), mapa_uuid('doc-osg-composse-registrada'),  'saida'),

  -- P3.05 Encerramento Safra
  (mapa_uuid('etp-osg-p3-05-01'), mapa_uuid('doc-osg-termo-encerramento-safra'),'saida'),

  -- P4.01 Planej ITCMD
  (mapa_uuid('etp-osg-p4-01-01'), mapa_uuid('doc-osg-cs-participacoes-registrado'),'entrada'),
  (mapa_uuid('etp-osg-p4-01-01'), mapa_uuid('doc-osg-planilha-capital-social'),'entrada'),
  (mapa_uuid('etp-osg-p4-01-04'), mapa_uuid('doc-osg-planilha-itcmd'),       'saida'),

  -- P4.02 Apres Final
  (mapa_uuid('etp-osg-p4-02-01'), mapa_uuid('doc-osg-planilha-itcmd'),       'entrada'),
  (mapa_uuid('etp-osg-p4-02-01'), mapa_uuid('doc-osg-ppt-apresentacao-sucessao'),'saida'),

  -- P4.03 Doação + AC
  (mapa_uuid('etp-osg-p4-03-01'), mapa_uuid('doc-osg-minuta-doacao'),        'saida'),
  (mapa_uuid('etp-osg-p4-03-04'), mapa_uuid('doc-osg-comprovante-itcmd'),    'entrada'),
  (mapa_uuid('etp-osg-p4-03-05'), mapa_uuid('doc-osg-minuta-ac-doacao-reflexo'),'saida'),
  (mapa_uuid('etp-osg-p4-03-08'), mapa_uuid('doc-osg-doacao-assinada'),      'saida'),
  (mapa_uuid('etp-osg-p4-03-09'), mapa_uuid('doc-osg-ac-doacao-registrada'), 'saida'),

  -- P4.04 Testamento
  (mapa_uuid('etp-osg-p4-04-01'), mapa_uuid('doc-osg-minuta-testamento'),    'saida'),
  (mapa_uuid('etp-osg-p4-04-03'), mapa_uuid('doc-osg-testamento-lavrado'),   'saida'),

  -- P5.01 Diag Governança
  (mapa_uuid('etp-osg-p5-01-01'), mapa_uuid('doc-osg-questionario-gov'),     'saida'),
  (mapa_uuid('etp-osg-p5-01-01'), mapa_uuid('doc-osg-resposta-questionario-gov'),'entrada'),

  -- P5.02 Acordo Quotistas
  (mapa_uuid('etp-osg-p5-02-03'), mapa_uuid('doc-osg-minuta-acordo-quotistas'),'saida'),
  (mapa_uuid('etp-osg-p5-02-07'), mapa_uuid('doc-osg-acordo-quotistas-assinado'),'saida'),

  -- P5.03 Prot Remuneração
  (mapa_uuid('etp-osg-p5-03-01'), mapa_uuid('doc-osg-planilha-protocolo-remuneracao'),'saida'),
  (mapa_uuid('etp-osg-p5-03-04'), mapa_uuid('doc-osg-protocolo-remuneracao-final'),'saida'),

  -- P5.04 Matriz Alçadas
  (mapa_uuid('etp-osg-p5-04-01'), mapa_uuid('doc-osg-matriz-alcadas'),       'saida'),
  (mapa_uuid('etp-osg-p5-04-03'), mapa_uuid('doc-osg-dac-diretores'),        'saida'),

  -- P5.05 Regimento Conselho
  (mapa_uuid('etp-osg-p5-05-01'), mapa_uuid('doc-osg-regimento-conselho'),   'saida'),

  -- P5.06 AC Reflexo Gov
  (mapa_uuid('etp-osg-p5-06-02'), mapa_uuid('doc-osg-minuta-ac-gov-reflexo'),'saida'),
  (mapa_uuid('etp-osg-p5-06-05'), mapa_uuid('doc-osg-ac-gov-registrada'),    'saida'),

  -- P6.01 Solicitações
  (mapa_uuid('etp-osg-p6-01-02'), mapa_uuid('doc-osg-memorando-docs'),       'saida'),

  -- P6.02 Kickoff
  (mapa_uuid('etp-osg-p6-02-01'), mapa_uuid('doc-osg-ata-kickoff'),          'saida'),

  -- P6.03 Apres Projeto
  (mapa_uuid('etp-osg-p6-03-01'), mapa_uuid('doc-osg-dp'),                   'entrada'),
  (mapa_uuid('etp-osg-p6-03-01'), mapa_uuid('doc-osg-ppt-apresentacao-projeto'),'saida'),

  -- P6.04 Formalização
  (mapa_uuid('etp-osg-p6-04-03'), mapa_uuid('doc-osg-contrato-psa-cliente'), 'saida'),

  -- P6.05 Acompanhamento
  (mapa_uuid('etp-osg-p6-05-03'), mapa_uuid('doc-osg-nota-devolutiva'),      'entrada'),

  -- P6.06 Finalização
  (mapa_uuid('etp-osg-p6-06-01'), mapa_uuid('doc-osg-diagnostico-flash'),    'saida'),
  (mapa_uuid('etp-osg-p6-06-02'), mapa_uuid('doc-osg-relatorio-final'),      'saida')
) AS m(etapa_id, documento_id, sentido);

-- ============================================================================
-- 13. GARGALO_PROCESSOS — M2M: cada gargalo vinculado a um ou mais processos
-- ============================================================================
INSERT INTO public.gargalo_processos (id, gargalo_id, processo_id, created_at)
SELECT gen_random_uuid(), m.gargalo_id, m.processo_id, NOW()
FROM (VALUES
  -- DP-related
  (mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-dp-sem-revisao'),           mapa_uuid('prc-osg-p1-02')),
  (mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-leitura-matricula-manual'), mapa_uuid('prc-osg-p1-03')),
  (mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-devolutiva-cliente'),       mapa_uuid('prc-osg-p6-01')),
  (mapa_uuid('gar-osg-matricula-desatualizada'),  mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-bens-nao-declarados-ir'),   mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('prc-osg-p1-01')),
  (mapa_uuid('gar-osg-doc-disperso-sem-padrao'),  mapa_uuid('prc-osg-p6-01')),
  -- Cascata
  (mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('prc-osg-p1-02')),
  (mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('prc-osg-p2-06')),
  (mapa_uuid('gar-osg-cascata-acs'),              mapa_uuid('prc-osg-p3-03')),
  -- Revisão minutas
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p2-02')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p2-05')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-troca-caracteres'),         mapa_uuid('prc-osg-p5-02')),
  -- Cartorial
  (mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('prc-osg-p1-03')),
  (mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('prc-osg-p2-08')),
  (mapa_uuid('gar-osg-erro-limite-confrontacao'), mapa_uuid('prc-osg-p3-03')),
  -- Assistente
  (mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-assistente-nao-reabre-dp'), mapa_uuid('prc-osg-p2-05')),
  -- Capital social
  (mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('prc-osg-p1-04')),
  (mapa_uuid('gar-osg-soma-capital-centavos'),    mapa_uuid('prc-osg-p2-01')),
  -- gov.br
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p3-04')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-assinatura-gov-br'),        mapa_uuid('prc-osg-p6-04')),
  -- Aprovação Cuba
  (mapa_uuid('gar-osg-aprovacao-modelo-cuba'),    mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-aprovacao-modelo-cuba'),    mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-aprovacao-modelo-cuba'),    mapa_uuid('prc-osg-p5-05')),
  -- Junta
  (mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('prc-osg-p2-01')),
  (mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('prc-osg-p2-02')),
  (mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-junta-registro-simultaneo'),mapa_uuid('prc-osg-p2-05')),
  -- Cliente confusões
  (mapa_uuid('gar-osg-cliente-confunde-cessao'),  mapa_uuid('prc-osg-p2-05')),
  (mapa_uuid('gar-osg-atualizacao-cartorial-itbi'),mapa_uuid('prc-osg-p2-04')),
  (mapa_uuid('gar-osg-projeto-suspenso-2momento'),mapa_uuid('prc-osg-p2-06')),
  -- Comunicação
  (mapa_uuid('gar-osg-comunicacao-fragmentada'),  mapa_uuid('prc-osg-p6-01')),
  (mapa_uuid('gar-osg-comunicacao-fragmentada'),  mapa_uuid('prc-osg-p6-05')),
  (mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('prc-osg-p3-01')),
  (mapa_uuid('gar-osg-fiscal-sem-visibilidade'),  mapa_uuid('prc-osg-p4-01')),
  (mapa_uuid('gar-osg-planilha-cliente-fiscal'),  mapa_uuid('prc-osg-p3-01')),
  (mapa_uuid('gar-osg-planilha-cliente-fiscal'),  mapa_uuid('prc-osg-p4-01')),
  (mapa_uuid('gar-osg-area-explorada-vs-matricula'),mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-parceria-fachada-rfb'),     mapa_uuid('prc-osg-p3-03')),
  (mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('prc-osg-p4-02')),
  (mapa_uuid('gar-osg-decisao-doacao-lenta'),     mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-itcmd-travamento-judicial'),mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-clausula-trava-projeto'),   mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-governanca-poucos-dominam'),mapa_uuid('prc-osg-p5-01')),
  (mapa_uuid('gar-osg-governanca-poucos-dominam'),mapa_uuid('prc-osg-p5-02')),
  (mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('prc-osg-p4-03')),
  (mapa_uuid('gar-osg-acordo-trava-doacao'),      mapa_uuid('prc-osg-p5-02')),
  -- Transversal P6
  (mapa_uuid('gar-osg-visibilidade-projetos'),    mapa_uuid('prc-osg-p6-05')),
  (mapa_uuid('gar-osg-horas-desacopladas'),       mapa_uuid('prc-osg-p6-05')),
  (mapa_uuid('gar-osg-overhead-gestao-invisivel'),mapa_uuid('prc-osg-p6-05'))
) AS m(gargalo_id, processo_id);

-- ============================================================================
-- 14-18. PROCESS_IMPROVEMENTS (melhorias) — 10 priorizadas
-- ============================================================================
INSERT INTO public.process_improvements
  (id, process_id, cluster_id, improvement_description, improvement_status, evaluation_status, created_at, updated_at)
VALUES
  (mapa_uuid('mel-osg-dp-inteligente'), mapa_uuid('prc-osg-p1-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Plataforma de DP com extração assistida de campos a partir de matrícula, IR e CCIR/IPTU, validação cruzada obrigatória entre fontes, gate de revisão por par antes de fechar o DP e rastreabilidade de alterações por usuário e data. Endereça a ausência de revisão de par no AS-IS e reduz a propagação de erros para os documentos derivados em cascata.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-04'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Biblioteca de cláusulas versionada (não de modelos completos): blocos canônicos como descrição de limites e confrontações, cláusula 5ª (capital social) e cláusula 7ª (cessão de cotas) são mantidos uma única vez e reusados na composição de todos os documentos derivados (CS Agro, CS Participações, ACs, Parceria, Composse, Doação e Acordo de Quotistas). Cada bloco passa por aprovação da gerência e fica versionado. Reduz o tempo gasto em revisão e troca de caracteres.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-integracao-horas-openproject'), mapa_uuid('prc-osg-p6-05'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Integração automática entre o sistema de gestão de projetos (OpenProject) e o sistema de lançamento de horas (Timesheet/Kairós) via n8n: a criação ou movimentação de uma tarefa dispara o lançamento de horas correspondente. Endereça o desacoplamento atual entre gestão de projetos e medição de horas.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-hub-lovable-portal-cliente'), mapa_uuid('prc-osg-p6-05'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Hub documental no Lovable com portal do cliente: o cliente faz upload em um único local, vê o checklist do que falta entregar e o SLA de cada pendência. A coordenação tem dashboard com KPIs (cronograma, custos, horas, prazos vencidos, evolução por projeto, gargalos qualitativos e interface com cliente). Substitui a dispersão atual entre Docbox, e-mail, WhatsApp e Drive.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-google-workspace-unificado'), mapa_uuid('prc-osg-p6-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Padronização do Google Workspace (Drive, Chat, Docs, Meet) como substrato único da comunicação e do armazenamento da OSG. Integração entre o Lovable e o Google Chat para notificações de tarefa. Suporta o uso das IAs corporativas (Gemini, NotebookLM, Claude) no fluxo de trabalho.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-calculadora-itcmd'), mapa_uuid('prc-osg-p4-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Mini-app no Lovable para cálculo do ITCMD que consome o DP e calcula os três cenários (contábil, ITR e mercado) com alíquotas parametrizadas por UF. Saída em PowerPoint padronizado e bloco de texto pronto para colagem na AC reflexo da doação. Endereça os cálculos manuais e as diferenças de arredondamento.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-calculadora-capital-social'), mapa_uuid('prc-osg-p1-04'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Calculadora de Capital Social centralizada no Lovable: lê o DP, soma por sócio com arredondamento padronizado e valida contra as regras de cada Junta Comercial. Saída em Excel padronizado e texto pronto para colagem na cláusula 5ª do Contrato Social Agro.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-checklist-impedimentos-formalizado'), mapa_uuid('prc-osg-p1-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Checklist de impedimentos de matrícula formalizado em template padrão (substitui o conhecimento informal repassado em treinamento). Lista os tipos canônicos de impedimento (hipoteca, penhora, alienação fiduciária, bloqueio judicial) e força marcação obrigatória durante a leitura ponta a ponta. Acoplado à etapa de leitura de averbações do DP.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-protocolo-osg-fiscal'), mapa_uuid('prc-osg-p3-01'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Protocolo de interface entre OSG, Fiscal e Consultoria: agenda integrada, pasta única por cliente (não por código de projeto) e gatilho automático quando mudança no DP exige nova revisão tributária ou sucessória. Garante visibilidade bidirecional do andamento entre as áreas.',
   'Não iniciado', 'Não avaliado', NOW(), NOW()),
  (mapa_uuid('mel-osg-dashboard-cascata-rastreavel'), mapa_uuid('prc-osg-p1-02'), '0523512c-f980-4236-8a7c-53e06c9c7a80',
   'Dashboard de cascata rastreável: ao detectar mudança no DP, o sistema lista automaticamente quais alterações contratuais (AC Integralização Agro, AC Cessão, AC Imóvel Adicional), quais anexos agrários (Parceria, Composse) e qual AC de governança precisam ser atualizados. Endereça a cascata silenciosa de 5 a 8 alterações simultâneas em estruturas multi-PJ.',
   'Não iniciado', 'Não avaliado', NOW(), NOW());

-- melhoria_acoes_td — CHECK enum: 'Mapear AS-IS','Padronizar','Documentar','Automatizar','Redesenhar TO-BE','Treinar'
INSERT INTO public.melhoria_acoes_td (id, melhoria_id, acao_td, ordem, created_at)
VALUES
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),                    'Automatizar',       1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),                    'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),                    'Redesenhar TO-BE',  3, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'),              'Padronizar',        1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'),              'Redesenhar TO-BE',  2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-integracao-horas-openproject'),      'Automatizar',       1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'),        'Redesenhar TO-BE',  1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'),        'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),        'Padronizar',        1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),        'Treinar',           2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-itcmd'),                 'Automatizar',       1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-itcmd'),                 'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-capital-social'),        'Automatizar',       1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-capital-social'),        'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-checklist-impedimentos-formalizado'),'Documentar',        1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-checklist-impedimentos-formalizado'),'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-checklist-impedimentos-formalizado'),'Treinar',           3, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-protocolo-osg-fiscal'),              'Mapear AS-IS',      1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-protocolo-osg-fiscal'),              'Padronizar',        2, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-protocolo-osg-fiscal'),              'Documentar',        3, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dashboard-cascata-rastreavel'),      'Automatizar',       1, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dashboard-cascata-rastreavel'),      'Redesenhar TO-BE',  2, NOW());

-- melhoria_processos (M2M com processos secundários adicionais)
INSERT INTO public.melhoria_processos (id, melhoria_id, processo_id, created_at)
VALUES
  -- DP Inteligente cobre P1.01 e P1.02
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'), mapa_uuid('prc-osg-p1-02'), NOW()),
  -- Biblioteca cobre todas as etapas societárias e de doação/governança
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-01'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-02'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p2-05'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p3-03'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p4-03'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'), mapa_uuid('prc-osg-p5-02'), NOW()),
  -- Hub Lovable também cobre P6.01
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'), mapa_uuid('prc-osg-p6-01'), NOW()),
  -- Dashboard cascata cobre processos disparados
  (gen_random_uuid(), mapa_uuid('mel-osg-dashboard-cascata-rastreavel'), mapa_uuid('prc-osg-p2-06'), NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dashboard-cascata-rastreavel'), mapa_uuid('prc-osg-p2-08'), NOW());

-- melhoria_responsaveis (quem implementa)
INSERT INTO public.melhoria_responsaveis (id, melhoria_id, responsavel_id, papel, horas, created_at)
VALUES
  -- DP Inteligente: Desenvolvedor Sr (Bernardo)
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),               '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),               '113efb19-80c2-4f17-abc7-0fb71c5e28a8', 'treinando', NULL, NOW()),
  -- Biblioteca: Alexandre + Cuba aprova
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'),         '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'),         '0929b5d9-b4d9-4ae8-9b5b-b580e273cace', 'treinando', NULL, NOW()),
  -- Integração horas: Alexandre quick win
  (gen_random_uuid(), mapa_uuid('mel-osg-integracao-horas-openproject'), '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  -- Hub Lovable
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'),   '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'),   '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'treinando', NULL, NOW()),
  -- Workspace
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),   '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executor',  NULL, NOW()),
  -- ITCMD calc
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-itcmd'),            '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-itcmd'),            '1bdb36fd-b65b-4503-aadd-e1b04f505e44', 'treinando', NULL, NOW()),
  -- Capital social
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-capital-social'),   '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW()),
  -- Checklist impedimentos
  (gen_random_uuid(), mapa_uuid('mel-osg-checklist-impedimentos-formalizado'),'113efb19-80c2-4f17-abc7-0fb71c5e28a8','executor',NULL, NOW()),
  -- Protocolo OSG-Fiscal
  (gen_random_uuid(), mapa_uuid('mel-osg-protocolo-osg-fiscal'),         '9eac2a09-7527-4d6b-ae65-b5004d76cea4', 'executor',  NULL, NOW()),
  -- Dashboard cascata
  (gen_random_uuid(), mapa_uuid('mel-osg-dashboard-cascata-rastreavel'), '1fc58b91-e560-4efa-b2fd-90e5a43c2905', 'executor',  NULL, NOW());

-- melhoria_sistemas
INSERT INTO public.melhoria_sistemas (id, melhoria_id, sistema_id, rateio, created_at)
VALUES
  -- DP inteligente: Lovable não existe como sistema_processo (é a plataforma). M365-Excel substituído.
  (gen_random_uuid(), mapa_uuid('mel-osg-dp-inteligente'),               mapa_uuid('sis-osg-m365-excel'), 100, NOW()),
  -- Biblioteca: substitui Word manual
  (gen_random_uuid(), mapa_uuid('mel-osg-biblioteca-clausulas'),         mapa_uuid('sis-osg-m365-word'),  100, NOW()),
  -- Integração horas: OpenProject + Timesheet
  (gen_random_uuid(), mapa_uuid('mel-osg-integracao-horas-openproject'), mapa_uuid('sis-osg-openproject'),50, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-integracao-horas-openproject'), mapa_uuid('sis-osg-timesheet'),  50, NOW()),
  -- Hub Lovable: substitui Docbox + WhatsApp + e-mail
  (gen_random_uuid(), mapa_uuid('mel-osg-hub-lovable-portal-cliente'),   mapa_uuid('sis-osg-docbox'),     100, NOW()),
  -- Google Workspace
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),   mapa_uuid('sis-osg-gmail'),      30, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),   mapa_uuid('sis-osg-google-drive'),40, NOW()),
  (gen_random_uuid(), mapa_uuid('mel-osg-google-workspace-unificado'),   mapa_uuid('sis-osg-slack'),      30, NOW()),
  -- ITCMD
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-itcmd'),            mapa_uuid('sis-osg-m365-excel'), 100, NOW()),
  -- Capital social
  (gen_random_uuid(), mapa_uuid('mel-osg-calculadora-capital-social'),   mapa_uuid('sis-osg-m365-excel'), 100, NOW());

-- ============================================================================
-- 19-20. CASCATAS — 5 eventos principais que disparam reações em cadeia
-- ============================================================================
INSERT INTO public.cascata_eventos (id, nome, descricao, cluster_id, processo_raiz_id, created_at, updated_at)
VALUES
  (mapa_uuid('cev-osg-nova-matricula'),
   'Cliente envia matrícula nova ou regularizada',
   'Evento disparador da cascata principal: atualiza o DP, reabre o cálculo de Capital Social, dispara AC Integralização Agro (cláusula 5ª), AC Cessão de Cotas (concentração na Participações) e a revisão do anexo da Parceria Rural. Em estruturas multi-PJ pode propagar para 5 a 8 alterações simultâneas.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', mapa_uuid('prc-osg-p1-02'), NOW(), NOW()),
  (mapa_uuid('cev-osg-exigencia-cartorial'),
   'Cartório devolve nota com erro de descrição',
   'O cliente envia a nota devolutiva do cartório. A OSG identifica a diferença na descrição da matrícula, elabora a AC corretiva (P2.08) e registra na Junta. Pode acontecer anos após o encerramento oficial do projeto.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', mapa_uuid('prc-osg-p2-08'), NOW(), NOW()),
  (mapa_uuid('cev-osg-doacao-condicionada'),
   'Doação condicionada ao Acordo de Quotistas',
   'Em projetos onde a doação P4.03 é condicionada à assinatura prévia do Acordo de Quotistas (P5.02), a discussão de cláusula sensível pode travar a agenda por meses, suspendendo o avanço do P4.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', mapa_uuid('prc-osg-p5-02'), NOW(), NOW()),
  (mapa_uuid('cev-osg-itcmd-quitacao'),
   'Quitação do ITCMD habilita averbação',
   'A AC reflexo da doação só pode ser averbada na Junta após a quitação do ITCMD pelo cliente. Enquanto o ITCMD não é quitado (incluindo cenários de contestação judicial), o registro da doação fica suspenso.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', mapa_uuid('prc-osg-p4-03'), NOW(), NOW()),
  (mapa_uuid('cev-osg-conselho-formado'),
   'Cliente decide formar conselho de administração',
   'A decisão de formar conselho aciona dois processos: P5.05 (Regimento Interno do Conselho) e P5.06 (AC reflexo na Participações). Em algumas Juntas Comerciais, a AC exige reescrever o contrato cláusula a cláusula.',
   '0523512c-f980-4236-8a7c-53e06c9c7a80', mapa_uuid('prc-osg-p5-05'), NOW(), NOW());

-- cascata_evento_etapas — etapas afetadas por cada cascata
INSERT INTO public.cascata_evento_etapas (id, evento_id, etapa_id, scenario, created_at)
VALUES
  -- Cev1: Nova matrícula → P1.02, P2.04, P2.05, P2.06, P3.03 anexo
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p1-02-01'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p1-02-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p1-02-04'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p1-04-03'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p2-04-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p2-05-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p2-06-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-nova-matricula'), mapa_uuid('etp-osg-p3-03-02'), 'AS-IS', NOW()),
  -- Cev2: Exigência cartorial → P2.08 inteiro
  (gen_random_uuid(), mapa_uuid('cev-osg-exigencia-cartorial'), mapa_uuid('etp-osg-p2-08-01'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-exigencia-cartorial'), mapa_uuid('etp-osg-p2-08-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-exigencia-cartorial'), mapa_uuid('etp-osg-p2-08-03'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-exigencia-cartorial'), mapa_uuid('etp-osg-p2-08-06'), 'AS-IS', NOW()),
  -- Cev3: Doação condicionada → bloqueia P4.03 ate P5.02 assinado
  (gen_random_uuid(), mapa_uuid('cev-osg-doacao-condicionada'), mapa_uuid('etp-osg-p5-02-07'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-doacao-condicionada'), mapa_uuid('etp-osg-p4-03-08'), 'AS-IS', NOW()),
  -- Cev4: ITCMD quitação → habilita averbação na Junta
  (gen_random_uuid(), mapa_uuid('cev-osg-itcmd-quitacao'), mapa_uuid('etp-osg-p4-03-04'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-itcmd-quitacao'), mapa_uuid('etp-osg-p4-03-09'), 'AS-IS', NOW()),
  -- Cev5: Conselho formado → P5.05 + P5.06
  (gen_random_uuid(), mapa_uuid('cev-osg-conselho-formado'), mapa_uuid('etp-osg-p5-05-01'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-conselho-formado'), mapa_uuid('etp-osg-p5-05-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-conselho-formado'), mapa_uuid('etp-osg-p5-06-02'), 'AS-IS', NOW()),
  (gen_random_uuid(), mapa_uuid('cev-osg-conselho-formado'), mapa_uuid('etp-osg-p5-06-05'), 'AS-IS', NOW());

-- ============================================================================
-- 21. PROJETO_JUSTIFICATIVAS — justificativa canônica por pilar
-- CHECK do enum 5: 'Economia / Eficiência','Automação','Qualidade','Comunicação','Compliance'
-- ============================================================================
INSERT INTO public.projeto_justificativas (id, projeto_id, justificativa, ordem, created_at)
VALUES
  -- P1 Patrimonial: DP central, eficiência operacional do pilar fundador
  (gen_random_uuid(), mapa_uuid('prj-osg-p1'), 'Economia / Eficiência', 1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p1'), 'Qualidade',             2, NOW()),
  -- P2 Societária: cascata de minutas → automação/padronização
  (gen_random_uuid(), mapa_uuid('prj-osg-p2'), 'Automação',             1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p2'), 'Qualidade',             2, NOW()),
  -- P3 Agrários: justificativa econômica do projeto (parceria 20/80)
  (gen_random_uuid(), mapa_uuid('prj-osg-p3'), 'Economia / Eficiência', 1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p3'), 'Compliance',            2, NOW()),
  -- P4 Sucessão: ITCMD, Reforma Tributária 2027, cláusulas restritivas
  (gen_random_uuid(), mapa_uuid('prj-osg-p4'), 'Compliance',            1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p4'), 'Qualidade',             2, NOW()),
  -- P5 Governança: instrumentos formais, profissionalização da gestão familiar
  (gen_random_uuid(), mapa_uuid('prj-osg-p5'), 'Qualidade',             1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p5'), 'Compliance',            2, NOW()),
  -- P6 Gestão: visibilidade, integração de canais, comunicação cliente
  (gen_random_uuid(), mapa_uuid('prj-osg-p6'), 'Comunicação',           1, NOW()),
  (gen_random_uuid(), mapa_uuid('prj-osg-p6'), 'Economia / Eficiência', 2, NOW());

COMMIT;
