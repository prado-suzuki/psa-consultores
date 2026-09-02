/**
 * Ferramentas implementadas: redução de tempo, benefício e FTE por área.
 * Agrupa as linhas de `process_improvements` no que a diretoria chama de
 * ferramenta — o nome do processo, não cada avaliação.
 */
import { fteDeHoras, HORAS_MES_FTE } from '@/lib/boardDiretoria';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';

const CONCLUIDO = /conclu[ií]do/i;

export function melhoriaEstaImplementada(m: Pick<MelhoriaRoi, 'improvement_status' | 'evaluation_status'>): boolean {
  if (m.evaluation_status === 'completed') return true;
  return CONCLUIDO.test(m.improvement_status ?? '');
}

export interface FerramentaCatalogo {
  chave: string;
  nome: string;
  area: string | null;
  implementacoes: number;
  horasAntes: number | null;
  horasDepois: number | null;
  horasLiberadas: number | null;
  ganhoPct: number | null;
  fte: number | null;
  economiaMensal: number | null;
}

export interface FteArea {
  area: string;
  ferramentas: number;
  horasLiberadas: number | null;
  fte: number | null;
  economiaMensal: number | null;
}

function chaveFerramenta(m: MelhoriaRoi): string {
  const nome = m.process_name?.trim();
  if (nome) return `proc:${nome.toLowerCase()}`;
  const desc = m.improvement_description?.trim();
  if (desc) return `desc:${desc.toLowerCase()}`;
  return `id:${m.id}`;
}

function rotuloFerramenta(m: MelhoriaRoi): string {
  return m.process_name?.trim() || m.improvement_description?.trim() || '—';
}

function media(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function catalogoFerramentas(melhorias: MelhoriaRoi[]): FerramentaCatalogo[] {
  const por = new Map<string, MelhoriaRoi[]>();
  for (const m of melhorias) {
    if (!melhoriaEstaImplementada(m)) continue;
    const k = chaveFerramenta(m);
    const cur = por.get(k) ?? [];
    cur.push(m);
    por.set(k, cur);
  }

  return [...por.entries()]
    .map(([chave, rows]) => {
      const horas = rows.map((r) => r.time_saved_hours).filter((v): v is number => v != null);
      const antes = rows.map((r) => r.baseline_time_hours).filter((v): v is number => v != null);
      const depois = rows.map((r) => r.improved_time_hours).filter((v): v is number => v != null);
      const ganhos = rows.map((r) => r.time_saved_percent).filter((v): v is number => v != null);
      const custos = rows.map((r) => r.cost_saved_monthly).filter((v): v is number => v != null);
      const horasLiberadas = horas.length === 0 ? null : horas.reduce((a, b) => a + b, 0);
      const areas = [...new Set(rows.map((r) => r.process_area?.trim()).filter(Boolean))] as string[];
      return {
        chave,
        nome: rotuloFerramenta(rows[0]),
        area: areas.length === 1 ? areas[0] : areas.length > 1 ? areas.join(' · ') : null,
        implementacoes: rows.length,
        horasAntes: media(antes),
        horasDepois: media(depois),
        horasLiberadas,
        ganhoPct: media(ganhos),
        fte: fteDeHoras(horasLiberadas).fte,
        economiaMensal: custos.length === 0 ? null : custos.reduce((a, b) => a + b, 0),
      };
    })
    .sort((a, b) => (b.horasLiberadas ?? -Infinity) - (a.horasLiberadas ?? -Infinity));
}

export function ftePorArea(melhorias: MelhoriaRoi[]): FteArea[] {
  const por = new Map<string, MelhoriaRoi[]>();
  for (const m of melhorias) {
    if (!melhoriaEstaImplementada(m)) continue;
    const area = m.process_area?.trim() || 'Sem área';
    const cur = por.get(area) ?? [];
    cur.push(m);
    por.set(area, cur);
  }
  return [...por.entries()]
    .map(([area, rows]) => {
      const horas = rows.map((r) => r.time_saved_hours).filter((v): v is number => v != null);
      const custos = rows.map((r) => r.cost_saved_monthly).filter((v): v is number => v != null);
      const horasLiberadas = horas.length === 0 ? null : horas.reduce((a, b) => a + b, 0);
      return {
        area,
        ferramentas: new Set(rows.map(chaveFerramenta)).size,
        horasLiberadas,
        fte: fteDeHoras(horasLiberadas).fte,
        economiaMensal: custos.length === 0 ? null : custos.reduce((a, b) => a + b, 0),
      };
    })
    .sort((a, b) => (b.fte ?? -Infinity) - (a.fte ?? -Infinity));
}

export { HORAS_MES_FTE };
