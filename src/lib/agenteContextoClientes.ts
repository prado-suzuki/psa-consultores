/**
 * Snapshot do Board · Clientes: região, serviço e lacuna de aditivo.
 * O agente lê as MESMAS fatias que a tela desenha.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type { FatiaRegiao, FatiaServico, LacunaAditivo } from '@/lib/boardOportunidade';
import { clientesCicloVencido, type ClienteCarteira } from '@/lib/boardCarteira';

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
  carteira?: ClienteCarteira[];
  diasAditivo?: number | null;
  falhas: string[];
}

const SUGESTOES = [
  'Quem mais gera receita e quem mais renova?',
  'Qual produto é o mais recorrente na carteira?',
  'Quem já passou o próprio ciclo de aditivo?',
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

function blocoCarteira(e: EntradaContextoClientes): BlocoContexto | null {
  if (!e.carteira || e.carteira.length === 0) return null;
  const top = e.carteira[0];
  const renovam = e.carteira.filter((c) => c.renovacoes > 0);
  const ciclo = clientesCicloVencido(e.carteira);
  return {
    id: 'receita',
    titulo: 'Quem gera receita e quem renova',
    campos: [
      { rotulo: 'Maior contratado', valor: `${top.cliente_nome} · ${brl(top.gasto)}` },
      {
        rotulo: 'Tempo médio de aditivo',
        valor: e.diasAditivo == null ? null : `${Math.round(e.diasAditivo)} dias`,
        nota: e.diasAditivo == null ? 'sem segunda OS datada' : undefined,
      },
      { rotulo: 'Clientes que renovaram', valor: String(renovam.length) },
      { rotulo: 'Ciclo de aditivo vencido', valor: String(ciclo.length) },
    ],
    itens: e.carteira.slice(0, 8).map((c) => ({
      cliente: c.cliente_nome,
      contratado: brl(c.gasto),
      renovacoes: c.renovacoes,
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
  const blocos = [blocoCarteira(e), blocoServicos(e), blocoRegioes(e), blocoLacunas(e)]
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
