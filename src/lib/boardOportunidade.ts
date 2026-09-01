/**
 * Carteira para venda e aditivo: onde o cliente está, o que já contrata,
 * e o que os pares da mesma região contratam e ele ainda não.
 *
 * Funções puras. `hoje` não entra — a ocorrência é do recorte que a tela
 * já filtrou. Serviço sem nome e região vazia não somem: viram "—".
 */
import type { ClienteRow, FatiaRateio, OsRow } from '@/lib/dashboardClientesOs/types';
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

/**
 * Oferta da OS: serviço cadastrado ou, se estiver vazio (todas as OS de
 * produção hoje), os produtos contratados. Sem os dois, fica visível como —.
 */
export function ofertasDaOs(
  o: Pick<OsRow, 'os_id' | 'servico_id' | 'servico_nome'>,
  produtosPorOs?: Map<string, FatiaRateio[]>,
): { chave: string; rotulo: string }[] {
  const chave = chaveServico(o);
  if (chave !== SEM_SERVICO) return [{ chave, rotulo: rotuloServico(o, chave) }];
  const fatias = produtosPorOs?.get(o.os_id) ?? [];
  if (fatias.length === 0) return [{ chave: SEM_SERVICO, rotulo: 'Sem serviço' }];
  return fatias.map((f) => ({ chave: `prod:${f.id}`, rotulo: f.label }));
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

export function ocorrenciaServicos(
  os: OsRow[],
  produtosPorOs?: Map<string, FatiaRateio[]>,
): FatiaServico[] {
  const por = new Map<string, { rotulo: string; osIds: Set<string>; clientes: Set<string>; contratado: number }>();
  for (const o of os) {
    const ofes = ofertasDaOs(o, produtosPorOs);
    const fatias = produtosPorOs?.get(o.os_id);
    for (const ofe of ofes) {
      const cur = por.get(ofe.chave) ?? {
        rotulo: ofe.rotulo, osIds: new Set<string>(), clientes: new Set<string>(), contratado: 0,
      };
      cur.osIds.add(o.os_id);
      cur.clientes.add(o.cliente_id);
      const fatia = fatias?.find((f) => `prod:${f.id}` === ofe.chave);
      const share = fatia ? fatia.percentual / 100 : 1 / ofes.length;
      cur.contratado += o.faturamento * share;
      por.set(ofe.chave, cur);
    }
  }
  return [...por.entries()]
    .map(([chave, v]) => ({
      chave,
      rotulo: v.rotulo,
      os: v.osIds.size,
      clientes: v.clientes.size,
      ticket: v.clientes.size === 0 ? null : v.contratado / v.clientes.size,
      contratado: v.contratado,
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
  produtosPorOs?: Map<string, FatiaRateio[]>,
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
    for (const ofe of ofertasDaOs(o, produtosPorOs)) {
      if (ofe.chave === SEM_SERVICO) continue;
      const k = `${r}|${ofe.chave}`;
      const cur = celula.get(k) ?? {
        servico: ofe.chave, rotuloServico: ofe.rotulo, clientes: new Set<string>(),
      };
      cur.clientes.add(o.cliente_id);
      celula.set(k, cur);
    }
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
  { minClientesRegiao = 3, minShare = 0.3, limite = 12, produtosPorOs }: {
    minClientesRegiao?: number;
    minShare?: number;
    limite?: number;
    produtosPorOs?: Map<string, FatiaRateio[]>;
  } = {},
): LacunaAditivo[] {
  const cruz = cruzamentoRegiaoServico(clientes, os, produtosPorOs);
  const comuns = cruz.filter((c) =>
    c.clientesNaRegiao >= minClientesRegiao && c.share >= minShare,
  );
  if (comuns.length === 0) return [];

  const servicosDoCliente = new Map<string, Set<string>>();
  for (const o of os) {
    for (const ofe of ofertasDaOs(o, produtosPorOs)) {
      if (ofe.chave === SEM_SERVICO) continue;
      const set = servicosDoCliente.get(o.cliente_id) ?? new Set<string>();
      set.add(ofe.chave);
      servicosDoCliente.set(o.cliente_id, set);
    }
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
