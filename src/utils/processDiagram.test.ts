// Trava o modelo do diagrama por-processo: uma SERPENTINA de cards ricos (um por
// etapa, detalhe embutido). O fluxo quebra em linhas (LR/RL alternados) e vira um
// esquema 2D. Garante que: (a) o modelo antigo de entidades (subgraphs de tipo +
// arestas de relação -.->) não voltou; (b) linhas empilham por link ENTRE
// subgraphs (~~~), nunca por aresta nó→nó (que colapsaria a serpentina).

import { describe, it, expect } from 'vitest';
import { buildProcessDiagram, buildProjectDiagram, buildProcessComparison, buildProjectComparison } from './processDiagram';
import type { Processo, Etapa, Gargalo, Melhoria, Projeto } from '../types';

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

describe('buildProjectDiagram — serpentina de processos (consolidado)', () => {
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

  it('MESMA estrutura do processo: flowchart TB + cards de PROCESSO numerados por order_index', () => {
    const code = buildProjectDiagram(projInput);
    expect(code).toContain('flowchart TB');
    expect(code).toContain(':::procHead');
    expect(code).toContain('**1 · Proc A**'); // ordenado por order_index
    expect(code).toContain('**2 · Proc B**');
  });

  it('NÃO expande as etapas dos processos (só o card do processo)', () => {
    const code = buildProjectDiagram(projInput);
    expect(code).not.toContain('Coleta');
    expect(code).not.toContain('Triagem');
    expect(code).not.toContain('Revisão');
    expect(code).not.toContain(':::etapaGargalo'); // sem etapas ⇒ sem acento de gargalo
  });

  it('serpentina: muitos processos dobram em linhas (subgraph LR/RL) com FOLD entre elas', () => {
    // 5 processos ⇒ cols=4 ⇒ 2 linhas (4 + 1) ⇒ dobra.
    const cinco = [1, 2, 3, 4, 5].map(
      (i) => ({ id: `PP${i}`, name: `Proc ${i}`, order_index: i }) as unknown as Processo,
    );
    const code = buildProjectDiagram({ ...projInput, processos: cinco });
    expect(code).toContain('subgraph');
    expect(code).toContain('direction LR');            // linha par
    expect(code).toContain('direction RL');            // linha ímpar (dobra)
    expect(code).toContain('ROW_PROC_0 ~~~ ROW_PROC_1'); // empilha (invisível, entre subgraphs)
    expect(code).toContain('fill:none,stroke:none');   // caixas de linha invisíveis
    expect(code).toContain('%% FOLD');                 // metadado da dobra (viewer desenha a seta)
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  Comparativos (Como Era × Como Ficou) — modelo por-cenário
// ═════════════════════════════════════════════════════════════════════════

function etapaCmp(id: string, ordem: number, name: string, execution: string, sistemas: string[]) {
  return {
    id, process_id: 'PX', name, stage_order: ordem, execution, sistemas,
    docsEntrada: [], docsSaida: [], executadoPor: [], gargalos: [],
  } as unknown as Etapa;
}

describe('buildProcessComparison — etapas em duas colunas (Como Era | Como Ficou)', () => {
  const pA = { id: 'P1', name: 'Contratação', order_index: 0 } as unknown as Processo;
  const pB = { id: 'P2', name: 'Solicitações', order_index: 1 } as unknown as Processo;
  const asis = new Map<string, Etapa[]>([
    ['P1', [
      etapaCmp('A1', 1, 'Cadastrar o cliente', 'semi_automatica', ['PSA Projects']),
      etapaCmp('A2', 2, 'Preencher a OS', 'manual', ['Excel', 'OpenProject', 'Word', 'Drive']),
      etapaCmp('A3', 3, 'Registrar controle', 'manual', ['Planilha']),
    ]],
  ]);
  const tobe = new Map<string, Etapa[]>([
    ['P1', [
      etapaCmp('T1', 1, 'Cadastrar o cliente', 'automatica', ['PSA Projects']),
      etapaCmp('T2', 2, 'Preencher a OS', 'semi_automatica', ['PSA Projects']),
    ]],
  ]);

  it('flowchart LR, bloco do processo com contagem AS→TO e duas colunas', () => {
    const code = buildProcessComparison({ processos: [pA], asisPorProcesso: asis, tobePorProcesso: tobe });
    expect(code).toContain('flowchart LR');
    expect(code).toContain(':::procHead');
    expect(code).toContain('**1 · Contratação** · 3 → 2');
    expect(code).toContain('`Como Era`');
    expect(code).toContain('`Como Ficou`');
    expect(code).toContain(':::tagAS');
    expect(code).toContain(':::tagTO');
    expect(code).toContain(':::etapaAS');
    expect(code).toContain(':::etapaTO');
  });

  it('card = nome + execução (texto) + sistemas; corta sistemas longos com +N', () => {
    const code = buildProcessComparison({ processos: [pA], asisPorProcesso: asis, tobePorProcesso: tobe });
    expect(code).toContain('**1 · Cadastrar o cliente**');
    expect(code).toContain('Semi-automática');
    expect(code).toContain('Manual');
    expect(code).toContain('Automática');
    expect(code).toContain('PSA Projects');
    // 4 sistemas ⇒ mostra 3 + "+1"
    expect(code).toContain('Excel · OpenProject · Word +1');
    // sem responsáveis/docs no card
    expect(code).not.toContain(':::etapaGargalo');
  });

  it('vários processos ficam lado a lado (link invisível ~~~ entre subgraphs)', () => {
    const code = buildProcessComparison({ processos: [pB, pA], asisPorProcesso: asis, tobePorProcesso: tobe });
    // ordenado por order_index ⇒ P1 antes de P2
    expect(code.indexOf('Contratação')).toBeLessThan(code.indexOf('Solicitações'));
    expect(code).toContain('~~~');
    expect(code).toContain('fill:none,stroke:none');
  });

  it('coluna sem etapas → placeholder "sem etapas"', () => {
    const code = buildProcessComparison({ processos: [pB], asisPorProcesso: asis, tobePorProcesso: tobe });
    expect(code).toContain(':::vazio');
    expect(code).toContain('sem etapas');
  });
});

describe('buildProjectComparison — consolidado do PROJETO (1 card, sem cards de processo)', () => {
  const p1 = { id: 'P1', name: 'Contratação', order_index: 0 } as unknown as Processo;
  const p2 = { id: 'P2', name: 'Entrevista', order_index: 1 } as unknown as Processo;
  const gars = [
    { id: 'G1', nome: 'Retrabalho', descricao: 'Cadastro espalhado em planilha', processos: ['P1'] },
    { id: 'G2', nome: 'Fora', descricao: 'Gargalo de outro projeto', processos: ['PX'] },
  ] as unknown as Gargalo[];
  const melhs = [
    { id: 'M1', improvement_description: 'Cadastro único no PSA Projects', processos: ['P1'] },
  ] as unknown as Melhoria[];

  it('flowchart TB: um card do PROJETO com dois ramos, sem subgraphs/cards de processo', () => {
    const code = buildProjectComparison({ projetoNome: 'Gestão', processos: [p1, p2], gargalos: gars, melhorias: melhs });
    expect(code).toContain('flowchart TB');
    expect(code).toContain(':::rootHead');
    expect(code).toContain('**Gestão**');
    expect(code).toContain('`Como Era`');
    expect(code).toContain('`Como Ficou`');
    expect(code).toContain('**Gargalo** — Retrabalho'); // gargalo usa o nome curto, não a descrição
    expect(code).toContain('**Melhoria** — Cadastro único no PSA Projects');
    expect(code).toContain(':::gargalo');
    expect(code).toContain(':::melhoria');
    // sem cards intermediários de processo
    expect(code).not.toContain('subgraph');
    expect(code).not.toContain('Contratação');
    // filtra gargalos/melhorias que não são do projeto
    expect(code).not.toContain('Gargalo de outro projeto');
  });

  it('projeto sem gargalo/melhoria → placeholders', () => {
    const code = buildProjectComparison({ projetoNome: 'Vazio', processos: [p2], gargalos: gars, melhorias: melhs });
    expect(code).toContain('sem gargalo mapeado');
    expect(code).toContain('sem melhoria mapeada');
  });
});
