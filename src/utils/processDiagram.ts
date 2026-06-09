import type {
  Processo,
  Etapa,
  Documento,
  Sistema,
  Responsavel,
  Gargalo,
  Melhoria,
  Projeto,
  DocRef,
  ResponsavelEtapa,
} from '../types';
import { melhoriaIdsDoGargalo } from './gargaloMelhorias';

export interface BuildDiagramInput {
  processo: Processo;
  etapas: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  projeto?: Projeto | null;
}

/**
 * Sanitiza um id para o Mermaid (sem hífen, espaços ou pontuação).
 * Mermaid v11 aceita underscore e alfanuméricos; outros viram "_".
 */
export function safeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

/** Escapa caracteres que confundem o parser do mermaid em labels entre aspas. */
export function safeLabel(s: string): string {
  return s
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\n/g, ' ');
}

function docKey(d: DocRef | string): string {
  return typeof d === 'string' ? d : (d.documentoId || d.nome);
}

/**
 * Gera código Mermaid (flowchart LR) com o processo no centro e seis
 * agrupamentos ao redor: Projeto, Documentos (entrada/saída), Responsáveis,
 * Sistemas, Gargalos e Melhorias — com cores semânticas por tipo.
 */
export function buildProcessDiagram(input: BuildDiagramInput): string {
  const { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto } = input;

  // ---------- Coleta ----------
  const docEntradaKeys = new Set<string>();
  const docSaidaKeys   = new Set<string>();
  const respKeys       = new Set<string>();
  const sisKeys        = new Set<string>();

  const collectResp = (arr: ResponsavelEtapa[] | undefined) => {
    (arr || []).forEach(r => {
      const key = r.responsavelId || r.nome;
      if (key) respKeys.add(key);
    });
  };

  for (const e of etapas) {
    (e.docsEntrada || []).forEach(d => docEntradaKeys.add(docKey(d)));
    (e.docsSaida   || []).forEach(d => docSaidaKeys.add(docKey(d)));
    collectResp(e.executadoPor);
    (e.sistemas || []).forEach(s => sisKeys.add(s));
  }

  const docsEntrada = Array.from(docEntradaKeys)
    .map(k => documentos.find(d => d.id === k || d.nome === k) || { id: k, nome: k })
    .filter(Boolean);
  const docsSaida = Array.from(docSaidaKeys)
    .map(k => documentos.find(d => d.id === k || d.nome === k) || { id: k, nome: k })
    .filter(Boolean);

  const resps = Array.from(respKeys)
    .map(k => responsaveis.find(r => r.id === k || r.name === k) || { id: k, name: k });

  const sis = Array.from(sisKeys)
    .map(k => sistemas.find(s => s.id === k || s.nome === k) || { id: k, nome: k });

  const procGargalos = gargalos.filter(g => (g.processos || []).includes(processo.id));

  // Vínculo gargalo↔melhoria via N:M `gargalo_melhorias` (g.melhorias[]).
  const melhoriaIdsViaGargalos = new Set(
    procGargalos.flatMap(g => melhoriaIdsDoGargalo(g))
  );
  const procMelhorias = melhorias.filter(
    m =>
      (m.processos || []).includes(processo.id) ||
      melhoriaIdsViaGargalos.has(m.id)
  );

  // ---------- IDs ----------
  const pId = safeId('P', processo.id);
  const projId = projeto ? safeId('PROJ', projeto.id) : null;

  const idDocEntrada = (d: { id?: string; nome: string }) => safeId('DE', d.id || d.nome);
  const idDocSaida   = (d: { id?: string; nome: string }) => safeId('DS', d.id || d.nome);
  const idResp       = (r: { id?: string; name: string }) => safeId('R',  r.id || r.name);
  const idSis        = (s: { id?: string; nome: string }) => safeId('S',  s.id || s.nome);
  const idGar        = (g: Gargalo) => safeId('G', g.id);
  const idMel        = (m: Melhoria) => safeId('M', m.id);

  // ---------- Geração ----------
  const lines: string[] = [];
  lines.push('%% Diagrama do Processo — gerado pelo MAPA');
  lines.push('flowchart LR');
  lines.push('  %% ===== nós =====');

  // Processo central
  lines.push(`  ${pId}["<b>${safeLabel(processo.name)}</b><br/><i>Processo</i>"]:::processo`);

  // Projeto
  if (projeto && projId) {
    lines.push(`  ${projId}["${safeLabel(projeto.name)}<br/><i>Projeto</i>"]:::projeto`);
  }

  // Subgraphs
  const renderSubgraph = (
    sgId: string,
    title: string,
    items: string[],
  ) => {
    if (items.length === 0) return;
    lines.push(`  subgraph ${sgId}["${safeLabel(title)}"]`);
    lines.push('    direction TB');
    items.forEach(it => lines.push(`    ${it}`));
    lines.push('  end');
  };

  renderSubgraph(
    'SG_DE',
    `📥 Documentos · Entrada (${docsEntrada.length})`,
    docsEntrada.map(d => `${idDocEntrada(d)}["${safeLabel(d.nome)}"]:::documento`)
  );
  renderSubgraph(
    'SG_DS',
    `📤 Documentos · Saída (${docsSaida.length})`,
    docsSaida.map(d => `${idDocSaida(d)}["${safeLabel(d.nome)}"]:::documento`)
  );
  renderSubgraph(
    'SG_R',
    `👥 Responsáveis (${resps.length})`,
    resps.map(r => `${idResp(r)}["${safeLabel(r.name)}"]:::responsavel`)
  );
  renderSubgraph(
    'SG_S',
    `💻 Sistemas (${sis.length})`,
    sis.map(s => `${idSis(s)}["${safeLabel(s.nome)}"]:::sistema`)
  );
  renderSubgraph(
    'SG_G',
    `⚠️ Gargalos (${procGargalos.length})`,
    procGargalos.map(g => `${idGar(g)}["${safeLabel(g.nome)}"]:::gargalo`)
  );
  renderSubgraph(
    'SG_M',
    `⚡ Melhorias (${procMelhorias.length})`,
    procMelhorias.map(m => `${idMel(m)}["${safeLabel(m.improvement_description)}"]:::melhoria`)
  );

  // ---------- Ligações ----------
  lines.push('  %% ===== ligações =====');

  if (projId) lines.push(`  ${projId} ==> ${pId}`);

  docsEntrada.forEach(d => lines.push(`  ${idDocEntrada(d)} --> ${pId}`));
  docsSaida.forEach(d => lines.push(`  ${pId} --> ${idDocSaida(d)}`));
  resps.forEach(r => lines.push(`  ${idResp(r)} -.-> ${pId}`));
  sis.forEach(s => lines.push(`  ${pId} -.-> ${idSis(s)}`));
  procGargalos.forEach(g => lines.push(`  ${idGar(g)} -. impacta .-> ${pId}`));

  // Melhorias: linkam ao processo e aos gargalos resolvidos (via gargalo_melhorias N:M).
  procMelhorias.forEach(m => {
    lines.push(`  ${idMel(m)} -. resolve .-> ${pId}`);
    procGargalos
      .filter(g => melhoriaIdsDoGargalo(g).includes(m.id))
      .forEach(g => {
        lines.push(`  ${idMel(m)} ==> ${idGar(g)}`);
      });
  });

  // ---------- Estilos ----------
  lines.push('  %% ===== estilos =====');
  lines.push('  classDef processo    fill:#0f172a,color:#fff,stroke:#0d9488,stroke-width:3px,font-weight:bold');
  lines.push('  classDef projeto     fill:#0d9488,color:#fff,stroke:#0f766e,stroke-width:2px');
  lines.push('  classDef documento   fill:#fef3c7,color:#78350f,stroke:#f59e0b,stroke-width:1px');
  lines.push('  classDef responsavel fill:#dbeafe,color:#1e3a8a,stroke:#3b82f6,stroke-width:1px');
  lines.push('  classDef sistema     fill:#ede9fe,color:#4c1d95,stroke:#8b5cf6,stroke-width:1px');
  lines.push('  classDef gargalo     fill:#fee2e2,color:#7f1d1d,stroke:#dc2626,stroke-width:1px');
  lines.push('  classDef melhoria    fill:#dcfce7,color:#14532d,stroke:#16a34a,stroke-width:1px');

  return lines.join('\n');
}
