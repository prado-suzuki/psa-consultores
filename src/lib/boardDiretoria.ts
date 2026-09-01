/**
 * Leitura de diretoria: mix, caixa, horizonte, OSG.
 *
 * Funções puras. `hoje` é sempre 'YYYY-MM-DD'. Número que não existe no
 * cadastro sai `null` — a tela escreve "—" e o motivo, nunca estima.
 */
import type { OsRow } from '@/lib/dashboardClientesOs/types';

export const HORAS_MES_FTE = 176;
export const META_CLIENTES_OSG_ANO = 30;

const DAY_MS = 86_400_000;
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function addDaysIso(hoje: string, dias: number): string {
  return new Date(Date.parse(`${hoje}T00:00:00Z`) + dias * DAY_MS).toISOString().slice(0, 10);
}

export function rotuloMesIso(ym: string): string {
  return MESES_CURTOS[Number(ym.slice(5, 7)) - 1] ?? ym;
}

export type MixClasse = 'cliente_novo' | 'aditivo' | 'entrega_planejada' | 'inclassificavel';

export const MIX_ROTULO: Record<MixClasse, string> = {
  cliente_novo: 'Cliente novo',
  aditivo: 'Aditivo',
  entrega_planejada: 'Já planejada',
  inclassificavel: 'Sem data',
};

function primeiraOsPorCliente(os: OsRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of os) {
    if (!o.data_inicio) continue;
    const cur = map.get(o.cliente_id);
    if (!cur || o.data_inicio < cur) map.set(o.cliente_id, o.data_inicio);
  }
  return map;
}

export function osAtiva(o: OsRow): boolean {
  const s = (o.situacao ?? '').toLowerCase();
  return s !== 'concluido' && s !== 'cancelado';
}

export function classificarMix(o: OsRow, primeira: Map<string, string>, janelaDe: string): MixClasse {
  if (!o.data_inicio) return 'inclassificavel';
  const debut = primeira.get(o.cliente_id);
  if (o.data_inicio >= janelaDe) {
    if (debut && o.data_inicio === debut) return 'cliente_novo';
    return 'aditivo';
  }
  return 'entrega_planejada';
}

export interface MixAtivos {
  ativos: number;
  iniciadasJanela: number;
  iniciadasAnterior: number;
  /** Iniciadas na janela menos as da janela anterior. */
  delta: number;
  fatias: Record<MixClasse, number>;
}

export function mixAtivos(os: OsRow[], hoje: string, janelaDias = 30): MixAtivos {
  const janelaDe = addDaysIso(hoje, -janelaDias);
  const janelaDeAnt = addDaysIso(hoje, -janelaDias * 2);
  const primeira = primeiraOsPorCliente(os);
  const ativos = os.filter(osAtiva);
  const fatias: Record<MixClasse, number> = {
    cliente_novo: 0, aditivo: 0, entrega_planejada: 0, inclassificavel: 0,
  };
  for (const o of ativos) fatias[classificarMix(o, primeira, janelaDe)] += 1;

  const noIntervalo = (de: string, ate: string) =>
    os.filter((o) => o.data_inicio && o.data_inicio >= de && o.data_inicio < ate).length;

  const iniciadasJanela = noIntervalo(janelaDe, addDaysIso(hoje, 1));
  const iniciadasAnterior = noIntervalo(janelaDeAnt, janelaDe);
  return {
    ativos: ativos.length,
    iniciadasJanela,
    iniciadasAnterior,
    delta: iniciadasJanela - iniciadasAnterior,
    fatias,
  };
}

export interface PontoMixMensal {
  mes: string;
  cliente_novo: number;
  aditivo: number;
  entrega_planejada: number;
  inclassificavel: number;
}

/** OS iniciadas em cada um dos últimos `meses` meses, classificadas. */
export function serieMixMensal(os: OsRow[], hoje: string, meses = 8): PontoMixMensal[] {
  const primeira = primeiraOsPorCliente(os);
  const ano = Number(hoje.slice(0, 4));
  const mesHoje = Number(hoje.slice(5, 7));
  const pontos: PontoMixMensal[] = [];

  for (let i = meses - 1; i >= 0; i--) {
    const abs = ano * 12 + (mesHoje - 1) - i;
    const y = Math.floor(abs / 12);
    const m = (abs % 12) + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const janelaDe = `${ym}-01`;
    const ponto: PontoMixMensal = {
      mes: ym, cliente_novo: 0, aditivo: 0, entrega_planejada: 0, inclassificavel: 0,
    };
    for (const o of os) {
      if (!o.data_inicio || o.data_inicio.slice(0, 7) !== ym) continue;
      ponto[classificarMix(o, primeira, janelaDe)] += 1;
    }
    pontos.push(ponto);
  }
  return pontos;
}

/** Ticket médio do ano corrente: receita / clientes com OS iniciada no ano. */
export function ticketMedioAno(os: OsRow[], hoje: string): number | null {
  const ano = hoje.slice(0, 4);
  const doAno = os.filter((o) => o.data_inicio?.startsWith(ano));
  const clientes = new Set(doAno.map((o) => o.cliente_id));
  if (clientes.size === 0) return null;
  return doAno.reduce((acc, o) => acc + o.faturamento, 0) / clientes.size;
}

export function caixaVigente(os: OsRow[]): number {
  return os
    .filter((o) => o.status_contrato === 'Vigente' || o.status_contrato === 'Vence em 30 dias')
    .reduce((acc, o) => acc + o.faturamento, 0);
}

export interface PontoHorizonte {
  mes: string;
  valor: number;
}

/**
 * Valor contratado que vence em cada um dos próximos `meses` meses.
 * OS sem `data_fim` ficam de fora — a tela conta `semFim`.
 */
export function serieHorizonte(os: OsRow[], hoje: string, meses = 8): {
  serie: PontoHorizonte[];
  semFim: number;
  semFimValor: number;
} {
  const vigentes = os.filter((o) =>
    o.status_contrato === 'Vigente' || o.status_contrato === 'Vence em 30 dias' || o.status_contrato === 'Vencido',
  );
  const semFimOs = vigentes.filter((o) => !o.data_fim);
  const ano = Number(hoje.slice(0, 4));
  const mesHoje = Number(hoje.slice(5, 7));
  const chaves: string[] = [];
  for (let i = 0; i < meses; i++) {
    const abs = ano * 12 + (mesHoje - 1) + i;
    const y = Math.floor(abs / 12);
    const m = (abs % 12) + 1;
    chaves.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  const set = new Set(chaves);
  const porMes = new Map<string, number>(chaves.map((k) => [k, 0]));
  for (const o of vigentes) {
    if (!o.data_fim) continue;
    const ym = o.data_fim.slice(0, 7);
    if (!set.has(ym)) continue;
    porMes.set(ym, (porMes.get(ym) ?? 0) + o.faturamento);
  }
  return {
    serie: chaves.map((mes) => ({ mes, valor: porMes.get(mes) ?? 0 })),
    semFim: semFimOs.length,
    semFimValor: semFimOs.reduce((acc, o) => acc + o.faturamento, 0),
  };
}

export function fteDeHoras(horas: number | null): { horas: number | null; fte: number | null } {
  if (horas === null) return { horas: null, fte: null };
  return { horas, fte: horas / HORAS_MES_FTE };
}

export function recorteOsg(os: OsRow[]): OsRow[] {
  return os.filter((o) => /osg/i.test(o.cluster_nome ?? ''));
}

export interface SaudeOsg {
  clientesAno: number;
  meta: number;
  ticket: number | null;
  /** Ritmo mensal no ano até hoje. */
  ritmo: number;
  /** Projeção linear até dezembro. */
  projecaoAno: number;
}

export function saudeOsg(os: OsRow[], hoje: string): SaudeOsg {
  const osg = recorteOsg(os);
  const ano = hoje.slice(0, 4);
  const mes = Number(hoje.slice(5, 7));
  const clientes = new Set(
    osg.filter((o) => o.data_inicio?.startsWith(ano)).map((o) => o.cliente_id),
  );
  const clientesAno = clientes.size;
  const ritmo = mes > 0 ? clientesAno / mes : 0;
  return {
    clientesAno,
    meta: META_CLIENTES_OSG_ANO,
    ticket: ticketMedioAno(osg, hoje),
    ritmo,
    projecaoAno: ritmo * 12,
  };
}

export interface PontoOsg {
  mes: string;
  /** `null` nos meses futuros — a linha real para, a projeção segue. */
  acumulado: number | null;
  projecao: number;
  meta: number;
}

/** Acumulado mensal de clientes OSG no ano + reta da projeção e a meta. */
export function serieOsgAno(os: OsRow[], hoje: string): PontoOsg[] {
  const osg = recorteOsg(os);
  const ano = hoje.slice(0, 4);
  const mesHoje = Number(hoje.slice(5, 7));
  const primeiro = new Map<string, string>();
  for (const o of osg) {
    if (!o.data_inicio?.startsWith(ano)) continue;
    const cur = primeiro.get(o.cliente_id);
    if (!cur || o.data_inicio < cur) primeiro.set(o.cliente_id, o.data_inicio);
  }
  const saude = saudeOsg(os, hoje);
  const pontos: PontoOsg[] = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${ano}-${String(m).padStart(2, '0')}`;
    const acumulado = [...primeiro.values()].filter((d) => d.slice(0, 7) <= ym).length;
    pontos.push({
      mes: ym,
      acumulado: m <= mesHoje ? acumulado : null,
      projecao: saude.ritmo * m,
      meta: META_CLIENTES_OSG_ANO,
    });
  }
  return pontos;
}
