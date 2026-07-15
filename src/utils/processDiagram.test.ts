// Trava o modelo do diagrama por-processo: uma SERPENTINA de cards ricos (um por
// etapa, detalhe embutido). O fluxo quebra em linhas (LR/RL alternados) e vira um
// esquema 2D. Garante que: (a) o modelo antigo de entidades (subgraphs de tipo +
// arestas de relação -.->) não voltou; (b) linhas empilham por link ENTRE
// subgraphs (~~~), nunca por aresta nó→nó (que colapsaria a serpentina).

import { describe, it, expect } from 'vitest';
import { buildProcessDiagram, buildProjectDiagram } from './processDiagram';
import type { Processo, Etapa, Gargalo, Projeto } from '../types';

const processo = { id: 'P1', name: 'DP Inicial' } as unknown as Processo;

function etapa(id: string, ordem: number, extra: Record<string, unknown> = {}) {
  return {
    id, process_id: 'P1', name: `Etapa ${ordem}`, stage_order: ordem,
    executadoPor: [], sistemas: [], docsEntrada: [], docsSaida: [], gargalos: [],
    ...extra,
  };
}

// 2 etapas ⇒ 1 linha só (base p/ conteúdo do card e gargalo).
const etapas = [
  etapa('E1', 1, {
    name: 'Coleta',
    executadoPor: [{ responsavelId: 'R1', nome: 'João' }, { responsavelId: 'R2', nome: 'Maria' }],
    sistemas: ['Docbox'],
    docsEntrada: [{ documentoId: 'D1', nome: 'Matrícula' }],
  }),
  etapa('E2', 2, {
    name: 'Regularização',
    executadoPor: [{ responsavelId: 'R1', nome: 'João' }],
    docsSaida: [{ documentoId: 'D2', nome: 'Matrícula atualizada' }],
    gargalos: ['G1'],
  }),
] as unknown as Etapa[];

const gargalos = [{ id: 'G1', nome: 'Retrabalho' }] as unknown as Gargalo[];
const base = { processo, etapas, documentos: [], sistemas: [], responsaveis: [], gargalos, melhorias: [] } as Parameters<typeof buildProcessDiagram>[0];

describe('buildProcessDiagram — serpentina de cards ricos', () => {
  it('gera flowchart TB com card por etapa e fluxo dentro da linha', () => {
    const code = buildProcessDiagram(base);
    expect(code).toContain('flowchart TB');
    expect(code).toContain(':::etapa');
    expect(code).toContain('-->'); // fluxo dentro da linha
    expect(code).toContain('**1 · Coleta**');
    expect(code).toContain('**2 · Regularização**');
  });

  it('card enxuto: só título + responsáveis em texto puro (sem emojis/sistemas/docs)', () => {
    const code = buildProcessDiagram(base);
    expect(code).toContain('João · Maria');
    // Sem emojis.
    expect(code).not.toContain('👤');
    expect(code).not.toContain('💻');
    expect(code).not.toContain('📄');
    // Documentos e sistemas ficam FORA do diagrama.
    expect(code).not.toContain('Docbox');
    expect(code).not.toContain('Matrícula');
  });

  it('NÃO usa mais o modelo de entidades (nada de :::documento/sistema, -.->)', () => {
    const code = buildProcessDiagram(base);
    expect(code).not.toContain(':::documento');
    expect(code).not.toContain(':::sistema');
    expect(code).not.toContain(':::responsavel');
    expect(code).not.toContain('-.->');
  });

  it('As-Is: etapa com gargalo ganha o acento de borda (sem linha de texto ⚠)', () => {
    const code = buildProcessDiagram(base);
    expect(code).toContain(':::etapaGargalo');
    expect(code).not.toContain('⚠'); // gargalo é só acento visual, não texto
  });

  it('To-Be (ficou): gargalos são suprimidos (considerados resolvidos)', () => {
    const code = buildProcessDiagram({ ...base, mode: 'ficou' });
    expect(code).not.toContain(':::etapaGargalo');
  });

  it('corta lista longa de responsáveis com "+N"', () => {
    const muitos = [etapa('E1', 1, {
      name: 'X',
      executadoPor: [1, 2, 3, 4, 5].map(i => ({ responsavelId: `R${i}`, nome: `N${i}` })),
    })] as unknown as Etapa[];
    const code = buildProcessDiagram({ ...base, etapas: muitos });
    expect(code).toContain('N1 · N2 · N3 · N4 +1');
  });

  it('muitas etapas ⇒ serpentina: linhas em subgraphs LR/RL ligadas entre si', () => {
    // 5 etapas ⇒ cols=4 ⇒ 2 linhas (4 + 1).
    const cinco = [1, 2, 3, 4, 5].map(i => etapa(`E${i}`, i)) as unknown as Etapa[];
    const code = buildProcessDiagram({ ...base, etapas: cinco });
    expect(code).toContain('subgraph');
    expect(code).toContain('direction LR');        // linha par
    expect(code).toContain('direction RL');        // linha ímpar (dobra)
    expect(code).toContain('ROW_P_0 ~~~ ROW_P_1');  // empilha (invisível, entre subgraphs)
    expect(code).toContain('fill:none,stroke:none'); // caixas de linha invisíveis
    expect(code).toContain('%% FOLD');              // metadado da dobra (viewer desenha a seta)
    expect(code).toContain('**5 · Etapa 5**');
  });

  it('emite FOLD ligando o último card de uma linha ao primeiro da próxima', () => {
    // 5 etapas ⇒ cols=4 ⇒ linha0: E1..E4, linha1: E5 ⇒ dobra E4→E5.
    const cinco = [1, 2, 3, 4, 5].map(i => etapa(`E${i}`, i)) as unknown as Etapa[];
    const code = buildProcessDiagram({ ...base, etapas: cinco });
    expect(code).toContain('%% FOLD E_P_E4 E_P_E5');
  });

  it('processo sem etapas → card vazio', () => {
    const code = buildProcessDiagram({ ...base, etapas: [] });
    expect(code).toContain(':::vazio');
    expect(code).toContain('sem etapas');
  });
});

describe('buildProjectDiagram — lista vertical de processos (consolidado)', () => {
  const projeto = { id: 'PRJ', name: 'Gestão' } as unknown as Projeto;
  const p1 = { id: 'P1', name: 'Proc A', order_index: 0 } as unknown as Processo;
  const p2 = { id: 'P2', name: 'Proc B', order_index: 1 } as unknown as Processo;
  // Etapas presentes no input DE PROPÓSITO: o consolidado deve IGNORÁ-las.
  const etapasPorProcesso = new Map<string, Etapa[]>([
    ['P1', [
      etapa('E1', 1, { name: 'Coleta', executadoPor: [{ responsavelId: 'R1', nome: 'João' }] }),
      etapa('E2', 2, { name: 'Triagem' }),
    ] as unknown as Etapa[]],
    ['P2', [etapa('E3', 1, { name: 'Revisão', gargalos: ['G1'] })] as unknown as Etapa[]],
  ]);
  const projInput = {
    projeto, processos: [p2, p1], etapasPorProcesso,
    documentos: [], sistemas: [], responsaveis: [], gargalos, melhorias: [],
  } as Parameters<typeof buildProjectDiagram>[0];

  it('lista vertical: projeto no topo + só os processos (numerados por order_index)', () => {
    const code = buildProjectDiagram(projInput);
    expect(code).toContain('flowchart TB');
    expect(code).toContain(':::projHead');
    expect(code).toContain('**Gestão**');
    expect(code).toContain('**1 · Proc A**'); // ordenado por order_index
    expect(code).toContain('**2 · Proc B**');
  });

  it('NÃO expande as etapas dos processos (só o card do processo)', () => {
    const code = buildProjectDiagram(projInput);
    expect(code).not.toContain('Coleta');
    expect(code).not.toContain('Triagem');
    expect(code).not.toContain('Revisão');
    expect(code).not.toContain(':::etapaGargalo'); // sem etapas ⇒ sem acento de gargalo
    expect(code).not.toContain('PC_0_E_0');        // sem nós de etapa
  });

  it('setas ↓ ligando o projeto e os processos, um embaixo do outro', () => {
    const code = buildProjectDiagram(projInput);
    expect(code).toContain('PROJ --> PC_0'); // projeto → 1º processo
    expect(code).toContain('PC_0 --> PC_1'); // processo → próximo processo
  });
});
