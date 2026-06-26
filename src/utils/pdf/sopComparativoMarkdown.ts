// SOP Comparativo em Markdown — espelha o SopComparativoDocument (PDF):
// Sumário Executivo + dores + comparativo Era×Ficou etapa a etapa.
// Usa as MESMAS funções de cálculo e as MESMAS strings do PDF, então os valores
// batem com o documento.

import type {
  Processo, Projeto, Etapa, Sistema, Responsavel, Gargalo, Melhoria,
} from '@/types';
import type { RoiAgregado } from '@/utils/roiCalculator';
import type { DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import { extractKeywords } from '@/utils/keywordsExtractor';
import { PDF_STRINGS } from '@/utils/pdfStrings';
import {
  calcEtapa, generateHeadline, isEtapaEliminada,
  fmtMoney, fmtPercent, joinDocs, joinPeople, todayBR, pad2,
} from './helpers';
import { gargalosDoProcesso } from '../gargaloMelhorias';

export interface SopComparativoMarkdownInput {
  processo: Processo;
  etapas: Etapa[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  projeto: Projeto | null;
  roi: RoiAgregado;
  diagnostico: DiagnosticoRoi;
  horizonteMeses?: number;
}

const cell = (s: string): string => (s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim() || '—';
const num0 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const num1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function buildSopComparativoMarkdown(input: SopComparativoMarkdownInput): string {
  const {
    processo, etapas, sistemas, responsaveis, gargalos,
    projeto, roi, diagnostico, horizonteMeses: m = 24,
  } = input;
  const S = PDF_STRINGS.exec;

  const sisByKey = new Map<string, Sistema>();
  for (const s of sistemas) { sisByKey.set(s.id, s); sisByKey.set(s.nome, s); }
  const sisNome = (key: string): string => sisByKey.get(key)?.nome ?? key;

  const gargaloById = new Map(gargalos.map(g => [g.id, g]));
  const respById = new Map(responsaveis.map(r => [r.id, r]));
  const custoMedio = responsaveis.length
    ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length
    : 0;

  const gargalosDoProc = gargalosDoProcesso(gargalos, processo.id);

  const economiaH = roi.economiaMensal * m;
  const investment = roi.investimentoTotal;
  const resultadoLiquido = economiaH - investment;
  const roiPct = investment > 0 ? (economiaH / investment) * 100 : 0;
  const payback_months = roi.economiaMensal > 0 ? investment / roi.economiaMensal : 0;
  const horasLiberadasH = roi.horasLiberadas * (m / 12);
  const custoEraH = roi.custoAtualAno * (m / 12);
  const custoFicouH = roi.custoFuturoAno * (m / 12);
  const horasEraH = roi.horasAtualAno * (m / 12);
  const horasFicouH = roi.horasFuturoAno * (m / 12);
  const retrabEra = roi.taxaRetrabalhoAtual;
  const retrabFicou = roi.taxaRetrabalhoFuturo;
  const deltaRetrabPp = (retrabEra - retrabFicou) * 100;

  const headline = generateHeadline({ processoNome: processo.name, roiPct, payback_months });
  const tags = extractKeywords(projeto, processo, gargalosDoProc);
  const data = todayBR();
  const podeCalcular = diagnostico.podeCalcular;

  const recomendacao = resultadoLiquido > 0
    ? S.recomendacaoAprovar(fmtMoney(investment), `${num0(payback_months)} meses`, `${num0(roiPct)}%`, m, `${num0(horasLiberadasH)} horas`)
    : S.recomendacaoSemPayback(fmtMoney(investment), m);

  const out: string[] = [];

  // ── Sumário Executivo ──
  out.push(`# ${S.pageTitle} — ${processo.name}`);
  out.push('');
  const meta: string[] = [`${S.metaProcesso}: ${processo.name}`];
  if (projeto?.clusterName) meta.push(`${S.metaCluster}: ${projeto.clusterName}`);
  meta.push(`${S.metaData}: ${data}`);
  out.push(meta.join(' · '));
  out.push('');
  out.push(`> ${headline}`);
  out.push('');
  if (tags.length) { out.push(tags.map(t => `\`${t}\``).join(' ')); out.push(''); }

  if (!podeCalcular) {
    out.push(`> ⚠️ **${S.avisoIncompletoTitulo}** — ${S.avisoIncompletoMsg(diagnostico.itensFaltando ?? 0, diagnostico.itensIncompletos ?? 0)}`);
    out.push('');
  }

  // KPIs
  out.push('## Indicadores');
  out.push('');
  out.push('| Indicador | Valor |');
  out.push('| --- | --- |');
  out.push(`| ${S.kpiEconomiaLabel(m)} | ${fmtMoney(economiaH)} |`);
  out.push(`| ${S.kpiRoiLabel(m)} | ${num0(roiPct)}% |`);
  out.push(`| ${S.kpiPaybackLabel} | ${payback_months > 0 ? `${num1(payback_months)} m` : '—'} |`);
  out.push(`| ${S.kpiHorasLabel(m)} | ${num0(horasLiberadasH)} |`);
  out.push(`| ${S.kpiInvestLabel} | ${fmtMoney(investment)} |`);
  out.push(`| ${S.kpiResultadoLabel(m)} | ${fmtMoney(resultadoLiquido)} |`);
  out.push('');

  // O que muda
  out.push(`## ${S.tabelaTitulo}`);
  out.push('');
  out.push(`| ${S.tabelaCol[0]} | ${S.tabelaCol[1]} | ${S.tabelaCol[2]} | ${S.tabelaCol[3]} |`);
  out.push('| --- | --- | --- | --- |');
  out.push(`| ${S.tabelaIndicadorCusto(m)} | ${fmtMoney(custoEraH)} | ${fmtMoney(custoFicouH)} | ${fmtMoney(custoEraH - custoFicouH)} |`);
  out.push(`| ${S.tabelaIndicadorHoras(m)} | ${num0(horasEraH)} | ${num0(horasFicouH)} | ${num0(horasEraH - horasFicouH)} |`);
  out.push(`| ${S.tabelaIndicadorRetrabalho} | ${fmtPercent(retrabEra)} | ${fmtPercent(retrabFicou)} | ${deltaRetrabPp > 0 ? `-${num1(deltaRetrabPp)} pp` : '—'} |`);
  out.push('');

  // Dores
  if (gargalosDoProc.length) {
    out.push(`## ${S.doresTitulo}`);
    out.push('');
    for (const g of gargalosDoProc) {
      const etapasNomes = [...new Set((g.etapasOrigem || []).map(r => r.etapaNome).filter((n): n is string => Boolean(n)))];
      out.push(`- **${g.nome}**${g.descricao ? ` — ${g.descricao}` : ''}${etapasNomes.length ? ` _(Etapa(s): ${etapasNomes.join(' · ')})_` : ''}${g.origem ? ` _(Origem: ${g.origem})_` : ''}`);
    }
    out.push('');
  }

  // Recomendação
  out.push(`## ${S.recomendacaoLabel}`);
  out.push('');
  out.push(recomendacao);
  out.push('');

  // ── Comparativo etapa a etapa ──
  out.push('## Detalhamento — Como era × Como ficou');
  out.push('');
  etapas.forEach((e, i) => {
    const era = calcEtapa(e, false, respById, custoMedio);
    const fic = calcEtapa(e, true, respById, custoMedio);
    const eliminada = isEtapaEliminada(e);
    const f = e.ficou;
    const gargalosDaEtapa = (e.gargalos || []).map(id => gargaloById.get(id)).filter((g): g is Gargalo => Boolean(g));

    out.push(`### Etapa ${pad2(i + 1)}/${pad2(etapas.length)} · ${e.name}`);
    out.push('');
    out.push('| Campo | Como era (As-Is) | Como ficou (To-Be) |');
    out.push('| --- | --- | --- |');
    if (eliminada) {
      out.push(`| Status | — | **Etapa eliminada** |`);
    }
    out.push(`| Descrição | ${cell(e.description || '')} | ${cell(eliminada ? '—' : (f?.description ?? e.description ?? ''))} |`);
    out.push(`| Execução | ${cell(e.execution || '')} | ${cell(eliminada ? '—' : (f?.execution ?? e.execution ?? ''))} |`);
    out.push(`| Executado por | ${cell(joinPeople(e.executadoPor ?? []))} | ${cell(eliminada ? '—' : joinPeople(f?.executadoPor ?? e.executadoPor ?? []))} |`);
    out.push(`| Sistemas | ${cell((e.sistemas ?? []).map(sisNome).join(' · '))} | ${cell(eliminada ? '—' : (f?.sistemas ?? e.sistemas ?? []).map(sisNome).join(' · '))} |`);
    out.push(`| Docs entrada | ${cell(joinDocs(e.docsEntrada ?? []))} | ${cell(eliminada ? '—' : joinDocs(f?.docsEntrada ?? e.docsEntrada ?? []))} |`);
    out.push(`| Docs saída | ${cell(joinDocs(e.docsSaida ?? []))} | ${cell(eliminada ? '—' : joinDocs(f?.docsSaida ?? e.docsSaida ?? []))} |`);
    out.push(`| Métricas | ${num1(era.horas)}h · ${fmtMoney(era.custo)} · retrab ${fmtPercent(era.taxaRetrab)} | ${eliminada ? '—' : `${num1(fic.horas)}h · ${fmtMoney(fic.custo)} · retrab ${fmtPercent(fic.taxaRetrab)}`} |`);
    out.push('');

    if (gargalosDaEtapa.length) {
      out.push('**Gargalos desta etapa**');
      out.push('');
      for (const g of gargalosDaEtapa) out.push(`- ${g.nome}${g.descricao ? ` — ${g.descricao}` : ''}`);
      out.push('');
    }

    const ganhoHoras = era.horas - fic.horas;
    const ganhoCusto = era.custo - fic.custo;
    const ganhoRetrab = (era.taxaRetrab - fic.taxaRetrab) * 100;
    out.push(`**Ganho desta etapa:** horas ${ganhoHoras > 0 ? `-${num1(ganhoHoras)}h` : '—'} · custo ${ganhoCusto > 0 ? fmtMoney(ganhoCusto) : '—'} · retrabalho ${ganhoRetrab > 0 ? `-${num1(ganhoRetrab)} pp` : '—'}`);
    out.push('');
  });

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
