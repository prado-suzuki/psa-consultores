// Veredito BINÁRIO de calculabilidade do ROI de um processo (cenário "Como era").
//
// Fonte ÚNICA da verdade usada pelo doutor (UI) e — a partir da Fase 6 — pelo
// motor (roiCalculator) para decidir se um processo entra no consolidado.
// NÃO há meio-termo: ou está completo (`ok: true`) ou quebra o ROI
// (`faltando.length > 0`) e é EXCLUÍDO do consolidado ("em mapeamento").
//
// INVARIANTE (inegociável): nada de fallback / valor inventado. Campo
// obrigatório ausente ⇒ não-calculável. Proibido assumir volume = 1, custo
// médio como substituto, ou emitir 0 para dado faltante. Quem decide a
// inclusão no dashboard é a completude — não há flag manual.
//
// Obrigatórios (bloqueiam): volume anual do processo; e, por etapa,
// responsável resolvível no cadastro, horas > 0 e volume por processo > 0.
// NÃO bloqueiam: erro/retrabalho zerados (0 é valor válido) e custo/hora 0 de
// um responsável CADASTRADO (recurso externo/cliente grátis — intencional).

import type { Processo, Etapa, Responsavel } from '../types';
import { execucoesAnuais } from './roiCalculator';

export interface VeredictoCalculavel {
  /** true só quando NENHUM campo obrigatório falta. */
  ok: boolean;
  /** Rótulos do que falta (vazio quando ok). */
  faltando: string[];
}

// Resolve um responsável de etapa contra o cadastro, por id (primário) ou nome.
// custo/hora 0 é VÁLIDO; o que invalida é não existir no cadastro (vínculo quebrado).
function resolveResponsavel(
  ref: { responsavelId?: string; nome?: string },
  responsaveis: Responsavel[],
): Responsavel | undefined {
  return responsaveis.find(r =>
    (ref.responsavelId != null && r.id === ref.responsavelId) ||
    (!!ref.nome && r.name === ref.nome),
  );
}

export function processoCalculavel(
  processo: Processo,
  etapas: Etapa[],
  responsaveis: Responsavel[],
): VeredictoCalculavel {
  const faltando: string[] = [];

  // 1. Volume anual do processo — multiplicador anual. Sem ele, todo o anual zera.
  if (!(execucoesAnuais(processo) > 0)) {
    faltando.push('Volume anual do processo');
  }

  // 2. Etapas do processo. Sem etapas não há custo de mão de obra a calcular.
  const etapasDoProc = etapas.filter(e => e.process_id === processo.id);
  if (etapasDoProc.length === 0) {
    faltando.push('Nenhuma etapa mapeada');
    return { ok: false, faltando };
  }

  for (const e of etapasDoProc) {
    const rotulo = `Etapa "${e.name}"`;
    const execs = e.executadoPor || [];

    if (execs.length === 0) {
      // 3. Responsável atribuído.
      faltando.push(`${rotulo}: sem responsável`);
    } else {
      // 3b. Vínculo de responsável quebrado (referenciado, mas fora do cadastro).
      for (const r of execs) {
        if (!resolveResponsavel(r, responsaveis)) {
          faltando.push(`${rotulo}: responsável "${r.nome || r.responsavelId}" não cadastrado`);
        }
      }
      // 4. Horas > 0 (custo de pessoas da etapa).
      const horas = execs.reduce((s, r) => s + (r.horas || 0), 0);
      if (!(horas > 0)) faltando.push(`${rotulo}: horas zeradas`);
    }

    // 5. Volume por processo > 0 — proibido assumir 1.
    if (!(e.volume_per_process != null && e.volume_per_process > 0)) {
      faltando.push(`${rotulo}: volume por processo`);
    }
  }

  return { ok: faltando.length === 0, faltando };
}
