// Mass-rename de campos PT camelCase → EN snake_case nos arquivos do MAPA.
// Apenas renames NÃO-AMBÍGUOS (cada campo tem 1 destino independente do tipo).
//
// Campos ambíguos (nome/descricao/cluster/ordem) ficam de fora — corrigidos
// manualmente após o script.

import { readFileSync, writeFileSync } from 'node:fs';
import { Glob } from 'bun';

// Pares [PT camelCase, EN snake_case]. Word-boundary garante só identifiers.
const RENAMES: [string, string][] = [
  // Etapa / Snapshot.process_id
  ['processoId',                    'process_id'],
  // Processo.project_id
  ['projetoId',                     'project_id'],
  // Responsavel
  ['custoHora',                     'hourly_rate'],
  // Gargalo
  ['horasGastas',                   'horas_gastas'],
  ['horasImplementacao',            'horas_implementacao'],
  ['taxaOcorrencia',                'taxa_ocorrencia'],
  ['taxaCapturaAposMelhoria',       'taxa_captura_apos_melhoria'],
  ['melhoriaId',                    'melhoria_id'],
  // Snapshot
  ['snapshotEm',                    'snapshot_at'],
  ['custoAnual',                    'annual_cost'],
  ['horasAnual',                    'annual_hours'],
  ['economiaAnual',                 'annual_savings'],
  ['roiPercentual',                 'roi_percent'],
  ['paybackMeses',                  'payback_months'],
  ['horasLiberadas',                'hours_freed'],
  ['investimento',                  'investment'],
  ['criadoPor',                     'created_by'],
  // Processo
  ['statusAvaliacao',               'evaluation_status'],
  ['horasTreinamento',              'training_hours'],
  ['mapeadoEm',                     'mapped_at'],
  ['entregavel',                    'deliverable'],
  ['complexidade',                  'complexity_level'],
  ['frequencia',                    'frequency'],
  // Etapa (process_stages)
  ['volumePorProcesso',             'volume_per_process'],
  ['taxaErros',                     'error_rate'],
  ['taxaRetrabalho',                'rework_rate'],
  ['custoErro',                     'error_cost'],
  ['volumeErros',                   'error_volume'],
  ['leadTimeDias',                  'lead_time_days'],
  ['execucao',                      'execution'],
  // Sistema (PT-native, mas snake_case do DB)
  ['custoLicencaMensal',            'custo_licenca_mensal'],
  ['custoVariavelPorUso',           'custo_variavel_por_uso'],
  ['custoPorOperacao',              'custo_por_operacao'],
  ['custoSetup',                    'custo_setup'],
  ['tipoCusto',                     'tipo_custo'],
  ['obsLicenca',                    'obs_licenca'],
  ['obsVariavel',                   'obs_variavel'],
  ['obsCustoPorOperacao',           'obs_custo_por_operacao'],
  // Documento
  ['tempoMinutos',                  'tempo_minutos'],
  ['estruturaEntrada',              'estrutura_entrada'],
  // Projeto
  ['projetosPorAno',                'projects_per_year'],
  ['dataInicio',                    'start_date'],
  ['dataFim',                       'end_date'],
];

const glob = new Glob('src/**/*.{ts,tsx}');
const files = [...glob.scanSync('.')].filter(
  (f) =>
    !f.includes('src/types.ts') &&                 // já alinhado
    !f.includes('src/utils/mapa/') &&              // já deletado
    !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && // testes não usam campos
    !f.includes('src/test/'),                       // helpers de teste
);

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let next = original;
  let fileReplacements = 0;
  for (const [from, to] of RENAMES) {
    const re = new RegExp(`\\b${from}\\b`, 'g');
    next = next.replace(re, () => {
      fileReplacements++;
      return to;
    });
  }
  if (fileReplacements > 0) {
    writeFileSync(file, next);
    console.log(`${file}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
    filesChanged++;
  }
}

console.log(`\nTotal: ${totalReplacements} replacements em ${filesChanged} arquivos.`);
