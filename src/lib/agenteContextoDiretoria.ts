/**
 * Snapshot único do Board para o Agente PSA.
 *
 * O painel não muda de menu para menu: a pergunta escolhe o recorte.
 * Cada bloco chega prefixado (Estratégico / Ferramentas / Projetos / Clientes)
 * para o modelo cruzar sem achar que está numa aba só.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import { MIX_ROTULO, type MixAtivos, type SaudeOsg } from '@/lib/boardDiretoria';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

/** Mix, caixa e OSG — a pergunta de diretoria que o snapshot antigo não rotulava. */
export function blocosLeituraDiretoria(e: {
  mix: MixAtivos;
  caixa: number;
  ticket: number | null;
  osg: SaudeOsg;
  janela: string;
}): BlocoContexto[] {
  return [
    {
      id: 'mix',
      titulo: 'De onde veio o ativo',
      janela: e.janela,
      nota: 'Mais projeto só é saúde se for cliente novo ou aditivo.',
      campos: [
        { rotulo: 'OS ativas', valor: String(e.mix.ativos) },
        { rotulo: 'Delta vs 30d anteriores', valor: `${e.mix.delta > 0 ? '+' : ''}${e.mix.delta}` },
        { rotulo: MIX_ROTULO.cliente_novo, valor: String(e.mix.fatias.cliente_novo) },
        { rotulo: MIX_ROTULO.aditivo, valor: String(e.mix.fatias.aditivo) },
        { rotulo: MIX_ROTULO.entrega_planejada, valor: String(e.mix.fatias.entrega_planejada) },
        { rotulo: MIX_ROTULO.inclassificavel, valor: String(e.mix.fatias.inclassificavel) },
      ],
    },
    {
      id: 'caixa',
      titulo: 'Caixa vigente',
      janela: e.janela,
      nota: 'Contratado, não faturado. Folha não está no cadastro.',
      campos: [
        { rotulo: 'Caixa vigente', valor: brl(e.caixa) },
        {
          rotulo: 'Ticket médio do ano',
          valor: e.ticket == null ? null : brl(e.ticket),
          nota: e.ticket == null ? 'sem OS datada no ano' : undefined,
        },
        { rotulo: 'Folha', valor: null, nota: 'sem campo de folha no cadastro' },
      ],
    },
    {
      id: 'osg',
      titulo: 'OSG no ano',
      janela: e.janela,
      campos: [
        { rotulo: 'Clientes OSG no ano', valor: String(e.osg.clientesAno) },
        { rotulo: 'Meta', valor: String(e.osg.meta) },
        { rotulo: 'Projeção no ritmo atual', valor: e.osg.projecaoAno.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
      ],
    },
  ];
}

const PREFIXO: Record<string, string> = {
  estrategico: 'Estratégico',
  ferramentas: 'Ferramentas',
  projetos: 'Projetos',
  clientes: 'Clientes',
};

export const SUGESTOES_BOARD = [
  'O crescimento de ativos é cliente novo ou entrega já paga?',
  'Quais ferramentas devolvem mais hora — e em qual área?',
  'Quantos projetos a mais a hora das ferramentas cobre?',
  'Quem mais gera receita e quem já passou o ciclo de aditivo?',
];

export interface PartesDiretoria {
  estrategico?: ContextoTela | null;
  ferramentas?: ContextoTela | null;
  projetos?: ContextoTela | null;
  clientes?: ContextoTela | null;
}

function prefixar(area: string, bloco: BlocoContexto): BlocoContexto {
  return {
    ...bloco,
    id: `${area}.${bloco.id}`,
    titulo: `${PREFIXO[area] ?? area} · ${bloco.titulo}`,
  };
}

export function contextoBoardDiretoria(partes: PartesDiretoria): ContextoTela {
  const ordem = ['estrategico', 'ferramentas', 'projetos', 'clientes'] as const;
  const blocos: BlocoContexto[] = [];
  const avisos: string[] = [];
  const filtros: Record<string, string> = {};

  for (const area of ordem) {
    const ctx = partes[area];
    if (!ctx) continue;
    for (const [k, v] of Object.entries(ctx.filtros)) {
      filtros[`${PREFIXO[area]} · ${k}`] = v;
    }
    for (const bloco of ctx.blocos) blocos.push(prefixar(area, bloco));
    if (ctx.avisos) avisos.push(...ctx.avisos);
  }

  return {
    rotulo: 'Board',
    filtros,
    blocos,
    avisos: avisos.length > 0 ? [...new Set(avisos)] : undefined,
    sugestoes: SUGESTOES_BOARD,
  };
}
