/**
 * Carteira para venda e aditivo: onde o cliente está, o que já contrata,
 * e o que os pares da mesma região contratam e ele ainda não.
 *
 * Funções puras. `hoje` não entra — a ocorrência é do recorte que a tela
 * já filtrou. Serviço sem nome e região vazia não somem: viram "—".
 */
import type { ClienteRow, OsRow } from '@/lib/dashboardClientesOs/types';
import { UF_NOMES } from '@/lib/clientesPorRegiao';

export const SEM_REGIAO = 'sem_regiao';
export const SEM_SERVICO = 'sem_servico';

export interface FatiaRegiao {
  chave: string;
  rotulo: string;
  clientes: number;
  ativos: number;
  os: number;
  ticket: number | null;
  contratado: number;
}

export interface FatiaServico {
  chave: string;
  rotulo: string;
  os: number;
  clientes: number;
  ticket: number | null;
  contratado: number;
}

export interface CruzamentoRegiaoServico {
  regiao: string;
  rotuloRegiao: string;
  servico: string;
  rotuloServico: string;
  clientes: number;
  clientesNaRegiao: number;
  share: number;
}

export interface LacunaAditivo {
  cliente_id: string;
  cliente_nome: string;
  rotuloRegiao: string;
  servico: string;
  rotuloServico: string;
  ocorreNaRegiao: number;
  clientesNaRegiao: number;
}

export function chaveRegiao(c: Pick<ClienteRow, 'uf' | 'regiao'>): string {
  const uf = (c.uf ?? '').trim().toUpperCase();
  if (uf && UF_NOMES[uf]) return uf;
  const reg = (c.regiao ?? '').trim();
  if (reg) return `reg:${reg}`;
  return SEM_REGIAO;
}

export function rotuloRegiao(chave: string): string {
  if (chave === SEM_REGIAO) return 'Sem região';
  if (chave.startsWith('reg:')) return chave.slice(4);
  return UF_NOMES[chave] ?? chave;
}

export function chaveServico(o: Pick<OsRow, 'servico_id' | 'servico_nome'>): string {
  if (o.servico_id) return o.servico_id;
  const nome = (o.servico_nome ?? '').trim();
  return nome ? `nome:${nome}` : SEM_SERVICO;
}

export function rotuloServico(o: Pick<OsRow, 'servico_nome'>, chave: string): string {
  const nome = (o.servico_nome ?? '').trim();
  if (nome) return nome;
  return chave === SEM_SERVICO ? 'Sem serviço' : chave;
}

function ticketDe(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function distribuicaoRegiao(clientes: ClienteRow[], os: OsRow[]): FatiaRegiao[] {
  const osPorCliente = new Map<string, OsRow[]>();
  for (const o of os) {
    const cur = osPorCliente.get(o.cliente_id) ?? [];
    cur.push(o);
    osPorCliente.set(o.cliente_id, cur);
  }

  const por = new Map<string, FatiaRegiao>();
  for (const c of clientes) {
    const chave = chaveRegiao(c);
    const cur = por.get(chave) ?? {
      chave, rotulo: rotuloRegiao(chave), clientes: 0, ativos: 0, os: 0, ticket: null, contratado: 0,
    };
    cur.clientes += 1;
    if (c.ativo) cur.ativos += 1;
    const doCliente = osPorCliente.get(c.cliente_id) ?? [];
    cur.os += doCliente.length;
    cur.contratado += doCliente.reduce((acc, o) => acc + o.faturamento, 0);
    por.set(chave, cur);
  }

  return [...por.values()]
    .map((f) => {
      const vals = clientes
        .filter((c) => chaveRegiao(c) === f.chave)
        .flatMap((c) => (osPorCliente.get(c.cliente_id) ?? []).map((o) => o.faturamento));
      return { ...f, ticket: ticketDe(vals) };
    })
    .sort((a, b) => b.clientes - a.clientes);
}

export function ocorrenciaServicos(os: OsRow[]): FatiaServico[] {
  const por = new Map<string, { rotulo: string; os: OsRow[]; clientes: Set<string> }>();
  for (const o of os) {
    const chave = chaveServico(o);
    const cur = por.get(chave) ?? {
      rotulo: rotuloServico(o, chave), os: [], clientes: new Set<string>(),
    };
    cur.os.push(o);
    cur.clientes.add(o.cliente_id);
    por.set(chave, cur);
  }
  return [...por.entries()]
    .map(([chave, v]) => ({
      chave,
      rotulo: v.rotulo,
      os: v.os.length,
      clientes: v.clientes.size,
      ticket: ticketDe(v.os.map((o) => o.faturamento)),
      contratado: v.os.reduce((acc, o) => acc + o.faturamento, 0),
    }))
    .sort((a, b) => b.clientes - a.clientes || b.os - a.os);
}

/**
 * Serviço × região: quantos clientes da praça já contratam aquele serviço.
 * Share = clientes com o serviço / clientes da região (pelo cadastro).
 */
export function cruzamentoRegiaoServico(
  clientes: ClienteRow[],
  os: OsRow[],
): CruzamentoRegiaoServico[] {
  const clientesPorRegiao = new Map<string, Set<string>>();
  const regiaoDoCliente = new Map<string, string>();
  for (const c of clientes) {
    const r = chaveRegiao(c);
    regiaoDoCliente.set(c.cliente_id, r);
    const set = clientesPorRegiao.get(r) ?? new Set<string>();
    set.add(c.cliente_id);
    clientesPorRegiao.set(r, set);
  }

  const celula = new Map<string, { servico: string; rotuloServico: string; clientes: Set<string> }>();
  for (const o of os) {
    const r = regiaoDoCliente.get(o.cliente_id);
    if (!r) continue;
    const s = chaveServico(o);
    if (s === SEM_SERVICO) continue;
    const k = `${r}|${s}`;
    const cur = celula.get(k) ?? {
      servico: s, rotuloServico: rotuloServico(o, s), clientes: new Set<string>(),
    };
    cur.clientes.add(o.cliente_id);
    celula.set(k, cur);
  }

  return [...celula.entries()]
    .map(([k, v]) => {
      const [regiao] = k.split('|');
      const clientesNaRegiao = clientesPorRegiao.get(regiao)?.size ?? 0;
      return {
        regiao,
        rotuloRegiao: rotuloRegiao(regiao),
        servico: v.servico,
        rotuloServico: v.rotuloServico,
        clientes: v.clientes.size,
        clientesNaRegiao,
        share: clientesNaRegiao > 0 ? v.clientes.size / clientesNaRegiao : 0,
      };
    })
    .sort((a, b) => b.clientes - a.clientes);
}

/**
 * Cliente sem um serviço que já é comum na praça dele.
 * É a lista de aditivo / venda — não um cadastro.
 */
export function lacunasAditivo(
  clientes: ClienteRow[],
  os: OsRow[],
  { minClientesRegiao = 3, minShare = 0.3, limite = 12 }: {
    minClientesRegiao?: number;
    minShare?: number;
    limite?: number;
  } = {},
): LacunaAditivo[] {
  const cruz = cruzamentoRegiaoServico(clientes, os);
  const comuns = cruz.filter((c) =>
    c.clientesNaRegiao >= minClientesRegiao && c.share >= minShare,
  );
  if (comuns.length === 0) return [];

  const servicosDoCliente = new Map<string, Set<string>>();
  for (const o of os) {
    const s = chaveServico(o);
    if (s === SEM_SERVICO) continue;
    const set = servicosDoCliente.get(o.cliente_id) ?? new Set<string>();
    set.add(s);
    servicosDoCliente.set(o.cliente_id, set);
  }

  const saida: LacunaAditivo[] = [];
  for (const c of clientes) {
    if (!c.ativo) continue;
    const r = chaveRegiao(c);
    const jaTem = servicosDoCliente.get(c.cliente_id) ?? new Set<string>();
    for (const comum of comuns) {
      if (comum.regiao !== r) continue;
      if (jaTem.has(comum.servico)) continue;
      saida.push({
        cliente_id: c.cliente_id,
        cliente_nome: c.cliente_nome,
        rotuloRegiao: comum.rotuloRegiao,
        servico: comum.servico,
        rotuloServico: comum.rotuloServico,
        ocorreNaRegiao: comum.clientes,
        clientesNaRegiao: comum.clientesNaRegiao,
      });
    }
  }

  return saida
    .sort((a, b) => b.ocorreNaRegiao - a.ocorreNaRegiao || a.cliente_nome.localeCompare(b.cliente_nome, 'pt-BR'))
    .slice(0, limite);
}
