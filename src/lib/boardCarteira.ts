/**
 * Carteira para decisão: quem gasta, quem renova, tempo médio de aditivo.
 * Serviço da OS está vazio no cadastro — a oferta real é o produto contratado.
 */
import type { OsRow } from '@/lib/dashboardClientesOs/types';

const DAY_MS = 86_400_000;

export interface ClienteCarteira {
  cliente_id: string;
  cliente_nome: string;
  gasto: number;
  os: number;
  renovacoes: number;
  diasMedioAditivo: number | null;
  ultimaOs: string | null;
  diasDesdeUltima: number | null;
  vigentes: number;
}

function dataOs(o: OsRow): string | null {
  return o.data_inicio || o.data_emissao || null;
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function carteiraClientes(os: OsRow[], hoje?: string): ClienteCarteira[] {
  const por = new Map<string, OsRow[]>();
  for (const o of os) {
    const cur = por.get(o.cliente_id) ?? [];
    cur.push(o);
    por.set(o.cliente_id, cur);
  }

  return [...por.entries()]
    .map(([cliente_id, rows]) => {
      const datas = rows
        .map(dataOs)
        .filter((d): d is string => !!d)
        .sort();
      const intervalos: number[] = [];
      for (let i = 1; i < datas.length; i++) {
        const d = diasEntre(datas[i - 1], datas[i]);
        if (d >= 0) intervalos.push(d);
      }
      const ultimaOs = datas.length === 0 ? null : datas[datas.length - 1];
      const vigentes = rows.filter((o) => o.status_contrato === 'Vigente').length;
      return {
        cliente_id,
        cliente_nome: rows[0].cliente_nome,
        gasto: rows.reduce((acc, o) => acc + o.faturamento, 0),
        os: rows.length,
        renovacoes: Math.max(0, datas.length - 1),
        diasMedioAditivo: intervalos.length === 0
          ? null
          : intervalos.reduce((a, b) => a + b, 0) / intervalos.length,
        ultimaOs,
        diasDesdeUltima: ultimaOs && hoje ? diasEntre(ultimaOs, hoje) : null,
        vigentes,
      };
    })
    .sort((a, b) => b.gasto - a.gasto);
}

/** Quem já passou o intervalo médio entre as próprias OS — decisão de renovar. */
export function clientesCicloVencido(carteira: ClienteCarteira[]): ClienteCarteira[] {
  return carteira
    .filter((c) =>
      c.renovacoes > 0
      && c.diasMedioAditivo != null
      && c.diasDesdeUltima != null
      && c.diasDesdeUltima >= c.diasMedioAditivo,
    )
    .sort((a, b) => (b.diasDesdeUltima ?? 0) - (a.diasDesdeUltima ?? 0));
}

export function tempoMedioAditivo(os: OsRow[]): number | null {
  const intervalos: number[] = [];
  for (const c of carteiraClientes(os)) {
    if (c.diasMedioAditivo != null) intervalos.push(c.diasMedioAditivo);
  }
  if (intervalos.length === 0) return null;
  return intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
}
