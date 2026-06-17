// Extração determinística de palavras-chave para o Sumário Executivo do
// SOP Comparativo. Mesma entrada → mesma saída na mesma ordem.
//
// Prioridade (limite 7 tags):
//   1. Pilares do projeto (justificativas, ordenadas pela ordem canônica)
//   2. Domínio fiscal/OSG detectado no texto do processo (mais específico vence)
//   3. Categorização heurística dos gargalos (auditoria, planilha, manual, ...)
//
// É uma função pura — não toca em estado, não usa Date, sem random.

import type {
  Projeto, Processo, Gargalo, JustificativaProjeto,
} from '../types';
import { JUSTIFICATIVAS_PROJETO } from '../types';

// ===== Domínio detectável a partir do texto do processo =====
//
// Cada entrada tem: aliases (case-insensitive, word-boundary) → tag exibida.
// A primeira match na ordem vence; entradas mais específicas vêm antes das
// genéricas (PIS/COFINS antes de PIS e COFINS separados).
const DOMINIO_FISCAL: { regex: RegExp; tag: string }[] = [
  // Obrigações acessórias (mais específicas — vêm primeiro)
  { regex: /\bperdcomp\b/i, tag: 'PERDCOMP' },
  { regex: /\bdctf\s*web\b/i, tag: 'DCTFWeb' },
  { regex: /\bdctf\b/i, tag: 'DCTF' },
  { regex: /\befd[-\s]*contribuiç(ão|ões)\b/i, tag: 'EFD-Contribuições' },
  { regex: /\befd[-\s]*icms\b/i, tag: 'EFD-ICMS' },
  { regex: /\befd[-\s]*ipi\b/i, tag: 'EFD-IPI' },
  { regex: /\bsped\b/i, tag: 'SPED' },
  { regex: /\becf\b/i, tag: 'ECF' },
  { regex: /\becd\b/i, tag: 'ECD' },
  { regex: /\bgfip\b/i, tag: 'GFIP' },
  { regex: /\bdarf\b/i, tag: 'DARF' },
  { regex: /\bdirf\b/i, tag: 'DIRF' },
  { regex: /\bgia\b/i, tag: 'GIA' },

  // Tributos federais
  { regex: /\bpis\s*\/\s*cofins\b/i, tag: 'PIS/COFINS' },
  { regex: /\bpis\b/i, tag: 'PIS' },
  { regex: /\bcofins\b/i, tag: 'COFINS' },
  { regex: /\birpj\b/i, tag: 'IRPJ' },
  { regex: /\bcsll\b/i, tag: 'CSLL' },
  { regex: /\bipi\b/i, tag: 'IPI' },
  { regex: /\biof\b/i, tag: 'IOF' },
  { regex: /\birrf\b/i, tag: 'IRRF' },
  { regex: /\bcide\b/i, tag: 'CIDE' },

  // Tributos estaduais/municipais
  { regex: /\bicms\b/i, tag: 'ICMS' },
  { regex: /\bissqn\b/i, tag: 'ISS' },
  { regex: /\biss\b/i, tag: 'ISS' },

  // Trabalhistas/previdenciários
  { regex: /\binss\b/i, tag: 'INSS' },
  { regex: /\bfgts\b/i, tag: 'FGTS' },

  // Domínio OSG (Organização Societária e Sucessória)
  { regex: /\bholding\b/i, tag: 'Holding' },
  { regex: /\bsucess(ão|ório|oria)\b/i, tag: 'Sucessão' },
  { regex: /\binvent[áa]rio\b/i, tag: 'Inventário' },
  { regex: /\busufruto\b/i, tag: 'Usufruto' },
  { regex: /\bdoaç(ão|ões)\b/i, tag: 'Doação' },
  { regex: /\bpatrimoni(al|ais)\b/i, tag: 'Patrimonial' },
  { regex: /\bsociet(ária|árias|ário|ários)\b/i, tag: 'Societária' },
  { regex: /\bgovernanç(a|as)\b/i, tag: 'Governança' },
  { regex: /\barrendamento\b/i, tag: 'Arrendamento' },
  { regex: /\bparceria\s+rural\b/i, tag: 'Parceria rural' },
];

// ===== Heurísticas de categorização de gargalo =====
//
// Cada gargalo é classificado pela primeira regra que casa em nome+descricao.
// Mais específico vem antes do genérico ("controle fragmentado" antes de
// "controle"; "excel" antes de "planilha" só para garantir match consistente).
const GARGALO_HEURISTICAS: { regex: RegExp; tag: string }[] = [
  { regex: /(auditoria|hist[óo]rico|rastreabilid)/i, tag: 'Auditoria & Histórico' },
  { regex: /(planilha|excel)/i, tag: 'Eliminação de planilha' },
  { regex: /(duplicidade|duplicad)/i, tag: 'Anti-duplicidade' },
  { regex: /(manual|retrabalho)/i, tag: 'Redução de trabalho manual' },
  { regex: /(comunicaç(ão|ões)|cliente|dashboard|autoatendim)/i, tag: 'Comunicação com cliente' },
  { regex: /(compliance|conformid|regulat[óo]ri)/i, tag: 'Compliance' },
  { regex: /(fragment|disperso|silos?)/i, tag: 'Centralização de dados' },
];

const MAX_TAGS = 7;

export function extractKeywords(
  projeto: Projeto | null,
  processo: Processo,
  gargalos: Gargalo[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string) => {
    if (!tag || seen.has(tag) || result.length >= MAX_TAGS) return;
    seen.add(tag);
    result.push(tag);
  };

  // ---- 1. Pilares do projeto (ordem canônica de JUSTIFICATIVAS_PROJETO) ----
  if (projeto?.justificativas?.length) {
    const setProj = new Set<JustificativaProjeto>(projeto.justificativas);
    for (const j of JUSTIFICATIVAS_PROJETO) {
      if (setProj.has(j.value)) push(j.label);
    }
  }

  // ---- 2. Domínio fiscal/OSG detectado no texto do processo ----
  const haystack = [
    processo.name,
    processo.description,
    processo.deliverable,
  ].filter(Boolean).join(' ');
  for (const { regex, tag } of DOMINIO_FISCAL) {
    if (regex.test(haystack)) push(tag);
    if (result.length >= MAX_TAGS) break;
  }

  // ---- 3. Categorização dos gargalos ----
  // Cada heurística vira no máximo UMA tag (mesmo que vários gargalos batam),
  // mantendo a ordem das heurísticas em GARGALO_HEURISTICAS.
  if (result.length < MAX_TAGS) {
    const textosGargalos = gargalos.map(g => `${g.nome} ${g.descricao || ''}`).join(' ');
    for (const { regex, tag } of GARGALO_HEURISTICAS) {
      if (regex.test(textosGargalos)) push(tag);
      if (result.length >= MAX_TAGS) break;
    }
  }

  return result;
}
