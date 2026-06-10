// Gera migração TO-BE para as 50 etapas AS-IS do PSA Consultores.
// Para cada AS-IS, cria row TO-BE (mesmo id, scenario='TO-BE') + junções
// reduzidas (horas / rework / error / lead_time menores conforme a ferramenta).
import fs from 'fs';

const CL = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3';
const OUT = 'supabase/migrations/20260612100000_psa_consultores_tobe.sql';
const stages = JSON.parse(fs.readFileSync('.discovery_tmp/stages_full.json', 'utf8'))
  .filter(s => s.processes?.cluster_id === CL);

const q = s => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

// Redução por código de processo (ferramenta que ataca):
// As ferramentas digitalizam quebra/consulta/apuração — reduções agressivas (70-85%).
// Processos de gestão/transversal reduzem menos (40-60%).
const REDUCTION = {
  // Automação SPED — redução agressiva
  'PROC-001': 0.80, 'PROC-GER-350': 0.80, 'PROC-GER-030': 0.80, 'PROC-GER-294': 0.80,
  'PROC-GER-249': 0.80, 'PROC-GER-002': 0.80, 'PROC-GER-313': 0.80, 'PROC-GER-221': 0.75,
  'PROC-FISCAL-005': 0.80,  // Download XML em lote
  // Consultas em lote
  'PROC-FISCAL-001': 0.85, 'PROC-FISCAL-007': 0.85, 'PROC-GER-938': 0.85, 'PROC-GER-719': 0.80,
  // PIS/COFINS + DIFAL — redução média-alta
  'PROC-FISCAL-003': 0.65, 'PROC-FISCAL-004': 0.70,
  // PERDCOMP
  'PROC-FISCAL-002': 0.65,
  // Templates de Papéis — redução média
  'PROC-FIXO-009': 0.55, 'PROC-PAD-002': 0.55,
  'PROC-GER-603': 0.55, 'PROC-GER-704': 0.55, 'PROC-GER-167': 0.55, 'PROC-GER-279': 0.55,
  // Gestão de projetos / Dashboards — redução de overhead, retrabalho
  'PROC-002': 0.45, 'PROC-BI-001': 0.50, 'PROC-BI-002': 0.50,
  // Onboarding / planejamento
  'PROC-TRA-001': 0.50, 'PROC-FISCAL-008': 0.55,
};
const red = (code) => REDUCTION[code] ?? 0.60;
const exec = (code) => {
  // Após melhoria, maioria vira automática; templates viram semi-automática.
  if (['PROC-FIXO-009', 'PROC-PAD-002', 'PROC-002', 'PROC-BI-001', 'PROC-BI-002', 'PROC-TRA-001'].includes(code)
   || code.startsWith('PROC-GER-6') || code.startsWith('PROC-GER-7') || code.startsWith('PROC-GER-16') || code.startsWith('PROC-GER-27'))
    return 'semi_automatica';
  return 'automatica';
};

const L = [];
const p = s => L.push(s);
p(`-- ============================================================================
-- 20260612100000_psa_consultores_tobe.sql · Cenário TO-BE das 50 etapas PSA
-- ----------------------------------------------------------------------------
-- Cria a row TO-BE (mesmo id, scenario='TO-BE', stage_as_is_id=id) para cada
-- etapa AS-IS do cluster PSA Consultores. Sem isso o calcularRoi (Dashboard
-- ROI + Setor Evolução) calcula economia=0 (não há cenário "Como Ficou").
--
-- Redução de horas/rework/error/lead_time por código de processo conforme a
-- ferramenta que ataca (60-85%). Junções etapa_responsaveis/sistemas/documentos
-- são replicadas com horas reduzidas (sistemas e documentos iguais).
--
-- Idempotente: UPSERT em (id, scenario).
-- ============================================================================

BEGIN;
`);

let nStages = 0, nResp = 0, nSis = 0, nDoc = 0;
for (const e of stages) {
  const code = e.processes.code;
  const r = red(code);
  const novaExec = exec(code);
  const newRework = +(((e.rework_rate ?? 0) * (1 - r)).toFixed(4));
  const newError = +(((e.error_rate ?? 0) * (1 - r)).toFixed(4));
  const newLead = e.lead_time_days != null ? Math.max(1, Math.round(e.lead_time_days * (1 - r))) : null;

  // 1. UPSERT row TO-BE
  p(`-- ${code}#${e.stage_order} ${e.name} (red ${Math.round(r*100)}%)`);
  p(`INSERT INTO public.process_stages (id, scenario, process_id, stage_as_is_id, name, description, execution, frequency, volume, stage_order, lead_time_days, volume_per_process, rework_rate, error_rate, error_cost, error_volume)
VALUES (${q(e.id)}, 'TO-BE', ${q(e.process_id)}, ${q(e.id)}, ${q(e.name)}, ${q(e.description)}, ${q(novaExec)}, ${q(e.frequency)}, ${q(e.volume)}, ${e.stage_order}, ${newLead ?? 'NULL'}, ${e.volume_per_process ?? 'NULL'}, ${newRework}, ${newError}, ${e.error_cost ?? 'NULL'}, ${e.error_volume ?? 'NULL'})
ON CONFLICT (id, scenario) DO UPDATE SET stage_as_is_id=EXCLUDED.stage_as_is_id, execution=EXCLUDED.execution, lead_time_days=EXCLUDED.lead_time_days, rework_rate=EXCLUDED.rework_rate, error_rate=EXCLUDED.error_rate, updated_at=NOW();`);
  nStages++;

  // 2. etapa_responsaveis TO-BE (com horas reduzidas)
  for (const er of (e.etapa_responsaveis || [])) {
    const newHoras = +(((er.horas || 0) * (1 - r)).toFixed(2));
    p(`INSERT INTO public.etapa_responsaveis (id, etapa_id, scenario, responsavel_id, papel, horas, created_at) VALUES (gen_random_uuid(), ${q(e.id)}, 'TO-BE', ${q(er.responsavel_id)}, ${q(er.papel)}, ${newHoras}, NOW()) ON CONFLICT (etapa_id, scenario, responsavel_id, papel) DO UPDATE SET horas=EXCLUDED.horas;`);
    nResp++;
  }

  // 3. etapa_sistemas TO-BE (mesmos sistemas)
  for (const es of (e.etapa_sistemas || [])) {
    p(`INSERT INTO public.etapa_sistemas (id, etapa_id, scenario, sistema_id, rateio, created_at) VALUES (gen_random_uuid(), ${q(e.id)}, 'TO-BE', ${q(es.sistema_id)}, 100, NOW()) ON CONFLICT (etapa_id, scenario, sistema_id) DO NOTHING;`);
    nSis++;
  }

  // 4. etapa_documentos TO-BE (mesmos docs)
  for (const ed of (e.etapa_documentos || [])) {
    p(`INSERT INTO public.etapa_documentos (id, etapa_id, scenario, documento_id, sentido, volume, created_at) VALUES (gen_random_uuid(), ${q(e.id)}, 'TO-BE', ${q(ed.documento_id)}, ${q(ed.sentido)}, ${ed.volume ?? 'NULL'}, NOW()) ON CONFLICT (etapa_id, scenario, documento_id, sentido) DO NOTHING;`);
    nDoc++;
  }
  p('');
}

p(`-- Validação
DO $v$
DECLARE
  v_tobe int; v_asis int;
BEGIN
  SELECT count(*) INTO v_tobe FROM public.process_stages ps
    JOIN public.processes p ON p.id=ps.process_id
    WHERE p.cluster_id='${CL}' AND ps.scenario='TO-BE';
  SELECT count(*) INTO v_asis FROM public.process_stages ps
    JOIN public.processes p ON p.id=ps.process_id
    WHERE p.cluster_id='${CL}' AND ps.scenario='AS-IS';
  RAISE NOTICE 'PSA Consultores TO-BE etapas: % (AS-IS: %)', v_tobe, v_asis;
  IF v_tobe <> v_asis THEN RAISE EXCEPTION 'TO-BE (%) ≠ AS-IS (%)', v_tobe, v_asis; END IF;
END $v$;

COMMIT;
`);

fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log('WROTE', OUT, '| stages:', nStages, 'resp:', nResp, 'sis:', nSis, 'doc:', nDoc);
