-- =====================================================================
-- MAPA: encurta titulos de melhorias do cluster PSA OSG.
--
-- Escopo:
--   - Somente public.process_improvements.
--   - Somente linhas MAPA com cluster_id preenchido e id/cluster_id
--     explicitamente listados abaixo.
--   - Nao altera linhas legadas do Digital Rotina (cluster_id IS NULL).
--
-- Contexto:
--   A UI do MAPA usa process_improvements.improvement_description como
--   titulo. Estas 12 linhas tinham titulo + descricao no mesmo campo,
--   causando quebra visual nas listas/modais.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_expected int := 12;
  v_found int;
  v_wrong_scope int;
BEGIN
  WITH alvo(id, cluster_id, novo_titulo) AS (
    VALUES
      ('f071c25d-057a-fbf9-bd47-ce4a6020fbd1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Dashboard de Cascata'::text),
      ('b9b0a7fc-951e-e4ca-c1c0-db6f8e5bca6c'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'DP Inteligente'::text),
      ('83284d3d-081d-0042-2688-8f4227d43f03'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Checklist de Impedimentos'::text),
      ('80c4c313-7ba7-e489-5161-49aed052698a'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Protocolo OSG-Fiscal'::text),
      ('ed3eb98a-f997-1d06-6696-b20630359a73'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de Cláusulas'::text),
      ('bee0d19e-5b07-b9ef-a452-5ddaa9a41bac'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Integração Horas x OpenProject'::text),
      ('5a5e8f29-2a18-bb3e-6e6f-c2081b2d02f5'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Hub + Portal do Cliente'::text),
      ('3f7d6512-35ea-b60f-98f8-db914478723b'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Google Workspace Unificado'::text),
      ('a56f84dc-e2dc-ec89-bd8c-e734732f2478'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de ITCMD'::text),
      ('d9b9b188-a9aa-50af-35e2-e919fcfd6ad1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de Capital Social'::text),
      ('9a8b8d32-9956-6575-15fe-fe58ff9ed10e'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Geradores do OSG Work'::text),
      ('fa2b681a-1edd-6049-5fc2-5c9f647cb829'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de SOPs e Manuais'::text)
  )
  SELECT count(*) INTO v_found
  FROM public.process_improvements pi
  JOIN alvo ON alvo.id = pi.id AND alvo.cluster_id = pi.cluster_id
  WHERE pi.cluster_id IS NOT NULL;

  IF v_found <> v_expected THEN
    RAISE EXCEPTION 'MAPA melhorias: esperadas % linhas alvo no cluster PSA OSG, encontradas %', v_expected, v_found;
  END IF;

  WITH alvo(id, cluster_id, novo_titulo) AS (
    VALUES
      ('f071c25d-057a-fbf9-bd47-ce4a6020fbd1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Dashboard de Cascata'::text),
      ('b9b0a7fc-951e-e4ca-c1c0-db6f8e5bca6c'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'DP Inteligente'::text),
      ('83284d3d-081d-0042-2688-8f4227d43f03'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Checklist de Impedimentos'::text),
      ('80c4c313-7ba7-e489-5161-49aed052698a'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Protocolo OSG-Fiscal'::text),
      ('ed3eb98a-f997-1d06-6696-b20630359a73'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de Cláusulas'::text),
      ('bee0d19e-5b07-b9ef-a452-5ddaa9a41bac'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Integração Horas x OpenProject'::text),
      ('5a5e8f29-2a18-bb3e-6e6f-c2081b2d02f5'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Hub + Portal do Cliente'::text),
      ('3f7d6512-35ea-b60f-98f8-db914478723b'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Google Workspace Unificado'::text),
      ('a56f84dc-e2dc-ec89-bd8c-e734732f2478'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de ITCMD'::text),
      ('d9b9b188-a9aa-50af-35e2-e919fcfd6ad1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de Capital Social'::text),
      ('9a8b8d32-9956-6575-15fe-fe58ff9ed10e'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Geradores do OSG Work'::text),
      ('fa2b681a-1edd-6049-5fc2-5c9f647cb829'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de SOPs e Manuais'::text)
  )
  SELECT count(*) INTO v_wrong_scope
  FROM public.process_improvements pi
  JOIN alvo ON alvo.id = pi.id
  WHERE pi.cluster_id IS NULL OR pi.cluster_id <> alvo.cluster_id;

  IF v_wrong_scope <> 0 THEN
    RAISE EXCEPTION 'MAPA melhorias: abortado para evitar atualizar linha fora do cluster MAPA esperado';
  END IF;
END $$;

WITH alvo(id, cluster_id, novo_titulo) AS (
  VALUES
    ('f071c25d-057a-fbf9-bd47-ce4a6020fbd1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Dashboard de Cascata'::text),
    ('b9b0a7fc-951e-e4ca-c1c0-db6f8e5bca6c'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'DP Inteligente'::text),
    ('83284d3d-081d-0042-2688-8f4227d43f03'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Checklist de Impedimentos'::text),
    ('80c4c313-7ba7-e489-5161-49aed052698a'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Protocolo OSG-Fiscal'::text),
    ('ed3eb98a-f997-1d06-6696-b20630359a73'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de Cláusulas'::text),
    ('bee0d19e-5b07-b9ef-a452-5ddaa9a41bac'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Integração Horas x OpenProject'::text),
    ('5a5e8f29-2a18-bb3e-6e6f-c2081b2d02f5'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Hub + Portal do Cliente'::text),
    ('3f7d6512-35ea-b60f-98f8-db914478723b'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Google Workspace Unificado'::text),
    ('a56f84dc-e2dc-ec89-bd8c-e734732f2478'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de ITCMD'::text),
    ('d9b9b188-a9aa-50af-35e2-e919fcfd6ad1'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Calculadora de Capital Social'::text),
    ('9a8b8d32-9956-6575-15fe-fe58ff9ed10e'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Geradores do OSG Work'::text),
    ('fa2b681a-1edd-6049-5fc2-5c9f647cb829'::uuid, '0523512c-f980-4236-8a7c-53e06c9c7a80'::uuid, 'Biblioteca de SOPs e Manuais'::text)
)
UPDATE public.process_improvements pi
SET improvement_description = alvo.novo_titulo,
    updated_at = NOW()
FROM alvo
WHERE pi.id = alvo.id
  AND pi.cluster_id = alvo.cluster_id
  AND pi.cluster_id IS NOT NULL
  AND pi.improvement_description IS DISTINCT FROM alvo.novo_titulo;

DO $$
DECLARE
  v_long_titles int;
BEGIN
  SELECT count(*) INTO v_long_titles
  FROM public.process_improvements
  WHERE cluster_id IS NOT NULL
    AND char_length(coalesce(improvement_description, '')) > 80;

  IF v_long_titles <> 0 THEN
    RAISE EXCEPTION 'MAPA melhorias: ainda existem % titulos com mais de 80 caracteres', v_long_titles;
  END IF;
END $$;

COMMIT;
