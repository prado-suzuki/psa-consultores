/**
 * Recorte compartilhado do Board: cliente, ano e mês.
 * Cluster continua em `filtrarPorCluster`. Aqui entra o que a diretoria
 * pede em todo menu — sem inventar data: OS sem data fica de fora do período.
 */
import type { ClienteRow, OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';

export interface BoardRecorte {
  cliente: string;
  ano: string;
  mes: string;
}

export const MESES_RECORTE = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const;

export function dataDaOs(o: Pick<OsRow, 'data_inicio' | 'data_emissao'>): string | null {
  return o.data_inicio || o.data_emissao || null;
}

export function dataNaJanela(data: string | null | undefined, ano: string, mes: string): boolean {
  if (!ano && !mes) return true;
  if (!data) return false;
  if (ano && data.slice(0, 4) !== ano) return false;
  if (mes && data.slice(5, 7) !== mes) return false;
  return true;
}

export function hojeDoRecorte(hoje: string, recorte: Pick<BoardRecorte, 'ano' | 'mes'>): string {
  if (!recorte.ano) return hoje;
  if (recorte.mes) {
    const ultimo = new Date(Number(recorte.ano), Number(recorte.mes), 0).getDate();
    return `${recorte.ano}-${recorte.mes}-${String(ultimo).padStart(2, '0')}`;
  }
  if (recorte.ano === hoje.slice(0, 4)) return hoje;
  return `${recorte.ano}-12-31`;
}

export function anosDisponiveis(os: Pick<OsRow, 'data_inicio' | 'data_emissao'>[], hoje: string): string[] {
  const anos = new Set<string>([hoje.slice(0, 4)]);
  for (const o of os) {
    const d = dataDaOs(o);
    if (d) anos.add(d.slice(0, 4));
  }
  return [...anos].sort((a, b) => b.localeCompare(a));
}

export function aplicarRecorteOs(os: OsRow[], recorte: BoardRecorte): OsRow[] {
  return os.filter((o) => {
    if (recorte.cliente && o.cliente_id !== recorte.cliente) return false;
    return dataNaJanela(dataDaOs(o), recorte.ano, recorte.mes);
  });
}

export function aplicarRecorteClientes(
  clientes: ClienteRow[],
  osRecortadas: OsRow[],
  recorte: BoardRecorte,
): ClienteRow[] {
  if (recorte.cliente) return clientes.filter((c) => c.cliente_id === recorte.cliente);
  if (!recorte.ano && !recorte.mes) return clientes;
  const ids = new Set(osRecortadas.map((o) => o.cliente_id));
  return clientes.filter((c) => ids.has(c.cliente_id));
}

export function aplicarRecorteProjetos(
  projetos: ProjetoRow[],
  osRecortadas: OsRow[],
  recorte: BoardRecorte,
): ProjetoRow[] {
  const osIds = new Set(osRecortadas.map((o) => o.os_id));
  const comPeriodo = !!(recorte.ano || recorte.mes);
  return projetos.filter((p) => {
    if (recorte.cliente && p.cliente_id !== recorte.cliente) return false;
    if (!comPeriodo) return true;
    return p.os_id != null && osIds.has(p.os_id);
  });
}

export function aplicarRecorteMelhorias(
  melhorias: MelhoriaRoi[],
  recorte: BoardRecorte,
  clusterDoCliente: string | null,
): MelhoriaRoi[] {
  return melhorias.filter((m) => {
    if (recorte.cliente && clusterDoCliente && m.cluster_id !== clusterDoCliente) return false;
    if (recorte.cliente && !clusterDoCliente) return false;
    return dataNaJanela(m.created_at, recorte.ano, recorte.mes);
  });
}
