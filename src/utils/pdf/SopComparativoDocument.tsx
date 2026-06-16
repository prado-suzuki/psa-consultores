// SOP Comparativo — Sumário Executivo + Páginas Era×Ficou (paisagem).
// Substitui sopComparativoGenerator.ts (html2canvas + jsPDF) por React-PDF.
//
// Estrutura:
//   Página 1 (A4 retrato)   — Sumário Executivo (headline + KPIs + tabela + dores + recomendação)
//   Página 2 (A4 paisagem)  — Dores identificadas (cards 2 colunas)
//   Páginas 3+ (A4 paisagem) — Uma por etapa, comparativo Era × Ficou + Ganho

import { Document, Page, Text, View } from '@react-pdf/renderer';
import type {
  Processo, Projeto, Etapa, Sistema, Responsavel, Gargalo, Melhoria,
} from '@/types';
import type { RoiAgregado } from '@/utils/roiCalculator';
import type { DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import { extractKeywords } from '@/utils/keywordsExtractor';
import { PDF_STRINGS } from '@/utils/pdfStrings';
import { styles, PDF_COLORS, PDF_FONT_SIZE } from './theme';
import {
  calcEtapa, generateHeadline, isEtapaEliminada,
  fmtMoney, fmtPercent, joinDocs, joinPeople, todayBR, pad2,
} from './helpers';
import { gargalosDoProcesso as filtraGargalosDoProcesso, melhoriaIdsDoProcesso } from '../gargaloMelhorias';

export interface SopComparativoDocumentProps {
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

// ────────── helpers locais ──────────

function PageHeader({ processo, scenarioLabel }: { processo: Processo; scenarioLabel: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View>
        <Text style={styles.pageHeaderTitle}>{processo.name}</Text>
        <Text style={styles.pageHeaderSub}>{scenarioLabel}</Text>
      </View>
      <Text style={styles.pageHeaderSub}>PSA Consultores · MAPA</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>PSA Consultores</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

// ────────── documento principal ──────────

export function SopComparativoDocument(props: SopComparativoDocumentProps) {
  const {
    processo, etapas, sistemas, responsaveis, gargalos, melhorias,
    projeto, roi, diagnostico, horizonteMeses: m = 24,
  } = props;
  const S = PDF_STRINGS.exec;

  const sisByKey = new Map<string, Sistema>();
  for (const s of sistemas) {
    sisByKey.set(s.id, s);
    sisByKey.set(s.nome, s);
  }
  const sisNome = (key: string): string => sisByKey.get(key)?.nome ?? key;

  const gargaloById = new Map(gargalos.map(g => [g.id, g]));
  const respById = new Map(responsaveis.map(r => [r.id, r]));
  const custoMedio = responsaveis.length
    ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length
    : 0;

  // Derivado via gargalo_etapas / gargalo_melhorias (melhoria_processos e
  // gargalo_processos foram aposentados).
  const gargalosDoProc = filtraGargalosDoProcesso(gargalos, processo.id);
  const melhoriaIdsProc = melhoriaIdsDoProcesso(gargalos, processo.id);
  const melhoriasDoProc = melhorias.filter(m => melhoriaIdsProc.has(m.id));

  // ── Métricas derivadas do horizonte (mesmo padrão do Dashboard ROI) ──
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

  // Recomendação
  const recomendacao = resultadoLiquido > 0
    ? S.recomendacaoAprovar(
        fmtMoney(investment),
        `${payback_months.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} meses`,
        `${roiPct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`,
        m,
        `${horasLiberadasH.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} horas`,
      )
    : S.recomendacaoSemPayback(fmtMoney(investment), m);

  return (
    <Document title={`SOP Comparativo - ${processo.name}`} author="PSA Consultores">
      {/* ============ PÁGINA 1 — SUMÁRIO EXECUTIVO (RETRATO) ============ */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageHeaderTitle}>{S.pageTitle}</Text>
            <Text style={styles.pageHeaderSub}>
              {S.metaProcesso}: {processo.name}
              {!!projeto?.clusterName && `${S.metaSeparator}${S.metaCluster}: ${projeto.clusterName}`}
              {S.metaSeparator}{S.metaData}: {data}
            </Text>
          </View>
          <Text style={styles.pageHeaderSub}>PSA Consultores · MAPA</Text>
        </View>

        {/* Headline */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: PDF_FONT_SIZE.h1, fontFamily: 'Helvetica-Bold', color: PDF_COLORS.primary, lineHeight: 1.25 }}>
            {headline}
          </Text>
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            {tags.map(t => (
              <Text key={t} style={styles.chipAccent}>{t}</Text>
            ))}
          </View>
        )}

        {!podeCalcular && (
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.warning, marginBottom: 12 }]}>
            <Text style={[styles.bold, { color: PDF_COLORS.warning, marginBottom: 2 }]}>
              {S.avisoIncompletoTitulo}
            </Text>
            <Text style={styles.small}>
              {S.avisoIncompletoMsg(diagnostico.itensFaltando ?? 0, diagnostico.itensIncompletos ?? 0)}
            </Text>
          </View>
        )}

        {/* KPIs (3x2) */}
        <View style={styles.kpiGrid}>
          <Kpi
            label={S.kpiEconomiaLabel(m)}
            value={fmtMoney(economiaH)}
            sub={S.kpiEconomiaSub}
          />
          <Kpi
            label={S.kpiRoiLabel(m)}
            value={`${roiPct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`}
            sub={S.kpiRoiSub(m)}
          />
          <Kpi
            label={S.kpiPaybackLabel}
            value={payback_months > 0
              ? `${payback_months.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`
              : '—'}
            sub={S.kpiPaybackSub}
          />
          <Kpi
            label={S.kpiHorasLabel(m)}
            value={horasLiberadasH.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            sub={S.kpiHorasSub}
          />
          <Kpi
            label={S.kpiInvestLabel}
            value={fmtMoney(investment)}
            sub={S.kpiInvestSub}
          />
          <Kpi
            label={S.kpiResultadoLabel(m)}
            value={fmtMoney(resultadoLiquido)}
            sub={S.kpiResultadoSub}
          />
        </View>

        {/* Tabela "O que muda" */}
        <View style={styles.section}>
          <Text style={[styles.bold, { fontSize: PDF_FONT_SIZE.md, color: PDF_COLORS.primary, marginBottom: 4 }]}>
            {S.tabelaTitulo}
          </Text>
          <View style={styles.table}>
            <View style={styles.trHeader}>
              <Text style={[styles.th, { flex: 2 }]}>{S.tabelaCol[0]}</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>{S.tabelaCol[1]}</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>{S.tabelaCol[2]}</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>{S.tabelaCol[3]}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{S.tabelaIndicadorCusto(m)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{fmtMoney(custoEraH)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{fmtMoney(custoFicouH)}</Text>
              <Text style={[styles.td, styles.ok, { flex: 1, textAlign: 'right' }]}>{fmtMoney(custoEraH - custoFicouH)}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{S.tabelaIndicadorHoras(m)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{horasEraH.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{horasFicouH.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
              <Text style={[styles.td, styles.ok, { flex: 1, textAlign: 'right' }]}>{(horasEraH - horasFicouH).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, { flex: 2 }]}>{S.tabelaIndicadorRetrabalho}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{fmtPercent(retrabEra)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{fmtPercent(retrabFicou)}</Text>
              <Text style={[styles.td, styles.ok, { flex: 1, textAlign: 'right' }]}>
                {deltaRetrabPp > 0 ? `-${deltaRetrabPp.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pp` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Dores eliminadas (resumo) */}
        {gargalosDoProc.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={[styles.bold, { fontSize: PDF_FONT_SIZE.md, color: PDF_COLORS.primary, marginBottom: 4 }]}>
              {S.doresTitulo}
            </Text>
            {gargalosDoProc.slice(0, 6).map(g => (
              <View key={g.id} style={[styles.row, { marginBottom: 3 }]}>
                <Text style={{ fontSize: PDF_FONT_SIZE.sm, color: PDF_COLORS.accent, marginRight: 4 }}>•</Text>
                <Text style={[styles.small, { flex: 1 }]}>{g.nome}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recomendação */}
        <View style={[styles.card, { backgroundColor: PDF_COLORS.bgSubtle, borderColor: PDF_COLORS.accent, borderLeftWidth: 3 }]} wrap={false}>
          <Text style={{ fontSize: PDF_FONT_SIZE.xs, fontFamily: 'Helvetica-Bold', color: PDF_COLORS.accent, letterSpacing: 1, marginBottom: 3 }}>
            {S.recomendacaoLabel}
          </Text>
          <Text style={[styles.small, { lineHeight: 1.5 }]}>{recomendacao}</Text>
        </View>

        <Text style={[styles.small, styles.muted, { marginTop: 10, textAlign: 'center' }]}>
          {S.rodapeAnexo}
        </Text>

        <PageFooter />
      </Page>

      {/* ============ PÁGINA 2 — DORES IDENTIFICADAS (PAISAGEM) ============ */}
      {gargalosDoProc.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <PageHeader processo={processo} scenarioLabel={PDF_STRINGS.anexo.doresPageTitle} />
          <Text style={[styles.small, styles.muted, { marginBottom: 8 }]}>
            {PDF_STRINGS.anexo.doresPageIntro}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {gargalosDoProc.map(g => {
              const etapasNomes = [...new Set((g.etapasOrigem || []).map(r => r.etapaNome).filter((n): n is string => Boolean(n)))];
              return (
                <View key={g.id} style={[styles.card, { width: '48%' }]} wrap={false}>
                  <Text style={styles.cardTitle}>{g.nome}</Text>
                  {!!g.descricao && <Text style={[styles.small, { marginBottom: 3 }]}>{g.descricao}</Text>}
                  {etapasNomes.length > 0 && (
                    <Text style={[styles.small, styles.muted]}>Etapa(s): {etapasNomes.join(' · ')}</Text>
                  )}
                  {!!g.origem && (
                    <Text style={[styles.small, styles.muted]}>Origem: {g.origem}</Text>
                  )}
                </View>
              );
            })}
          </View>
          <PageFooter />
        </Page>
      )}

      {/* ============ PÁGINAS POR ETAPA — COMPARATIVO (PAISAGEM) ============ */}
      {etapas.map((e, i) => {
        const era = calcEtapa(e, false, respById, custoMedio);
        const fic = calcEtapa(e, true, respById, custoMedio);
        const eliminada = isEtapaEliminada(e);
        const f = e.ficou;

        const eraExec = e.executadoPor ?? [];
        const ficExec = f?.executadoPor ?? e.executadoPor ?? [];
        const eraSis = e.sistemas ?? [];
        const ficSis = f?.sistemas ?? e.sistemas ?? [];
        const eraDocsE = e.docsEntrada ?? [];
        const ficDocsE = f?.docsEntrada ?? e.docsEntrada ?? [];
        const eraDocsS = e.docsSaida ?? [];
        const ficDocsS = f?.docsSaida ?? e.docsSaida ?? [];
        // Gargalos pertencem à etapa (AS-IS) — aparecem na coluna "Como era".
        const gargalosDaEtapa = (e.gargalos || []).map(id => gargaloById.get(id)).filter((g): g is Gargalo => Boolean(g));

        const ganhoHoras = era.horas - fic.horas;
        const ganhoCusto = era.custo - fic.custo;
        const ganhoRetrab = (era.taxaRetrab - fic.taxaRetrab) * 100;

        return (
          <Page key={e.id} size="A4" orientation="landscape" style={styles.page}>
            <PageHeader
              processo={processo}
              scenarioLabel={`Etapa ${pad2(i + 1)}/${pad2(etapas.length)} · ${e.name}`}
            />

            <View style={styles.cmpRow}>
              {/* COLUNA "ERA" */}
              <View style={styles.cmpColEra}>
                <Text style={[styles.cmpHeader, { color: PDF_COLORS.textMuted }]}>
                  Como era · As-Is
                </Text>
                {!!e.description && (
                  <Text style={[styles.small, { marginBottom: 4 }]}>{e.description}</Text>
                )}
                <Text style={[styles.small, styles.muted]}>Execução</Text>
                <Text style={[styles.small, { marginBottom: 3 }]}>{e.execution || '—'}</Text>
                <Text style={[styles.small, styles.muted]}>Executado por</Text>
                <Text style={[styles.small, { marginBottom: 3 }]}>{joinPeople(eraExec)}</Text>
                <Text style={[styles.small, styles.muted]}>Sistemas</Text>
                <Text style={[styles.small, { marginBottom: 3 }]}>
                  {eraSis.map(sisNome).join(' · ') || '—'}
                </Text>
                <Text style={[styles.small, styles.muted]}>Documentos · Entrada</Text>
                <Text style={[styles.small, { marginBottom: 3 }]}>{joinDocs(eraDocsE)}</Text>
                <Text style={[styles.small, styles.muted]}>Documentos · Saída</Text>
                <Text style={[styles.small, { marginBottom: 3 }]}>{joinDocs(eraDocsS)}</Text>
                <Text style={[styles.small, styles.muted]}>Métricas</Text>
                <Text style={styles.small}>
                  {era.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h · {fmtMoney(era.custo)} · retrab {fmtPercent(era.taxaRetrab)}
                </Text>
                {gargalosDaEtapa.length > 0 && (
                  <>
                    <Text style={[styles.small, styles.muted, { marginTop: 3 }]}>Gargalos desta etapa</Text>
                    {gargalosDaEtapa.map(g => (
                      <Text key={g.id} style={styles.small}>• {g.nome}{g.descricao ? ` — ${g.descricao}` : ''}</Text>
                    ))}
                  </>
                )}
              </View>

              {/* COLUNA "FICOU" */}
              <View style={styles.cmpColFicou}>
                <Text style={[styles.cmpHeader, { color: PDF_COLORS.accent }]}>
                  Como ficou · To-Be
                </Text>
                {eliminada ? (
                  <View style={[styles.card, { borderColor: PDF_COLORS.warning, borderLeftWidth: 3 }]}>
                    <Text style={[styles.bold, { color: PDF_COLORS.warning }]}>Etapa eliminada</Text>
                    <Text style={[styles.small, styles.muted, { marginTop: 2 }]}>
                      No cenário projetado, esta etapa deixa de existir.
                    </Text>
                  </View>
                ) : (
                  <>
                    {!!(f?.description ?? e.description) && (
                      <Text style={[styles.small, { marginBottom: 4 }]}>{f?.description ?? e.description}</Text>
                    )}
                    <Text style={[styles.small, styles.muted]}>Execução</Text>
                    <Text style={[styles.small, { marginBottom: 3 }]}>{f?.execution ?? e.execution ?? '—'}</Text>
                    <Text style={[styles.small, styles.muted]}>Executado por</Text>
                    <Text style={[styles.small, { marginBottom: 3 }]}>{joinPeople(ficExec)}</Text>
                    <Text style={[styles.small, styles.muted]}>Sistemas</Text>
                    <Text style={[styles.small, { marginBottom: 3 }]}>
                      {ficSis.map(sisNome).join(' · ') || '—'}
                    </Text>
                    <Text style={[styles.small, styles.muted]}>Documentos · Entrada</Text>
                    <Text style={[styles.small, { marginBottom: 3 }]}>{joinDocs(ficDocsE)}</Text>
                    <Text style={[styles.small, styles.muted]}>Documentos · Saída</Text>
                    <Text style={[styles.small, { marginBottom: 3 }]}>{joinDocs(ficDocsS)}</Text>
                    <Text style={[styles.small, styles.muted]}>Métricas</Text>
                    <Text style={styles.small}>
                      {fic.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h · {fmtMoney(fic.custo)} · retrab {fmtPercent(fic.taxaRetrab)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* GANHO DESTA ETAPA */}
            <View style={[styles.card, { marginTop: 10, borderColor: PDF_COLORS.accent, borderLeftWidth: 3 }]}>
              <Text style={[styles.cmpHeader, { color: PDF_COLORS.accent }]}>Ganho desta etapa</Text>
              <View style={[styles.row, { gap: 16 }]}>
                <View style={styles.flex1}>
                  <Text style={[styles.small, styles.muted]}>Horas economizadas</Text>
                  <Text style={[styles.bold, ganhoHoras > 0 ? styles.ok : styles.muted]}>
                    {ganhoHoras > 0 ? `-${ganhoHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h` : '—'}
                  </Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.small, styles.muted]}>Custo economizado</Text>
                  <Text style={[styles.bold, ganhoCusto > 0 ? styles.ok : styles.muted]}>
                    {ganhoCusto > 0 ? fmtMoney(ganhoCusto) : '—'}
                  </Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.small, styles.muted]}>Retrabalho</Text>
                  <Text style={[styles.bold, ganhoRetrab > 0 ? styles.ok : styles.muted]}>
                    {ganhoRetrab > 0 ? `-${ganhoRetrab.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} pp` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <PageFooter />
          </Page>
        );
      })}
    </Document>
  );
}
