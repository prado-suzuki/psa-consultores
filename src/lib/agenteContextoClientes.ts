/**
 * Snapshot do Board · Clientes: região, serviço e lacuna de aditivo.
 * O agente lê as MESMAS fatias que a tela desenha.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type { FatiaRegiao, FatiaServico, LacunaAditivo } from '@/lib/boardOportunidade';

const pct = (parte: number, total: number) =>
  total > 0 ? `${((parte / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : null;

const brl = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

export interface EntradaContextoClientes {
  /** `true` quando o usuário enxerga a carteira inteira (admin, sem cluster). */
  escopoTotal: boolean;
  ticket: number | null;
  regioes: FatiaRegiao[];
  servicos: FatiaServico[];
  lacunas: LacunaAditivo[];
  falhas: string[];
}

const SUGESTOES = [
  'Qual serviço mais se repete e em qual praça?',
  'Quem na mesma região ainda não contratou o serviço comum — aditivo?',
  'Onde o ticket do serviço foge do ticket da carteira?',
];

function blocoServicos(e: EntradaContextoClientes): BlocoContexto | null {
  if (e.servicos.length === 0) return null;
  const nomeados = e.servicos.filter((s) => s.chave !== 'sem_servico');
  const sem = e.servicos.find((s) => s.chave === 'sem_servico');
  return {
    id: 'servicos',
    titulo: 'Ocorrência por serviço',
    nota: sem
      ? `${sem.os} OS sem serviço cadastrado — não entram como produto para vender`
      : undefined,
    campos: [
      {
        rotulo: 'Ticket médio da carteira',
        valor: e.ticket == null ? null : brl(e.ticket),
        nota: e.ticket == null ? 'sem base no ano' : 'ano · por cliente',
      },
      { rotulo: 'Serviços distintos', valor: String(nomeados.length) },
    ],
    itens: nomeados.slice(0, 8).map((s) => ({
      servico: s.rotulo,
      clientes: s.clientes,
      os: s.os,
      ticket: s.ticket == null ? null : brl(s.ticket),
    })),
  };
}

function blocoRegioes(e: EntradaContextoClientes): BlocoContexto | null {
  if (e.regioes.length === 0) return null;
  const sem = e.regioes.find((r) => r.chave === 'sem_regiao');
  return {
    id: 'regioes',
    titulo: 'Clientes por região',
    nota: e.escopoTotal
      ? undefined
      : 'Carteira limitada aos clientes do seu acesso — não é o total da empresa.',
    campos: [
      { rotulo: 'Praças', valor: String(e.regioes.length) },
      {
        rotulo: 'Clientes sem região',
        valor: String(sem?.clientes ?? 0),
        nota: (sem?.clientes ?? 0) > 0 ? 'não somem da conta — só não entram numa praça' : undefined,
      },
    ],
    itens: e.regioes.slice(0, 8).map((r) => ({
      regiao: r.rotulo,
      clientes: r.clientes,
      ativos: r.ativos,
      ticket: r.ticket == null ? null : brl(r.ticket),
    })),
  };
}

function blocoLacunas(e: EntradaContextoClientes): BlocoContexto | null {
  if (e.lacunas.length === 0) return null;
  return {
    id: 'aditivo',
    titulo: 'Similaridade · serviço comum que o cliente ainda não tem',
    campos: [{ rotulo: 'Lacunas listadas', valor: String(e.lacunas.length) }],
    itens: e.lacunas.slice(0, 10).map((l) => ({
      cliente: l.cliente_nome,
      regiao: l.rotuloRegiao,
      servico: l.rotuloServico,
      'já têm na praça': `${l.ocorreNaRegiao}/${l.clientesNaRegiao}`,
      fatia: pct(l.ocorreNaRegiao, l.clientesNaRegiao),
    })),
  };
}

export function contextoBoardClientes(e: EntradaContextoClientes): ContextoTela {
  const blocos = [blocoServicos(e), blocoRegioes(e), blocoLacunas(e)]
    .filter((b): b is BlocoContexto => b !== null);

  return {
    rotulo: 'Board · Clientes (região, ocorrência de serviço e lacuna de aditivo)',
    filtros: {
      escopo: e.escopoTotal ? 'empresa inteira' : 'somente os clientes do seu acesso',
    },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
