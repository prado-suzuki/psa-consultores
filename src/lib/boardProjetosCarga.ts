/**
 * Carga dos projetos: horas, gente e valor contratado.
 * Custo interno por cargo fica — — `profiles` não tem job_role; o papel
 * em `org_project_members` é member/leader/responsible, não a tabela de hora.
 */
import type { ProjetoRow } from '@/lib/dashboardClientesOs/types';

export interface MembroProjeto {
  project_id: string;
  user_id: string;
  role: string;
}

export interface CargaProjeto {
  projeto_id: string;
  projeto_nome: string;
  cliente_nome: string | null;
  area_nome: string | null;
  status: string | null;
  pessoas: number;
  lideres: number;
  responsaveis: number;
  membros: number;
  horasEstimadas: number;
  horasRealizadas: number;
  horasPorPessoa: number | null;
  valor: number;
}

export interface AbsorcaoFerramentas {
  horasLiberadasMes: number | null;
  medianaHorasProjeto: number | null;
  projetosAbsorviveis: number | null;
  projetosComHora: number;
}

const ATIVO = /active|em_andamento|andamento|planned/i;

export function projetoAtivo(p: Pick<ProjetoRow, 'status_projeto'>): boolean {
  const s = (p.status_projeto ?? '').trim();
  if (!s) return true;
  if (/done|conclu|cancel|archiv/i.test(s)) return false;
  return ATIVO.test(s) || s.length > 0;
}

export function cargaDosProjetos(
  projetos: ProjetoRow[],
  membros: MembroProjeto[],
): CargaProjeto[] {
  const porProjeto = new Map<string, MembroProjeto[]>();
  for (const m of membros) {
    const cur = porProjeto.get(m.project_id) ?? [];
    cur.push(m);
    porProjeto.set(m.project_id, cur);
  }

  return projetos
    .map((p) => {
      const time = porProjeto.get(p.projeto_id) ?? [];
      const papeis = time.map((t) => t.role.toLowerCase());
      const pessoas = new Set(time.map((t) => t.user_id)).size;
      return {
        projeto_id: p.projeto_id,
        projeto_nome: p.projeto_nome,
        cliente_nome: p.cliente_nome,
        area_nome: p.area_nome,
        status: p.status_projeto,
        pessoas,
        lideres: papeis.filter((r) => r === 'leader').length,
        responsaveis: papeis.filter((r) => r === 'responsible').length,
        membros: papeis.filter((r) => r === 'member').length,
        horasEstimadas: p.horas_estimadas,
        horasRealizadas: p.horas_realizadas,
        horasPorPessoa: pessoas === 0 || p.horas_estimadas <= 0
          ? null
          : p.horas_estimadas / pessoas,
        valor: p.valor_os,
      };
    })
    .sort((a, b) => b.horasEstimadas - a.horasEstimadas || b.valor - a.valor);
}

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Quantos projetos a mais a hora liberada pelas ferramentas cobre.
 * Mediana das horas estimadas dos projetos com hora — não inventa ticket
 * de hora nem assume que a folha cai.
 */
export function absorcaoPorFerramentas(
  horasLiberadasMes: number | null,
  projetos: ProjetoRow[],
): AbsorcaoFerramentas {
  const comHora = projetos
    .filter((p) => projetoAtivo(p) && p.horas_estimadas > 0)
    .map((p) => p.horas_estimadas);
  const med = mediana(comHora);
  const absorviveis =
    horasLiberadasMes != null && med != null && med > 0
      ? horasLiberadasMes / med
      : null;
  return {
    horasLiberadasMes,
    medianaHorasProjeto: med,
    projetosAbsorviveis: absorviveis,
    projetosComHora: comHora.length,
  };
}
