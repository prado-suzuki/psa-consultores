// Cascata — geração do diagrama Mermaid do simulador de Eventos de Disrupção.
// Renderiza um flowchart LR com 1 subgraph por Processo e 1 nó por etapa
// vinculada ao evento. As etapas marcadas como retrabalho recebem a classDef
// `retrabalho`; o simulador mutaciona o SVG pós-render para ligar `.is-firing`
// nas etapas conforme a animação avança.
//
// Os IDs dos nós são DETERMINÍSTICOS (`E_<safeId(etapa.id)__cenario>`) — a
// camada de animação precisa achá-los pelo data attribute para acionar a
// transição visual.

import type { CascataEventoEtapaRef, CenarioEtapa } from '../types';

export interface EtapaFlow {
  etapaId: string;
  cenario: CenarioEtapa;
  etapaNome: string;
  etapaOrdem?: number;
  processoId: string;
  processoNome: string;
  processoOrdem?: number;
  projetoNome?: string;
}

function safeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9_]+/g, '_')}`;
}

function safeLabel(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

export function etapaNodeId(etapaId: string, cenario: CenarioEtapa): string {
  return safeId('E', `${etapaId}__${cenario === 'TO-BE' ? 'TOBE' : 'ASIS'}`);
}

export interface BuildEventoDiagramOpts {
  eventoNome: string;
  processoRaizId?: string | null;
  etapasMarcadas: CascataEventoEtapaRef[];
}

/**
 * Constrói o diagrama do evento. Cada etapa marcada vira um nó (com classDef
 * `retrabalho`); processos viram subgraphs; setas internas no processo seguem
 * a ordem das etapas; setas entre processos saem do último nó do anterior para
 * o primeiro do seguinte (ordem natural por `processoOrdem`). O Mermaid recebe
 * `class … retrabalho` para o estilo base; a animação é feita no SVG.
 */
export function buildEventoDiagram({
  eventoNome,
  etapasMarcadas,
}: BuildEventoDiagramOpts): string {
  if (etapasMarcadas.length === 0) {
    return [
      'flowchart LR',
      `  semDados["Nenhuma etapa marcada como retrabalho neste evento."]`,
      '  classDef vazio fill:#f8fafc,stroke:#cbd5e1,color:#64748b,stroke-dasharray:4 4',
      '  class semDados vazio',
    ].join('\n');
  }

  type Bucket = {
    processoId: string;
    processoNome: string;
    processoOrdem: number;
    etapas: CascataEventoEtapaRef[];
  };

  const byProcesso = new Map<string, Bucket>();
  for (const e of etapasMarcadas) {
    const key = e.processoId || 'sem-processo';
    if (!byProcesso.has(key)) {
      byProcesso.set(key, {
        processoId: key,
        processoNome: e.processoNome || key,
        processoOrdem: 0,
        etapas: [],
      });
    }
    byProcesso.get(key)!.etapas.push(e);
  }

  const processos = Array.from(byProcesso.values()).sort(
    (a, b) => a.processoNome.localeCompare(b.processoNome)
  );
  for (const p of processos) {
    p.etapas.sort((x, y) => (x.etapaOrdem ?? 0) - (y.etapaOrdem ?? 0));
  }

  const lines: string[] = [];
  lines.push(`%% Simulador de Cascata — Evento: ${safeLabel(eventoNome)}`);
  lines.push('flowchart LR');

  // Subgraphs por processo
  const firstNodeOfProc = new Map<string, string>();
  const lastNodeOfProc = new Map<string, string>();
  for (const p of processos) {
    const sgId = safeId('SG', p.processoId);
    lines.push(`  subgraph ${sgId}["${safeLabel(p.processoNome)}"]`);
    lines.push('    direction LR');
    for (const e of p.etapas) {
      const nid = etapaNodeId(e.etapaId, e.cenario);
      const tag = e.cenario === 'TO-BE' ? ' · TO-BE' : '';
      lines.push(`    ${nid}["${safeLabel(e.etapaNome || e.etapaId)}${tag}"]:::retrabalho`);
    }
    // Setas internas: etapa N → etapa N+1
    for (let i = 0; i < p.etapas.length - 1; i++) {
      const a = etapaNodeId(p.etapas[i].etapaId, p.etapas[i].cenario);
      const b = etapaNodeId(p.etapas[i + 1].etapaId, p.etapas[i + 1].cenario);
      lines.push(`    ${a} --> ${b}`);
    }
    lines.push('  end');
    if (p.etapas.length > 0) {
      firstNodeOfProc.set(p.processoId, etapaNodeId(p.etapas[0].etapaId, p.etapas[0].cenario));
      lastNodeOfProc.set(p.processoId, etapaNodeId(p.etapas[p.etapas.length - 1].etapaId, p.etapas[p.etapas.length - 1].cenario));
    }
  }

  // Setas entre processos: último do anterior → primeiro do seguinte
  for (let i = 0; i < processos.length - 1; i++) {
    const prev = processos[i].processoId;
    const next = processos[i + 1].processoId;
    const a = lastNodeOfProc.get(prev);
    const b = firstNodeOfProc.get(next);
    if (a && b) lines.push(`  ${a} -.-> ${b}`);
  }

  // Estilos
  lines.push('  classDef retrabalho fill:#fef2f2,stroke:#dc2626,color:#7f1d1d,stroke-width:2px');
  return lines.join('\n');
}
